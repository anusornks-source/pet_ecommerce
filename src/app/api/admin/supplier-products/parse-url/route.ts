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

/** Extract product image URLs from HTML (prioritize full-size: data-zoom, data-src, data-original) */
function extractImageUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const add = (url: string) => {
    const u = url.trim();
    if (!u || u.startsWith("data:") || seen.has(u)) return;
    if (/\.(svg|ico)(\?|$)/i.test(u)) return; // skip icons
    if (/\/logo\.|icon\.|sprite|badge\.|avatar\.|placeholder\.|1x1\.|pixel\./i.test(u)) return;
    seen.add(u);
    urls.push(u);
  };

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
  const textContent = stripHtml(truncated).slice(0, 30000);

  const prompt = `You are extracting product data from an e-commerce product page.
Return ONLY valid JSON (no markdown, no code block) with these keys:

- name: product name in English (or Thai if page has no EN)
- name_th: product name in Thai (or null)
- description: Output as HTML. Use <ul><li> for bullet points, <p> for paragraphs, <strong> for section headers.
  Include: ไฮไลท์/คุณสมบัติ (every bullet as <li>), ข้อมูล (น้ำหนัก, ลงสินค้า, อัพเดทล่าสุด), รายละเอียดสินค้า (กำลังไฟ, แรงดัน, ความเร็ว, สี, วัสดุ, ขนาด, ความจุ ฯลฯ).
  Preserve line breaks and structure. No summarization - copy full content.
- description_th: Same as description - full Thai content as HTML. Use <ul><li>, <p>, <strong> for structure.
- shortDescription: one-line summary ~100 chars
- shortDescription_th: Thai short (or null)
- supplierPrice: number or null (Thai Baht)
- supplierSku: string or null
- remark: key specs in one line e.g. "น้ำหนัก 300g, กำลังไฟ 200W, สีน้ำเงิน, ขนาด 76x92x175mm" (or null)
- imageUrls: array of full product image URLs only (max 10, exclude logos/icons)

Page content:
---
${textContent}
---

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
  const htmlImageUrls = extractImageUrlsFromHtml(truncated);
  const imageUrls = htmlImageUrls.length > 0 ? htmlImageUrls : aiImageUrls;
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

  const data = {
    name: extracted.name?.trim() || extracted.name_th?.trim() || "Product",
    name_th: extracted.name_th?.trim() || null,
    description: extracted.description?.trim() || extracted.description_th?.trim() || "",
    description_th: extracted.description_th?.trim() || null,
    shortDescription: extracted.shortDescription?.trim() || null,
    shortDescription_th: extracted.shortDescription_th?.trim() || null,
    supplierPrice: extracted.supplierPrice != null ? Number(extracted.supplierPrice) : null,
    supplierSku: extracted.supplierSku?.trim() || null,
    supplierUrl: trimmed,
    remark: extracted.remark?.trim() || null,
    images: rehosted,
  };

  return NextResponse.json({ success: true, data });
}
