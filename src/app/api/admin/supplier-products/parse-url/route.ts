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

  // 1. ดึง bullets จากหลายแหล่ง
  const bullets: string[] = [];
  const seen = new Set<string>();

  const addBullet = (t: string) => {
    const normalized = normalizeForDedup(t);
    const key = normalized.slice(0, 80);
    if (isValidProductBullet(normalized) && !seen.has(key)) {
      seen.add(key);
      bullets.push(normalized); // ใช้เวอร์ชัน normalize เพื่อไม่เบิ้ล
    }
  };

  // 1a. ดึงจาก short_description_pane ก่อน (LnwShop - block นี้มีครบ 5 bullets แน่นอน)
  const paneIdx = html.indexOf("short_description_pane");
  if (paneIdx >= 0) {
    const paneChunk = html.slice(paneIdx, paneIdx + 3500);
    const paneBullets = parseBulletsFromHtml(paneChunk);
    if (paneBullets.length >= 4) {
      paneBullets.forEach(addBullet);
    }
  }

  // 1b. จากตาราง LnwShop - ไฮไลท์, คุณสมบัติ, รายละเอียดสินค้า
  for (const labelPattern of [/ไฮไลท์/i, /คุณสมบัติ/i, /รายละเอียดสินค้า/i]) {
    for (const cellHtml of extractTableRowByLabel(html, labelPattern)) {
      parseBulletsFromHtml(cellHtml).forEach(addBullet);
    }
  }

  // 1c. จาก __NUXT_DATA__
  extractBulletsFromNuxtData(html).forEach(addBullet);

  // 1d. จาก <li> (ข้าม nav tabs และ label หน้า LnwShop)
  const navLabels = /^(รายละเอียดสินค้า|วิธีการสั่งซื้อ|สินค้าที่เกี่ยวข้อง|สต๊อกสินค้า|ระยะเวลาการจัดส่ง|วิธีการสั่งซื้อสินค้า|ชำระเงิน|แจ้งปัญหา|กรุณาเลือก)$/i;
  for (const m of html.matchAll(/<li[^>]*>([^<]+(?:<[^>]+>[^<]*)*?)<\/li>/gi)) {
    const raw = m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (!navLabels.test(raw)) addBullet(sanitizeDescriptionText(raw));
  }

  // 1e. รูปแบบ "- ข้อความ"
  for (const m of html.matchAll(/(?:^|>)\s*[-•]\s*([^<\n]{5,250})/gm)) {
    addBullet(sanitizeDescriptionText(m[1].replace(/\s+/g, " ").trim()));
  }
  const ulBlock = html.match(/(?:ไฮไลท์|คุณสมบัติ)[\s\S]{0,100}?<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (ulBlock?.[1]) {
    parseBulletsFromHtml(ulBlock[1]).forEach(addBullet);
  }

  if (bullets.length > 0) {
    parts.push("<p><strong>ไฮไลท์/คุณสมบัติ</strong></p><ul>" + bullets.map((b) => `<li>${b}</li>`).join("") + "</ul>");
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

  // 3. รายละเอียดสินค้า - แสดงให้เหมือนต้นฉบับ (ใช้ bullets เดียวกันถ้าไม่มีแยก)
  let detailBullets: string[] = [];
  const detailRows = extractTableRowByLabel(html, /รายละเอียดสินค้า/i);
  const detailBlock = html.match(/รายละเอียดสินค้า[\s\S]{0,300}?(?:คุณสมบัติ\s*)?([\s\S]*?)(?=เงื่อนไข|<\/tr>|<\/table>|$)/i);
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
  if (detailBullets.length > 0) {
    parts.push("<p><strong>รายละเอียดสินค้า</strong></p><ul>" + detailBullets.map((c) => `<li>${normalizeForDedup(c)}</li>`).join("") + "</ul>");
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
  const { url } = body as { url: string };

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

  const truncated = html.length > 60000 ? html.slice(0, 60000) + "\n...[truncated]" : html;
  const textContent = stripHtml(truncated).slice(0, 25000);
  const nuxtData = extractFromNuxtData(html);
  const tableData = extractLnwShopProductTable(truncated);
  const productInfo = extractProductInfoValues(truncated);
  // ใช้ html เต็ม (ไม่ truncate) เพื่อให้ short_description_pane ที่อยู่หลัง 60k chars ถูกดึงได้ครบ
  const builtDesc = buildFullDescriptionFromHtml(html);
  const extraContext = [nuxtData, tableData, productInfo].filter(Boolean).join("\n\n");

  const prompt = `You are extracting product data from an e-commerce product page.
Return ONLY valid JSON (no markdown, no code block) with these keys:

- name: product name in English (or Thai if page has no EN)
- name_th: product name in Thai (or null)
- description: Output as HTML. Use <ul><li> for bullet points, <p> for paragraphs, <strong> for section headers.
  Include ALL bullets from ไฮไลท์/คุณสมบัติ (copy every single one - do not skip or summarize). Include ข้อมูล (น้ำหนัก, ลงสินค้า, อัพเดทล่าสุด), รายละเอียดสินค้า (same bullets as ไฮไลท์).
  Put REAL values from the page. No summarization - copy full content. If you see 5 bullets, output all 5.
  Do NOT include barcode/QR code, template variables ({{...}}), or UI text like "ไม่มีตัวเลือก" in description.
- description_th: Same as description - full Thai content as HTML. Use <ul><li>, <p>, <strong> for structure.
- shortDescription: one-line summary ~200 chars, include key benefits. Must be complete, not truncated.
- shortDescription_th: Thai short (or null)
- supplierPrice: number or null (Thai Baht)
- supplierSku: string or null
- remark: key specs in one line e.g. "น้ำหนัก 300g, กำลังไฟ 200W, สีน้ำเงิน, ขนาด 76x92x175mm" (or null)
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

  // ใช้ description จาก HTML ที่ extract ได้เป็นหลัก (ครบตามต้นทาง) ถ้ามีเนื้อหาพอ
  const builtHtml = builtDesc;
  let description = extracted.description?.trim() || extracted.description_th?.trim() || "";
  let description_th = extracted.description_th?.trim() || null;
  if (builtHtml.length >= 80) {
    description = builtHtml;
    description_th = builtHtml;
  } else if (description.length < 100 && (tableData || productInfo)) {
    const supplement = [tableData, productInfo].filter(Boolean).join("\n");
    if (supplement) description = description ? `${description}\n\n${supplement}` : supplement;
  }
  // ลบ template variables และข้อความ UI ที่หลุดมา ({{...}}, ไม่มีตัวเลือก ฯลฯ)
  const cleanHtml = (s: string) =>
    s.replace(/\{\{[^}]*\}\}[^%\s]*/g, "").replace(/\s*ไม่มีตัวเลือก\s*[-–]?\s*/gi, " ").replace(/<li>\s*<\/li>/gi, "").replace(/\s+/g, " ").trim();
  description = cleanHtml(description);
  if (description_th) description_th = cleanHtml(description_th);
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

  return NextResponse.json({ success: true, data });
}
