import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function toAbsoluteUrl(url: string, base: string): string {
  if (!url || url.startsWith("data:")) return "";
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = new URL(base);
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ดึง URL รูปจาก JSON ในหน้า (product.images, gallery ฯลฯ) */
function extractImageUrlsFromJson(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (u: string) => {
    const t = u.trim();
    if (!t || !t.startsWith("http") || seen.has(t)) return;
    if (/\b(qr|barcode|qrcode|promptpay|linepay|payment)\b/i.test(t)) return;
    seen.add(t);
    urls.push(t);
  };
  const jsonMatches = html.matchAll(/"image[s]?"\s*:\s*\[([^\]]+)\]/gi);
  for (const m of jsonMatches) {
    m[1].split(",").forEach((part) => {
      const urlMatch = part.match(/["'](https?:\/\/[^"']+)["']/);
      if (urlMatch) add(urlMatch[1]);
    });
  }
  const urlMatches = html.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp|gif)[^"]*)"/gi);
  for (const m of urlMatches) add(m[1]);
  return urls;
}

/** ดึงข้อมูลจาก __NUXT_DATA__ หรือ JSON ใน script (LnwShop, Nuxt) */
function extractFromNuxtData(html: string): string {
  const out: string[] = [];
  const nuxtMatch = html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nuxtMatch) {
    try {
      let raw = nuxtMatch[1].trim();
      if (raw.startsWith("%")) raw = decodeURIComponent(raw);
      const parsed = JSON.parse(raw);
      const str = typeof parsed === "object" ? JSON.stringify(parsed) : String(parsed);
      if (str.length < 50000) out.push(`[__NUXT_DATA__]: ${str.slice(0, 15000)}`);
    } catch {
      /* Nuxt compressed format - skip */
    }
  }
  const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    jsonLdMatch.forEach((s) => {
      const m = s.match(/>([\s\S]*?)<\/script>/i);
      if (m) {
        try {
          const j = JSON.parse(m[1]);
          if (j["@type"] === "Product" || j.name) out.push(`[JSON-LD Product]: ${JSON.stringify(j).slice(0, 5000)}`);
        } catch {
          /* ignore */
        }
      }
    });
  }
  return out.join("\n\n");
}

/** ดึงค่าจากแถวตาราง LnwShop ตาม label (คืนค่า HTML ของ cell) - รองรับ 2 หรือ 3 คอลัมน์ */
function extractTableRowByLabel(html: string, labelPattern: RegExp): string[] {
  const values: string[] = [];
  const tableRegex = /<tr[^>]*>[\s\S]*?<t[hd][^>]*>([^<]*)<\/t[hd]>[\s\S]*?<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?(?:<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?)?<\/tr>/gi;
  let m;
  while ((m = tableRegex.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    if (labelPattern.test(label)) {
      values.push((m[3] && m[3].trim().length > 20) ? m[3] : m[2]);
    }
  }
  return values;
}

/** ดึงตารางคุณสมบัติ/รายละเอียด (LnwShop style) */
function extractLnwShopProductTable(html: string): string {
  const rows: string[] = [];
  const tableRegex = /<tr[^>]*>[\s\S]*?<t[hd][^>]*>([^<]*)<\/t[hd]>[\s\S]*?<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?<\/tr>/gi;
  let m;
  while ((m = tableRegex.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    const value = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (label && value && value.length < 2000) rows.push(`- ${label}: ${value}`);
  }
  const dlRegex = /<dt[^>]*>([^<]*)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi;
  while ((m = dlRegex.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    const value = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (label && value && value.length < 2000) rows.push(`- ${label}: ${value}`);
  }
  return rows.length > 0 ? `[ตารางคุณสมบัติ]\n${rows.join("\n")}` : "";
}

/** ดึงค่าจากบล็อก ข้อมูลสินค้า (น้ำหนัก, ลงสินค้า, อัพเดทล่าสุด, คุณสมบัติ) */
function extractProductInfoValues(html: string): string {
  const info: string[] = [];
  const patterns = [
    /น้ำหนัก[:\s]*([^\n<]+)/i,
    /ลงสินค้า[:\s]*([^\n<]+)/i,
    /อัพเดทล่าสุด[:\s]*([^\n<]+)/i,
    /(?:คุณสมบัติสินค้า|คุณสมบัติ|Product Features)[:\s]*([\s\S]*?)(?=ข้อมูลสินค้า|รายละเอียด|คำอธิบาย|<\/div>|$)/i,
    /รายละเอียดสินค้า[:\s]*([\s\S]*?)(?=ข้อมูลสินค้า|คำอธิบาย|<\/div>|$)/i,
  ];
  const seen = new Set<string>();
  patterns.forEach((re) => {
    const m = html.match(re);
    if (m && m[1]) {
      const v = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
      if (v.length > 10 && !seen.has(v.slice(0, 50))) {
        seen.add(v.slice(0, 50));
        info.push(v);
      }
    }
  });
  return info.length > 0 ? `[ข้อมูลเพิ่มเติม]\n${info.join("\n")}` : "";
}

/** ลบ template variables และข้อความที่ไม่ใช่เนื้อหาสินค้าออกจาก description */
function sanitizeDescriptionText(text: string): string {
  return text
    .replace(/\{\{[^}]*\}\}[^%\s]*/g, "") // {{flash_sale_discount_percent}}% etc
    .replace(/\s*ไม่มีตัวเลือก\s*[-–]?\s*/gi, "")
    .replace(/&nbsp;/gi, " ") // LnwShop ใช้ &nbsp; ในตาราง
    .replace(/\s+/g, " ")
    .trim();
}

/** ปรับข้อความให้เหมือนกันสำหรับ dedup (รวมช่องว่าง) */
function normalizeForDedup(t: string): string {
  return t.replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

/** ตรวจว่าเป็น bullet ที่เป็นเนื้อหาสินค้าจริง (ไม่ใช่ template/UI/code) */
function isValidProductBullet(text: string): boolean {
  if (!text || text.length < 5 || text.length > 400) return false;
  if (/\{\{|\}\}/.test(text)) return false; // template variable
  if (/^ไม่มีตัวเลือก\s*[-–]?$/i.test(text)) return false;
  if (/^\d+%?\s*$/.test(text)) return false; // แค่ตัวเลข %
  if (/\)\s*\)\s*;|\)\s*;\s*\)|}\s*\)\s*\)/.test(text)) return false; // code debris เช่น 1); })) {
  if (/^(สต๊อกสินค้า|ระยะเวลาการจัดส่ง|วิธีการสั่งซื้อสินค้า|ชำระเงิน|แจ้งปัญหา|กรุณาเลือก)\s*[-–]?\s*$/i.test(text)) return false;
  // ข้าม raw table cell ที่ยังไม่ parse (คุณสมบัติ - x - y - z - ...)
  if (/^คุณสมบัติ\s*[-–−]\s+/.test(text) && (text.match(/\s+[-–−]\s+/g)?.length ?? 0) >= 3) return false;
  return true;
}

