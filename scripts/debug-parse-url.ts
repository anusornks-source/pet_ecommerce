/**
 * Debug script: fetch product page and trace bullet extraction
 * Run: npx tsx scripts/debug-parse-url.ts
 */
const TARGET_URL =
  "http://www.all-mate.com/product/8344/dog-and-cat-house-%E0%B9%80%E0%B8%9A%E0%B8%B2%E0%B8%B0%E0%B8%A3%E8%AD%E0%B8%87%E0%B8%99%E0%B8%AD%E0%B8%99%E0%B8%AA%E0%B8%B3%E0%B8%AB%E0%B8%A3%E0%B8%B1%E0%B8%9A%E0%B8%AA%E0%B8%B1%E0%B8%95%E0%B8%A7%E0%B9%8C%E0%B9%80%E0%B8%A5%E0%B8%B5%E0%B9%89%E0%B8%A2%E0%B8%87";

async function main() {
  console.log("Fetching...");
  const res = await fetch(TARGET_URL, {
    headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0", Accept: "text/html" },
  });
  const html = await res.text();
  console.log("HTML length:", html.length);

  const paneIdx = html.indexOf("short_description_pane");
  console.log("short_description_pane index:", paneIdx);

  if (paneIdx >= 0) {
    const paneChunk = html.slice(paneIdx, paneIdx + 3500);
    console.log("\n=== paneChunk (first 500 chars) ===");
    console.log(paneChunk.slice(0, 500));

    const divMatches = [...paneChunk.matchAll(/<div[^>]*>\s*([-–−][^<]*?)<\/div>/gi)];
    console.log("\n=== div matches (regex 1) ===");
    console.log("Count:", divMatches.length);
    divMatches.forEach((m, i) => {
      const text = m[1].replace(/<[^>]+>/g, "").trim();
      const bullet = text.replace(/^[-–−]\s*/, "").trim();
      console.log(`${i + 1}. [${bullet.length} chars]`, bullet.slice(0, 60) + (bullet.length > 60 ? "..." : ""));
    });

    const allDivMatches = [...html.matchAll(/<div[^>]*>\s*([-–−][^<]*?)<\/div>/gi)];
    console.log("\n=== div matches in FULL html ===");
    console.log("Count:", allDivMatches.length);
    const bulletDivs = allDivMatches.filter((m) => {
      const b = m[1].replace(/^[-–−]\s*/, "").trim();
      return b.length > 20 && /[\u0E00-\u0E7F]/.test(b);
    });
    console.log("Filtered (Thai, >20 chars):", bulletDivs.length);
    bulletDivs.slice(0, 10).forEach((m, i) => {
      const bullet = m[1].replace(/^[-–−]\s*/, "").trim();
      console.log(`${i + 1}.`, bullet.slice(0, 60) + "...");
    });
  } else {
    console.log("short_description_pane NOT FOUND");
    const lower = html.toLowerCase();
    if (lower.includes("short_description")) return console.log("But 'short_description' exists");
    if (lower.includes("shortdescription")) return console.log("But 'shortdescription' exists");
  }

  // ตรวจสอบ ข้อมูล + รายละเอียดสินค้า (แถวตาราง)
  const tableRegex = /<tr[^>]*>[\s\S]*?<t[hd][^>]*>([^<]*)<\/t[hd]>[\s\S]*?<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?(?:<t[hd][^>]*>([\s\S]*?)<\/t[hd]>[\s\S]*?)?<\/tr>/gi;
  let m;
  const dataRows: string[] = [];
  const detailRows: string[] = [];
  while ((m = tableRegex.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    const val = (m[3] && m[3].trim().length > 20 ? m[3] : m[2]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (/^ข้อมูล$/i.test(label)) dataRows.push(val.slice(0, 200));
    if (/รายละเอียดสินค้า/i.test(label)) detailRows.push(val.slice(0, 300));
  }
  console.log("\n=== แถวตาราง ข้อมูล ===");
  console.log("Count:", dataRows.length);
  dataRows.forEach((r, i) => console.log(`${i + 1}.`, r));
  // แสดง raw HTML ของแถว ข้อมูล (500 chars)
  const dataTrMatch = html.match(/<tr[^>]*class=["']detailTR["'][^>]*>[\s\S]*?<td[^>]*>ข้อมูล<\/t[hd]>[\s\S]*?<\/tr>/i);
  if (dataTrMatch) {
    console.log("\nRaw ข้อมูล row (first 600 chars):");
    console.log(dataTrMatch[0].slice(0, 600));
  }
  // ดึงจาก __NUXT_DATA__ หรือ JSON ในหน้า (น้ำหนัก, ลงสินค้า, อัพเดท)
  const nuxtMatch = html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  const hasNuxt = !!nuxtMatch;
  console.log("\n=== __NUXT_DATA__ ===", hasNuxt ? "พบ" : "ไม่พบ");
  if (nuxtMatch) {
    const raw = nuxtMatch[1].trim().startsWith("%") ? decodeURIComponent(nuxtMatch[1].trim()) : nuxtMatch[1].trim();
    const weightM = raw.match(/"weight"\s*:\s*"?([^"]+)"?/i) ?? raw.match(/weight["\s:]+(\d+[\s]*กรัม|[\d.]+\s*kg)/i);
    const createdM = raw.match(/"created_at"\s*:\s*"([^"]+)"/i) ?? raw.match(/created_at["\s:]+"([^"]+)"/i);
    const updatedM = raw.match(/"updated_at"\s*:\s*"([^"]+)"/i) ?? raw.match(/updated_at["\s:]+"([^"]+)"/i);
    console.log("weight:", weightM?.[1] ?? "ไม่พบ");
    console.log("created:", createdM?.[1] ?? "ไม่พบ");
    console.log("updated:", updatedM?.[1] ?? "ไม่พบ");
  }
  // หา น้ำหนัก / 300 / กรัม ใน HTML
  console.log("\n=== ค้นหา น้ำหนัก/300/กรัม ===");
  const idx300 = html.indexOf("300");
  if (idx300 >= 0) console.log("near 300:", html.slice(Math.max(0, idx300 - 40), idx300 + 60));
  const idxGram = html.indexOf("กรัม");
  if (idxGram >= 0) console.log("near กรัม:", html.slice(Math.max(0, idxGram - 50), idxGram + 20));
  const weightRe = /["']weight["']\s*:\s*["']?([^"',}\s]+)/;
  const wm = html.match(weightRe);
  if (wm) console.log("weight in JSON:", wm[0]);
  const gramRe = /(\d+)\s*กรัม/;
  const gm = html.match(gramRe);
  if (gm) console.log("กรัม pattern:", gm[0]);
  console.log("\n=== แถวตาราง รายละเอียดสินค้า ===");
  console.log("Count:", detailRows.length);
  detailRows.forEach((r, i) => console.log(`${i + 1}.`, r));
}

main().catch(console.error);
