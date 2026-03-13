/**
 * Debug parse-url: ตรวจว่า intro/รายละเอียด อยู่ที่ไหนในหน้า (all-mate.com etc.)
 * Run: npx tsx scripts/debug-parse-url.ts
 */
const TARGET_URL =
  "http://www.all-mate.com/product/7018/dooda-%E0%B8%9B%E0%B8%A5%E0%B8%AD%E0%B8%81%E0%B8%84%E0%B8%AD%E0%B9%84%E0%B8%A5%E0%B9%88%E0%B9%80%E0%B8%AB%E0%B9%87%E0%B8%9B-%E0%B8%AB%E0%B8%A1%E0%B8%B1%E0%B8%94-%E0%B9%84%E0%B8%A3-%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%A2%E0%B8%B8%E0%B8%87-%E0%B8%AA%E0%B8%B5%E0%B8%AA%E0%B9%89%E0%B8%A1-%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B9%81%E0%B8%A1%E0%B8%A7%E0%B9%81%E0%B8%A5%E0%B8%B0%E0%B8%AA%E0%B8%B8%E0%B8%99%E0%B8%B1%E0%B8%82";

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  console.log("Fetching:", TARGET_URL);
  const res = await fetch(TARGET_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0", Accept: "text/html" },
  });
  const html = await res.text();
  console.log("HTML length:", html.length);

  const introMarker = "คุณกำลังจะซื้อ";
  const idxRaw = html.indexOf(introMarker);
  console.log("\n=== 1. ใน HTML ดิบ ===");
  console.log('indexOf("คุณกำลังจะซื้อ"):', idxRaw >= 0 ? idxRaw : "ไม่พบ");
  if (idxRaw >= 0) {
    const snippet = html.slice(Math.max(0, idxRaw - 100), idxRaw + 500);
    const inScript = snippet.includes("<script") || (idxRaw > 0 && html.lastIndexOf("<script", idxRaw) > html.lastIndexOf("</script>", idxRaw));
    console.log("อยู่ใน <script>?:", inScript);
    console.log("Snippet (500 chars):", snippet.replace(/\s+/g, " ").slice(0, 500));
  }

  const textContent = stripHtml(html);
  const idxText = textContent.indexOf(introMarker);
  console.log("\n=== 2. หลัง stripHtml (ที่ส่งให้ AI) ===");
  console.log("textContent length:", textContent.length);
  console.log('indexOf("คุณกำลังจะซื้อ"):', idxText >= 0 ? idxText : "ไม่พบ");
  if (idxText >= 0) {
    console.log("Snippet (400 chars):", textContent.slice(idxText, idxText + 400));
  } else {
    console.log("(intro ไม่อยู่ใน textContent → AI ไม่เห็นข้อความนี้)");
    console.log("First 600 chars of textContent:", textContent.slice(0, 600));
  }

  // ถ้าอยู่ใน script ให้ลองดึงจาก JSON/__NUXT_DATA__
  if (idxRaw >= 0 && idxText < 0) {
    console.log("\n=== 3. Intro อยู่ใน script - หาใน JSON ===");
    const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    if (scriptMatch) {
      for (let i = 0; i < scriptMatch.length; i++) {
        if (scriptMatch[i].includes(introMarker)) {
          console.log("พบใน script block ที่", i);
          const start = scriptMatch[i].indexOf(introMarker);
          console.log("Snippet:", scriptMatch[i].slice(start, start + 300));
          break;
        }
      }
    }
  }

  console.log("\n=== 4. สรุป ===");
  if (idxText >= 0) {
    console.log("OK: intro อยู่ใน textContent → AI น่าจะดึงได้ (หรือใช้ fallback ใน API)");
  } else if (idxRaw >= 0) {
    console.log("ปัญหา: intro อยู่ใน HTML แต่ถูกลบไปกับ <script> → ต้องดึงจาก script/JSON แยก");
  } else {
    console.log("ปัญหา: ไม่พบ intro ในหน้านี้ (อาจโหลดแบบ dynamic อื่น)");
  }
  console.log("\nเรียก API ด้วย debug: true เพื่อดู AI response และ final description:");
  console.log('  fetch("/api/admin/supplier-products/parse-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: "...", debug: true }) })');
}

main().catch(console.error);