/** ดึง bullets จาก __NUXT_DATA__ หรือ JSON (LnwShop) - เฉพาะ path ที่เกี่ยวข้องกับ product */
function extractBulletsFromNuxtData(html: string): string[] {
  const bullets: string[] = [];
  const nuxtMatch = html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!nuxtMatch) return bullets;
  try {
    let raw = nuxtMatch[1].trim();
    if (raw.startsWith("%")) raw = decodeURIComponent(raw);
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const productKeys = ["highlights", "features", "คุณสมบัติ", "ไฮไลท์", "description", "รายละเอียด", "specifications", "product"];
    const extractFrom = (obj: unknown): void => {
      if (!obj) return;
      if (Array.isArray(obj)) {
        obj.forEach((item) => {
          if (typeof item === "string" && item.length > 5 && item.length < 350) {
            const t = sanitizeDescriptionText(item);
            if (isValidProductBullet(t)) bullets.push(t);
          } else if (typeof item === "object") extractFrom(item);
        });
        return;
      }
      if (typeof obj === "object") {
        const keys = Object.keys(obj).filter((k) => productKeys.some((pk) => k.toLowerCase().includes(pk.toLowerCase())));
        keys.forEach((k) => extractFrom((obj as Record<string, unknown>)[k]));
      }
    };
    extractFrom(parsed);
    if (parsed.product) extractFrom((parsed.product as Record<string, unknown>).highlights ?? (parsed.product as Record<string, unknown>).features);
  } catch {
    /* ignore */
  }
  return bullets;
}

/** ลบ prefix ที่พัง (คุณสมบัติ - , เลขข้อ ฯลฯ) */
function normalizeBulletText(t: string): string {
  return t
    .replace(/^คุณสมบัติ\s*[-–−]\s*/i, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[-–−•]\s*/, "")
    .trim();
}

/** แยก bullets จาก HTML string - รองรับ LnwShop: <div>-text</div>, <li>, \-item */
function parseBulletsFromHtml(html: string): string[] {
  const strip = (s: string) => sanitizeDescriptionText(s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
  const add = (t: string, out: string[]): void => {
    const normalized = normalizeBulletText(strip(t));
    if (normalized && isValidProductBullet(normalized) && !/^คุณสมบัติ$/i.test(normalized) && !out.includes(normalized)) out.push(normalized);
  };

  const items: string[] = [];

  // 1. LnwShop: <div>-text</div> (รวม nested เช่น <div><span>-text</span></div>)
  for (const m of html.matchAll(/<div[^>]*>\s*([-–−][^<]*?)<\/div>/gi)) {
    const text = m[1].replace(/<[^>]+>/g, "").trim();
    const bullet = strip(text.replace(/^[-–−]\s*/, ""));
    if (bullet) add(bullet, items);
  }
  if (items.length >= 5) return items;

  // 2. แยกด้วย \- (backslash-dash)
  const plain = html.replace(/<img[^>]*>/gi, " ").replace(/<[^>]+>/g, " ");
  const byBackslash = plain.split(/\s*\\-\s*/).map((p) => strip(p)).filter((t) => isValidProductBullet(t) && !/^คุณสมบัติ$/i.test(t));
  if (byBackslash.length > items.length) return byBackslash;

  // 3. แยกด้วย newline แล้ว - (แต่ละบรรทัดขึ้นต้นด้วย -)
  const byLines = html.split(/<br\s*\/?>|[\n]+/).map((l) => l.replace(/<[^>]+>/g, "").trim()).filter((l) => /^[-–−]\s+/.test(l));
  const byLineBullets = byLines.map((l) => strip(l.replace(/^[-–−]\s*/, ""))).filter((t) => isValidProductBullet(t));
  if (byLineBullets.length > items.length) return byLineBullets;

  // 4. แยกด้วย - (space-dash-space)
  const byDash = plain.split(/\s+-\s+/).map((p) => strip(p)).filter((t) => isValidProductBullet(t) && !/^คุณสมบัติ$/i.test(t));
  if (byDash.length > items.length) {
    items.length = 0;
    byDash.forEach((t) => add(t, items));
  }
  if (items.length >= 5) return items;

  // 5. จาก <li>
  for (const m of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    add(strip(m[1]), items);
  }
  if (items.length > 0) return items;

  // 6. รูปแบบ "- ข้อความ"
  for (const m of html.matchAll(/(?:^|>|\s)[-–−•]\s*([^<\n]{5,280})/gm)) {
    add(strip(m[1]), items);
  }
  return items;
}

/** สร้าง description HTML เต็มจากข้อมูลที่ extract ได้ (ไฮไลท์, ข้อมูล, รายละเอียด) - รองรับ LnwShop */
function buildFullDescriptionFromHtml(html: string): string {
  const parts: string[] = [];

  // 1. ดึง bullets จากหลายแหล่ง แต่ "เลือกแหล่งเดียว" ที่ดีที่สุด เพื่อรักษาลำดับตามหน้าเว็บ
  const candidateSources: string[][] = [];

  // 1a. ดึงจาก short_description_pane ก่อน (LnwShop - block นี้มักมี bullets หลักครบ)
  const paneIdx = html.indexOf("short_description_pane");
  if (paneIdx >= 0) {
    const paneChunk = html.slice(paneIdx, paneIdx + 3500);
    const paneBullets = parseBulletsFromHtml(paneChunk);
    if (paneBullets.length >= 2) candidateSources.push(paneBullets);
  }

  // 1b. จากตาราง LnwShop - ไฮไลท์, คุณสมบัติ, รายละเอียดสินค้า
  for (const labelPattern of [/ไฮไลท์/i, /คุณสมบัติ/i, /รายละเอียดสินค้า/i]) {
    for (const cellHtml of extractTableRowByLabel(html, labelPattern)) {
      const fromTable = parseBulletsFromHtml(cellHtml);
      if (fromTable.length >= 2) candidateSources.push(fromTable);
    }
  }

  // 1c. จาก __NUXT_DATA__
  const fromNuxt = extractBulletsFromNuxtData(html);
  if (fromNuxt.length >= 2) candidateSources.push(fromNuxt);

  // 1d. จาก <li> (ข้าม nav tabs และ label หน้า LnwShop)
  const navLabels = /^(รายละเอียดสินค้า|วิธีการสั่งซื้อ|สินค้าที่เกี่ยวข้อง|สต๊อกสินค้า|ระยะเวลาการจัดส่ง|วิธีการสั่งซื้อสินค้า|ชำระเงิน|แจ้งปัญหา|กรุณาเลือก)$/i;
  for (const m of html.matchAll(/<li[^>]*>([^<]+(?:<[^>]+>[^<]*)*?)<\/li>/gi)) {
    const raw = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!navLabels.test(raw)) {
      const v = sanitizeDescriptionText(raw);
      if (v.length >= 5) {
        // ยังไม่ dedup ที่นี่ เก็บเป็น candidate ก่อน
        candidateSources.push([v]);
      }
    }
  }

  // 1e. รูปแบบ "- ข้อความ"
  const dashBullets: string[] = [];
  for (const m of html.matchAll(/(?:^|>)\s*[-•]\s*([^<\n]{5,250})/gm)) {
    const v = sanitizeDescriptionText(m[1].replace(/\s+/g, " ").trim());
    if (v.length >= 5) dashBullets.push(v);
  }
  if (dashBullets.length >= 2) candidateSources.push(dashBullets);

  const ulBlock = html.match(/(?:ไฮไลท์|คุณสมบัติ)[\s\S]{0,100}?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (ulBlock?.[1]) {
    const fromUl = parseBulletsFromHtml(ulBlock[1]);
    if (fromUl.length >= 2) candidateSources.push(fromUl);
  }

  // 1f. ไฮไลท์บล็อคหลัก (ช่วงระหว่าง "ไฮไลท์" ถึง "ข้อมูล/รายละเอียดสินค้า")
  const highlightBlockMatch = html.match(/ไฮไลท์[\s\S]{0,800}?(?=ข้อมูล|รายละเอียดสินค้า|<\/table>|<\/div>|$)/i);
  let highlightIntro: string | null = null;
  if (highlightBlockMatch?.[0]) {
    const block = highlightBlockMatch[0];
    const lines = block
      .split(/<br\s*\/?>|\n+/i)
      .map((seg) => seg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    for (const line of lines) {
      if (/^[-•–]/.test(line)) continue;
      if (line.length < 15) continue;
      if (/^(ไฮไลท์|คุณสมบัติ)/i.test(line)) continue;
      highlightIntro = sanitizeDescriptionText(line);
      break;
    }
  }

  // เลือก source แรกที่มี bullet >= 2 แล้วค่อย dedup ตามลำดับเดิม
  let bullets: string[] = [];
  const seen = new Set<string>();
  for (const src of candidateSources) {
    for (const raw of src) {
      const normalized = normalizeForDedup(raw);
      const key = normalized.slice(0, 80);
      if (isValidProductBullet(normalized) && !seen.has(key)) {
        seen.add(key);
        bullets.push(normalized);
      }
    }
    if (bullets.length >= 2) break;
  }

  if (bullets.length > 0) {
    let htmlHighlights = "<p><strong>ไฮไลท์/คุณสมบัติ</strong></p>";
    if (highlightIntro) {
      htmlHighlights += `<p>${highlightIntro}</p>`;
    }
    htmlHighlights += "<ul>" + bullets.map((b) => `<li>${b}</li>`).join("") + "</ul>";
    parts.push(htmlHighlights);
  }

  // 2. ดึง ข้อมูล (น้ำหนัก, ลงสินค้า, อัพเดทล่าสุด) - รองรับ format "น้ำหนัก : 300 กรัม"
  let dataText = "";
  const dataCells = extractTableRowByLabel(html, /^ข้อมูล$/i);
  if (dataCells.length > 0) {
    const cellPlain = dataCells[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (cellPlain.length > 10) dataText = cellPlain.slice(0, 400);
  }
  if (!dataText || dataText.length < 15) {
    const dataBlock = html.match(/ข้อมูล[\s\S]{0,500}?(น้ำหนัก[\s\S]*?)(?=รายละเอียด|คุณสมบัติ|<\/t[hd]>|<\/div>|<\/tr>|$)/i);
    if (dataBlock?.[1]) {
      dataText = dataBlock[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    }
  }
  if (!dataText || dataText.length < 15) {
    const w = html.match(/น้ำหนัก\s*[:：]?\s*([^\n<]+?)(?:\s+ลงสินค้า|$)/i) ?? html.match(/น้ำหนัก\s*([^\n<]+)/i);
    const d = html.match(/ลงสินค้า\s*[:：]?\s*([^\n<]+?)(?:\s+อัพเดท|$)/i) ?? html.match(/ลงสินค้า\s*([^\n<]+)/i);
    const u = html.match(/อัพเดทล่าสุด\s*[:：]?\s*([^\n<]+)/i) ?? html.match(/อัพเดทล่าสุด\s*([^\n<]+)/i);
    dataText = [
      w ? `น้ำหนัก ${w[1].trim()}` : "",
      d ? `ลงสินค้า ${d[1].trim()}` : "",
      u ? `อัพเดทล่าสุด ${u[1].trim()}` : "",
    ].filter(Boolean).join(" ");
  }
  // LnwShop: ดึงจาก JSON ถ้า cell เป็นแค่ label (weight, created_at, updated_at อยู่ใน script)
  const looksLikeLabelsOnly = !dataText || !/\d|กรัม|kg|\d{4}/i.test(dataText);
  if (looksLikeLabelsOnly) {
    const dataFromJson: string[] = [];
    const weightMatch = html.match(/"weight"\s*:\s*(\d+(?:\.\d+)?)/);
    if (weightMatch) dataFromJson.push(`น้ำหนัก ${weightMatch[1]} กรัม`);
    const createdMatch = html.match(/"created_at"\s*:\s*"([^"]+)"/);
    if (createdMatch) dataFromJson.push(`ลงสินค้า ${createdMatch[1]}`);
    const updatedMatch = html.match(/"updated_at"\s*:\s*"([^"]+)"/);
    if (updatedMatch) dataFromJson.push(`อัพเดทล่าสุด ${updatedMatch[1]}`);
    if (dataFromJson.length > 0) dataText = dataFromJson.join(" ");
  }
  const hasActualValues = /\d|กรัม|kg|ก\.?ก\.?|ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?|\d{4}/i.test(dataText);
  if (dataText.length >= 10 && hasActualValues) {
    const cleanData = dataText.replace(/\s*บาร์โค้ด\s*/gi, " ").replace(/\s+/g, " ").trim();
    parts.push(`<p><strong>ข้อมูล</strong></p><p>${cleanData}</p>`);
  }

  // 3. รายละเอียดสินค้า - แสดงให้เหมือนต้นฉบับ (intro + bullets; ใช้ bullets เดียวกันถ้าไม่มีแยก)
  let detailBullets: string[] = [];
  const detailRows = extractTableRowByLabel(html, /รายละเอียดสินค้า/i);
  const detailBlock = html.match(
    /รายละเอียดสินค้า[\s\S]{0,300}?([\s\S]*?)(?=คุณสมบัติ|วิธีการสั่งซื้อ|สินค้าที่เกี่ยวข้อง|เงื่อนไข|<\/tr>|<\/table>|$)/i
  );
  for (const cellHtml of detailRows) {
    const items = parseBulletsFromHtml(cellHtml);
    if (items.length > detailBullets.length) detailBullets = items;
  }
  if (detailBlock?.[1] && detailBullets.length === 0) {
    detailBullets = parseBulletsFromHtml(detailBlock[1]);
  }
  if (detailBullets.length === 0 && bullets.length > 0) {
    detailBullets = bullets;
  }

  // พยายามดึง intro (ข้อความอธิบายยาว ๆ ก่อน bullets) จาก detailBlock ถ้ามี
  let detailIntro = "";
  if (detailBlock?.[1]) {
    const raw = detailBlock[1];
    const segments = raw
      .split(/<br\s*\/?>|\n+/i)
      .map((seg) => seg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const introLines: string[] = [];
    for (const line of segments) {
      // ข้ามบรรทัดที่เป็น bullet / ไอคอน / label สั้น ๆ
      if (/^[-–••]/.test(line)) continue;
      if (line.length < 15) continue;
      // ถ้าดูเหมือนหัวข้อ "คุณสมบัติ" หรือ "ไฮไลท์" ให้ข้าม
      if (/^(คุณสมบัติ|ไฮไลท์)/i.test(line)) continue;
      introLines.push(line);
    }
    if (introLines.length > 0) {
      detailIntro = introLines.join(" ");
    }
  }

  if (detailBullets.length > 0) {
    let htmlDetail = "<p><strong>รายละเอียดสินค้า</strong></p>";
    if (detailIntro) {
      htmlDetail += `<p>${sanitizeDescriptionText(detailIntro)}</p>`;
    }
    htmlDetail += "<ul>" + detailBullets.map((c) => `<li>${normalizeForDedup(c)}</li>`).join("") + "</ul>";
    parts.push(htmlDetail);
  }

  return parts.join("");
}

/** สร้าง description โครงสร้างตรงหน้าเว็บ (intro → คุณสมบัติ → วิธีการใช้งาน → การจัดส่ง) จาก textContent - ใช้กับ all-mate/LnwShop ที่มี 4 ส่วนนี้ */
function buildStructuredDescriptionFromText(text: string): string {
  const introM = "คุณกำลังจะซื้อ";
  const featM = "คุณสมบัติ";
  const usageM = "วิธีการใช้งาน";
  const shipM = "การจัดส่ง";
  const idxIntro = text.indexOf(introM);
  const idxFeat = text.indexOf(featM);
  const idxUsage = text.indexOf(usageM);
  // หา "การจัดส่ง" ที่อยู่หลัง วิธีการใช้งาน เท่านั้น (ไม่ใช้ตัวที่อยู่บน nav/เมนู)
  const idxShip = text.indexOf(shipM, idxUsage);
  if (idxIntro < 0 || idxFeat < 0 || idxUsage < 0 || idxShip < 0) return "";
  if (!(idxIntro < idxFeat && idxFeat < idxUsage && idxUsage < idxShip)) return "";

  const escape = (s: string) =>
    s.replace(/&nbsp;/gi, " ")
      .replace(/&nbp;/gi, " ")
      .replace(/&n\s*bsp;/gi, " ")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .trim();
  const parts: string[] = [];

  // 1) Intro
  const introBlock = text.slice(idxIntro, idxFeat).trim();
  if (introBlock.length > 30) parts.push("<p>" + escape(introBlock) + "</p>");

  // 2) คุณสมบัติ [product name] + 5 bullets — normalize &nbsp; ก่อนแบ่ง เพื่อไม่ให้ slice ตัดกลาง entity (เช่น &n + bsp;)
  const featBlockRaw = text.slice(idxFeat, idxUsage).trim();
  const featBlock = featBlockRaw.replace(/&nbsp;/gi, " ").replace(/&n\s*bsp;/gi, " ");
  let featHeadingEnd = featBlock.indexOf(" ปลอกคอ ไล่เห็บ");
  if (featHeadingEnd < 0) featHeadingEnd = featBlock.indexOf("ปลอกคอ ไล่เห็บ");
  const featHeading = featHeadingEnd >= 0 ? featBlock.slice(0, featHeadingEnd).trim() : featBlock.slice(0, 60).trim();
  const featRest = featHeadingEnd >= 0 ? featBlock.slice(featHeadingEnd).trim() : featBlock.slice(60).trim();
  let bullets = featRest
    .split(/\s+(?=เห็นผลชัดเจน|ใช้งานยาวนาน|ปรับขนาดได้|มีส่วนผสม)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  if (bullets.length < 4 && featRest.length > 30) {
    const byKeyword = featRest.split(/(เห็นผลชัดเจน|ใช้งานยาวนาน|ปรับขนาดได้|มีส่วนผสม)/);
    if (byKeyword.length >= 5) {
      const join = (a: string, b: string) => ((a || "") + " " + (b || "").trim()).trim();
      bullets = [
        byKeyword[0].trim(),
        join(byKeyword[1], byKeyword[2]),
        join(byKeyword[3], byKeyword[4]),
        join(byKeyword[5], byKeyword[6]),
        join(byKeyword[7], byKeyword[8]),
      ].filter((s) => s.length > 5);
    }
  }
  if (featHeading.length > 5) {
    parts.push("<p><strong>" + escape(featHeading) + "</strong></p>");
    if (bullets.length > 0) parts.push("<ul>" + bullets.map((b) => "<li>" + escape(b) + "</li>").join("") + "</ul>");
  }

  // 3) วิธีการใช้งาน [product name] + 4 steps
  const usageBlock = text.slice(idxUsage, idxShip).trim();
  const usageHeadingEnd = usageBlock.indexOf(" แกะออกมา");
  const usageHeading = usageHeadingEnd >= 0 ? usageBlock.slice(0, usageHeadingEnd).trim() : usageBlock.slice(0, 55).trim();
  const usageRest = usageHeadingEnd >= 0 ? usageBlock.slice(usageHeadingEnd).trim() : usageBlock.slice(55).trim();
  const i1 = usageRest.indexOf("แกะออกมา");
  const i2 = usageRest.indexOf("นำมาสวม", i1);
  const i3 = usageRest.indexOf("ใส่ปลอกคอ", i2);
  const i4 = usageRest.indexOf("ควรเปลี่ยน", i3);
  const steps: string[] = [];
  if (i1 >= 0 && i2 > i1) steps.push(usageRest.slice(i1, i2).trim());
  if (i2 >= 0 && i3 > i2) steps.push(usageRest.slice(i2, i3).trim());
  if (i3 >= 0 && i4 > i3) steps.push(usageRest.slice(i3, i4).trim());
  if (i4 >= 0) steps.push(usageRest.slice(i4).trim());
  const stepsClean = steps.filter((s) => s.length > 15);
  if (usageHeading.length > 5) {
    parts.push("<p><strong>" + escape(usageHeading) + "</strong></p>");
    if (stepsClean.length > 0) parts.push("<ol>" + stepsClean.map((s) => "<li>" + escape(s) + "</li>").join("") + "</ol>");
  }

  // 4) การจัดส่ง — เฉพาะ 2 บรรทัด (ส่งพรี..., ส่ง EMS...) ไม่ดึง nav/junk; จำกัด 120 ตัวอักษรหลังหัวข้อ
  const afterShip = text.slice(idxShip + shipM.length, idxShip + shipM.length + 150).trim();
  const atSn = afterShip.indexOf("สนใจสินค้า");
  const shipContent = (atSn > 5 ? afterShip.slice(0, atSn) : afterShip).trim().slice(0, 120);
  if (shipContent.length > 10 && /ส่งพรี|ส่ง EMS/i.test(shipContent)) {
    const items: string[] = [];
    if (shipContent.includes("ส่ง EMS")) {
      const [a, b] = shipContent.split(/\s+ส่ง EMS\s*/);
      if (a?.trim()) items.push(a.trim().replace(/&\s*$/, "").trim());
      if (b) items.push(("ส่ง EMS " + b.trim()).replace(/&\s*$/, "").trim());
    } else {
      items.push(shipContent.replace(/&\s*$/, "").trim());
    }
    const cleanItems = items
      .map((i) => i.replace(/&\s*$/, "").trim())
      .filter((i) => i.length > 5 && !/สินค้า\s+การสั่งทำ|ขายออนไลน์|class=|payload|@click/i.test(i));
    if (cleanItems.length > 0) {
      parts.push("<p><strong>การจัดส่ง</strong></p><ul>" + cleanItems.map((i) => "<li>" + escape(i) + "</li>").join("") + "</ul>");
    }
  }

  return parts.join("");
}

/** Try to convert thumbnail URL to full-size (many e-commerce sites use size params) */
function toFullSizeUrl(url: string): string {
  return url
    .replace(/_(\d+)x(\d+)(?=\.[a-z]+|\?|$)/gi, "_1200x1200")
    .replace(/-thumb(?:nail)?(?=\.[a-z]+|\?|$)/gi, "")
    .replace(/_thumb(?:nail)?(?=\.[a-z]+|\?|$)/gi, "_large")
    .replace(/\/thumb(?:nail)?s?\//i, "/images/")
    .replace(/([?&])w=\d+/gi, "$1w=1200")
    .replace(/([?&])size=\w+/gi, "$1size=large")
    .replace(/([?&])width=\d+/gi, "$1width=1200")
    .replace(/\/small\//i, "/large/")
    .replace(/\/medium\//i, "/large/");
}

/** ดึงรูปจาก product gallery ก่อน (LnwShop, ร้านทั่วไป) */
function extractProductGalleryImages(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (url: string) => {
    const u = url.trim();
    if (!u || u.startsWith("data:") || seen.has(u)) return;
    if (/\.(svg|ico)(\?|$)/i.test(u)) return;
    if (/\/logo\.|icon\.|sprite|badge\.|avatar\.|placeholder\.|1x1\.|pixel\./i.test(u)) return;
    if (/\b(qr|barcode|qrcode|promptpay|linepay|payment)\b/i.test(u)) return;
    seen.add(u);
    urls.push(u);
  };
  const galleryPatterns = [
    /<div[^>]*(?:class|id)=["'][^"']*(?:product|gallery|slide|carousel|image|main|thumbnail)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
    /<section[^>]*(?:class|id)=["'][^"']*(?:product|gallery|image)[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
  ];
  for (const re of galleryPatterns) {
    let m;
    while ((m = re.exec(html)) !== null) {
      const block = m[1];
      const imgRe = /<img[^>]+(?:data-zoom|data-large|data-full|data-original|data-src|src)=["']([^"']+)["']/gi;
      let imgM;
      while ((imgM = imgRe.exec(block)) !== null) add(imgM[1]);
    }
  }
  return urls;
}

/** Extract product image URLs from HTML (prioritize full-size: data-zoom, data-src, data-original) */
function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    const u = url.trim();
    if (!u || u.startsWith("data:") || seen.has(u)) return;
    if (/\.(svg|ico)(\?|$)/i.test(u)) return; // skip icons
    if (/\/logo\.|icon\.|sprite|badge\.|avatar\.|placeholder\.|1x1\.|pixel\./i.test(u)) return;
    // ข้ามรูป QR, barcode, payment (LINE Pay, PromptPay ฯลฯ)
    if (/\b(qr|barcode|qrcode|promptpay|linepay|payment)\b/i.test(u)) return;
    seen.add(u);
    urls.push(u);
  };

  // ลำดับความสำคัญ: รูปจาก gallery ก่อน
  const galleryUrls = extractProductGalleryImages(html);
  galleryUrls.forEach(add);

  const fullSizeAttrs = ["data-zoom", "data-large", "data-full", "data-original", "data-src"];
  for (const attr of fullSizeAttrs) {
    const regex = new RegExp(`<img[^>]+${attr}=["']([^"']+)["']`, "gi");
    let m;
    while ((m = regex.exec(html)) !== null) add(m[1]);
  }

  const srcRegex = /<img[^>]+(?:src|data-src|data-lazy-src|data-lazy)=["']([^"']+)["']/gi;
  let m;
  while ((m = srcRegex.exec(html)) !== null) add(m[1]);

  const srcsetRegex = /(?:<img[^>]+|<\s*source[^>]+)srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRegex.exec(html)) !== null) {
    m[1].split(",").forEach((part) => {
      const u = part.trim().split(/\s+/)[0];
      if (u) add(u);
    });
  }

  return urls;
}

interface ExtractedProduct {
  name?: string | null;
  name_th?: string | null;
  description?: string | null;
  description_th?: string | null;
  shortDescription?: string | null;
  shortDescription_th?: string | null;
  supplierPrice?: number | null;
  supplierSku?: string | null;
  imageUrls?: string[] | null;
  remark?: string | null;
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { url, debug: debugMode } = body as { url: string; debug?: boolean };

  if (!url || typeof url !== "string") {
    return NextResponse.json({ success: false, error: "url required" }, { status: 400 });
  }

  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return NextResponse.json(
      { success: false, error: "URL ต้องขึ้นต้นด้วย http:// หรือ https://" },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { success: false, error: "ANTHROPIC_API_KEY ยังไม่ได้ตั้งค่า" },
      { status: 500 }
    );
  }

  let html: string;
  try {
    const res = await fetch(trimmed, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parse-url] fetch", msg);
    return NextResponse.json(
      { success: false, error: `ไม่สามารถโหลดหน้าเว็บได้: ${msg}` },
      { status: 500 }
    );
  }

  const truncated = html.length > 70000 ? html.slice(0, 70000) + "\n...[truncated]" : html;
  const textContent = stripHtml(truncated).slice(0, 38000);
  const nuxtData = extractFromNuxtData(html);
  const tableData = extractLnwShopProductTable(truncated);
  const productInfo = extractProductInfoValues(truncated);
  // ใช้ html เต็ม (ไม่ truncate) เพื่อให้ short_description_pane ที่อยู่หลัง 60k chars ถูกดึงได้ครบ
  const builtDesc = buildFullDescriptionFromHtml(html);
  const structuredDesc = buildStructuredDescriptionFromText(textContent);
  const extraContext = [nuxtData, tableData, productInfo].filter(Boolean).join("\n\n");

  // Debug: ตรวจว่า intro อยู่ใน textContent ที่ส่งให้ AI หรือไม่
  const introMarker = "คุณกำลังจะซื้อ";
  const introIndexInText = textContent.indexOf(introMarker);
  const debugInfo: Record<string, unknown> = debugMode
    ? {
        htmlLength: html.length,
        textContentLength: textContent.length,
        introInTextContent: introIndexInText >= 0,
        introIndexInText: introIndexInText >= 0 ? introIndexInText : null,
        textSnippetAroundIntro:
          introIndexInText >= 0
            ? textContent.slice(Math.max(0, introIndexInText - 20), introIndexInText + 400)
            : textContent.slice(0, 500),
        builtDescLength: builtDesc.length,
        builtDescFirst300: builtDesc.slice(0, 300),
      }
    : {};

  const prompt = `You are extracting product data from an e-commerce product page.
Return ONLY valid JSON (no markdown, no code block) with these keys:

- name: product name in English (or Thai if page has no EN)
- name_th: product name in Thai (or null)
- description: FULL product description as HTML. CRITICAL: Copy the ENTIRE text - do NOT summarize or omit any part.
  The FIRST part MUST be the intro/sales paragraph that appears at the top of the product detail (e.g. "คุณกำลังจะซื้อ แป้งหรืออุปกรณ์ ไล่เห็บ หมัด ไร และยุง เราขอนำเสนอ ..." or similar). Wrap it in <p>...</p>. Do NOT skip this paragraph.
  Then structure the rest to match the page:
  2) Section "คุณสมบัติ [product name]": <p><strong>คุณสมบัติ ...</strong></p><ul><li>...</li></ul> - copy EVERY bullet
  3) Section "วิธีการใช้งาน [product name]": <p><strong>วิธีการใช้งาน ...</strong></p><ol><li>...</li></ol> - copy EVERY step
  4) Section "การจัดส่ง": <p><strong>การจัดส่ง</strong></p><p>...</p> - full shipping text
  5) Closing line (e.g. สนใจสินค้าสอบถามได้): <p>...</p>
  Use <ul><li>, <ol><li>, <p>, <strong>. No summarization. The intro paragraph is required and must appear first.
  Do NOT include barcode/QR, template variables ({{...}}), or UI-only text like "ไม่มีตัวเลือก".
- description_th: Same as description - full Thai content including the intro paragraph first, then คุณสมบัติ, วิธีการใช้งาน, การจัดส่ง. Copy complete text.
- shortDescription: one-line summary ~200 chars, include key benefits. Must be complete, not truncated.
- shortDescription_th: Thai short (or null)
- supplierPrice: number or null (Thai Baht)
- supplierSku: string or null
- remark: key specs in one line e.g. "น้ำหนัก 300g, กำลังไฟ 200W, สีน้ำเงิน" (or null)
- imageUrls: array of full product image URLs only (max 10, exclude logos/icons, QR codes, barcodes, payment icons)

Page content:
---
${textContent}
---
${extraContext ? `\nExtracted structured data:\n${extraContext}\n` : ""}

JSON:`;

  let extracted: ExtractedProduct;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    const jsonStr = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    extracted = JSON.parse(jsonStr) as ExtractedProduct;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[parse-url] AI", msg);
    return NextResponse.json(
      { success: false, error: `AI ไม่สามารถอ่านข้อมูลได้: ${msg}` },
      { status: 500 }
    );
  }

  const aiImageUrls = Array.isArray(extracted.imageUrls) ? extracted.imageUrls : [];
  const jsonImageUrls = extractImageUrlsFromJson(html);
  const htmlImageUrls = extractImageUrlsFromHtml(truncated);
  // ลำดับ: JSON (มักเป็น product images) > HTML gallery > HTML ทั้งหมด > AI
  let imageUrls = jsonImageUrls.length > 0 ? jsonImageUrls : htmlImageUrls.length > 0 ? htmlImageUrls : aiImageUrls;
  // กรองรูป QR/barcode/payment ออก
  imageUrls = imageUrls.filter(
    (u) => !/\b(qr|barcode|qrcode|promptpay|linepay|payment)\b/i.test(u)
  );
  const rehosted: string[] = [];
  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  for (let i = 0; i < Math.min(imageUrls.length, 10); i++) {
    const imgUrl = imageUrls[i];
    if (!imgUrl || typeof imgUrl !== "string") continue;
    const absUrl = toAbsoluteUrl(imgUrl, trimmed);
    if (!absUrl) continue;
    const fullSizeUrl = toFullSizeUrl(absUrl);
    const urlsToTry = fullSizeUrl !== absUrl ? [fullSizeUrl, absUrl] : [absUrl];
    let done = false;
    for (const tryUrl of urlsToTry) {
      try {
        const res = await fetch(tryUrl, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const ct = res.headers.get("content-type")?.split(";")[0]?.trim();
        if (ct && !ALLOWED.includes(ct)) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        const ext = ct?.split("/")[1] ?? "jpg";
        const pathname = `supplier-products/${Date.now()}-${i}.${ext}`;
        const blob = await put(pathname, buf, {
          access: "public",
          contentType: ct ?? "image/jpeg",
        });
        rehosted.push(blob.url);
        done = true;
        break;
      } catch {
        // try next URL (e.g. fallback to original if full-size 404)
      }
    }
    if (!done) {
      // skip failed image
    }
  }

  const cleanHtml = (s: string) =>
    s.replace(/\{\{[^}]*\}\}[^%\s]*/g, "").replace(/\s*ไม่มีตัวเลือก\s*[-–]?\s*/gi, " ").replace(/<li>\s*<\/li>/gi, "").replace(/\s+/g, " ").trim();

  let description: string;
  let description_th: string | null;
  const usedStructured = structuredDesc.length > 200;

  if (usedStructured) {
    description = cleanHtml(structuredDesc);
    description_th = description;
  } else {
    const builtHtml = builtDesc;
    const aiDesc = extracted.description?.trim() || extracted.description_th?.trim() || "";
    const aiDescTh = extracted.description_th?.trim() || null;
    description = aiDesc;
    description_th = aiDescTh;
    const usedBuilt = builtHtml.length >= 80 && builtHtml.length > aiDesc.length;
    if (usedBuilt) {
      description = builtHtml;
      description_th = builtHtml;
    } else if (description.length < 100 && (tableData || productInfo)) {
      const supplement = [tableData, productInfo].filter(Boolean).join("\n");
      if (supplement) description = description ? `${description}\n\n${supplement}` : supplement;
    }
  }

  // เติม intro ใต้หัวข้อ "รายละเอียดสินค้า" จาก textContent ถ้าใน description มีแต่หัวข้อ + bullet (ไม่มีย่อหน้า)
  const detailMarkerText = "รายละเอียดสินค้า";
  const idxDetailText = textContent.lastIndexOf(detailMarkerText);
  if (idxDetailText >= 0) {
    const after = textContent.slice(idxDetailText + detailMarkerText.length, idxDetailText + detailMarkerText.length + 800);
    const stopIdx = after.search(/(คุณสมบัติ|ไฮไลท์|วิธีการสั่งซื้อ|สินค้าที่เกี่ยวข้อง)/);
    const chunk = (stopIdx > 0 ? after.slice(0, stopIdx) : after).trim();
    const detailIntroText = chunk.replace(/\s+/g, " ").trim();
    if (detailIntroText.length > 40) {
      const safeIntro = detailIntroText.replace(/&nbsp;/gi, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      const headerIdx = description.indexOf("<p><strong>รายละเอียดสินค้า");
      if (headerIdx >= 0) {
        const headerEnd = description.indexOf("</p>", headerIdx);
        if (headerEnd >= 0) {
          const afterHeader = description.slice(headerEnd + 4).trimStart();
          // กรณีนี้เราต้องการ intro เฉพาะเมื่อหลังหัวข้อเป็น list เลย (ไม่มี <p> อยู่แล้ว)
          if (afterHeader.startsWith("<ul")) {
            const introHtml = `<p>${safeIntro}</p>`;
            description = description.slice(0, headerEnd + 4) + introHtml + description.slice(headerEnd + 4);
            if (description_th) {
              description_th =
                description_th.slice(0, headerEnd + 4) + introHtml + description_th.slice(headerEnd + 4);
            }
          }
        }
      }
    }
  }

  // ทำความสะอาด HTML สุดท้าย
  description = cleanHtml(description);
  if (description_th) description_th = cleanHtml(description_th);

  let introPrepended = false;
  if (!usedStructured && introIndexInText >= 0 && !description.includes(introMarker)) {
    const introEnd = textContent.indexOf("คุณสมบัติ", introIndexInText);
    const introPlain =
      introEnd >= 0
        ? textContent.slice(introIndexInText, introEnd).trim()
        : textContent.slice(introIndexInText, introIndexInText + 900).trim();
    if (introPlain.length > 50) {
      const safe = introPlain.replace(/&nbsp;/gi, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      const introHtml = "<p>" + safe + "</p>";
      description = introHtml + description;
      description_th = description_th ? introHtml + description_th : introHtml + description;
      introPrepended = true;
    }
  }

  const usageMarker = "วิธีการใช้งาน";
  const usageIdx = textContent.indexOf(usageMarker);
  if (!usedStructured && usageIdx >= 0 && !description.includes(usageMarker)) {
    const usageEnd = textContent.indexOf("การจัดส่ง", usageIdx);
    const usageBlock =
      usageEnd >= 0
        ? textContent.slice(usageIdx, usageEnd).trim()
        : textContent.slice(usageIdx, usageIdx + 1200).trim();
    if (usageBlock.length > 30) {
      const safe = usageBlock.replace(/&nbsp;/gi, " ").replace(/&nbp;/gi, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
      const headingEnd = safe.indexOf(" แกะ");
      const usageHeading = headingEnd >= 0 ? safe.slice(0, headingEnd).trim() : safe.slice(0, 60).trim();
      const usageBody = headingEnd >= 0 ? safe.slice(headingEnd).trim() : safe.slice(60).trim();
      const i1 = usageBody.indexOf("แกะออกมา");
      const i2 = usageBody.indexOf("นำมาสวม", i1);
      const i3 = usageBody.indexOf("ใส่ปลอกคอ", i2);
      const i4 = usageBody.indexOf("ควรเปลี่ยน", i3);
      const steps: string[] = [];
      if (i1 >= 0 && i2 > i1) steps.push(usageBody.slice(i1, i2).trim());
      if (i2 >= 0 && i3 > i2) steps.push(usageBody.slice(i2, i3).trim());
      if (i3 >= 0 && i4 > i3) steps.push(usageBody.slice(i3, i4).trim());
      if (i4 >= 0) steps.push(usageBody.slice(i4).trim());
      const stepsClean = steps.filter((s) => s.length > 15);
      const listHtml = stepsClean.length > 0 ? "<ol>" + stepsClean.map((s) => "<li>" + s + "</li>").join("") + "</ol>" : "<p>" + usageBody.slice(0, 400) + "</p>";
      const usageHtml = "<p><strong>" + usageHeading + "</strong></p>" + listHtml;
      description = description + usageHtml;
      description_th = description_th ? description_th + usageHtml : description + usageHtml;
    }
  }

  const shippingMarker = "การจัดส่ง";
  const shippingIdx = textContent.indexOf(shippingMarker, usageIdx >= 0 ? usageIdx : 0);
  if (!usedStructured && shippingIdx >= 0 && !description.includes(shippingMarker)) {
    const afterHeading = textContent.slice(shippingIdx + shippingMarker.length, shippingIdx + shippingMarker.length + 150).trim();
    const atSn = afterHeading.indexOf("สนใจสินค้า");
    const shipContent = (atSn > 5 ? afterHeading.slice(0, atSn) : afterHeading).trim().slice(0, 120);
    if (shipContent.length > 15 && /ส่งพรี|ส่ง EMS/i.test(shipContent)) {
      const safe = shipContent.replace(/&nbsp;/gi, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&\s*$/, "").trim();
      const items: string[] = [];
      if (safe.includes("ส่ง EMS")) {
        const parts = safe.split(/\s+ส่ง EMS\s*/);
        if (parts[0]?.trim()) items.push(parts[0].trim().replace(/&\s*$/, "").trim());
        if (parts[1]) items.push(("ส่ง EMS " + parts[1].trim()).replace(/&\s*$/, "").trim());
      } else {
        items.push(safe.replace(/&\s*$/, "").trim());
      }
      const cleanItems = items
        .map((i) => i.replace(/&\s*$/, "").trim())
        .filter((i) => i.length > 5 && !/สินค้า\s+การสั่งทำ|ขายออนไลน์|class=|payload|@click/i.test(i));
      if (cleanItems.length > 0) {
        const listHtml = "<ul>" + cleanItems.map((i) => "<li>" + i + "</li>").join("") + "</ul>";
        const shippingHtml = "<p><strong>" + shippingMarker + "</strong></p>" + listHtml;
        description = description + shippingHtml;
        description_th = description_th ? description_th + shippingHtml : description + shippingHtml;
      }
    }
  }

  if (debugMode) {
    (debugInfo as Record<string, unknown>).usedStructured = usedStructured;
    (debugInfo as Record<string, unknown>).structuredDescLength = structuredDesc.length;
    (debugInfo as Record<string, unknown>).finalDescLength = description.length;
    (debugInfo as Record<string, unknown>).finalDescFirst600 = description.slice(0, 600);
    (debugInfo as Record<string, unknown>).introPrepended = introPrepended;
    if (!usedStructured) {
      const aiDesc = extracted.description?.trim() || extracted.description_th?.trim() || "";
      (debugInfo as Record<string, unknown>).aiDescLength = aiDesc.length;
      (debugInfo as Record<string, unknown>).aiDescFirst500 = aiDesc.slice(0, 500);
      (debugInfo as Record<string, unknown>).usedBuilt = builtDesc.length >= 80 && aiDesc.length < builtDesc.length;
    }
  }
  let shortDesc = extracted.shortDescription?.trim() || null;
  let shortDescTh = extracted.shortDescription_th?.trim() || null;
  if (!shortDesc && description) shortDesc = description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!shortDescTh && description_th) shortDescTh = description_th.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);

  const data = {
    name: extracted.name?.trim() || extracted.name_th?.trim() || "Product",
    name_th: extracted.name_th?.trim() || null,
    description,
    description_th: description_th || null,
    shortDescription: shortDesc,
    shortDescription_th: shortDescTh,
    supplierPrice: extracted.supplierPrice != null ? Number(extracted.supplierPrice) : null,
    supplierSku: extracted.supplierSku?.trim() || null,
    supplierUrl: trimmed,
    remark: extracted.remark?.trim() || null,
    images: rehosted,
  };

  const json: { success: true; data: typeof data; debug?: Record<string, unknown> } = { success: true, data };
  if (debugMode && Object.keys(debugInfo).length > 0) json.debug = debugInfo;
  return NextResponse.json(json);
}
