import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

function csvCell(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val).replace(/"/g, '""');
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
}

function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  return lines.join("\r\n");
}

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "shopee";
  const active = searchParams.get("active") || "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = shopId === "all" ? {} : { shopId };
  if (active === "true") where.active = true;
  if (active === "false") where.active = false;

  const products = await prisma.product.findMany({
    where,
    include: { category: true, shop: true },
    orderBy: { createdAt: "desc" },
  });

  // Build filename prefix from shop name + datetime
  const shopName = products[0]?.shop?.name ?? (shopId !== "all" ? shopId : "all");
  const safeShop = shopName.replace(/[^a-zA-Z0-9ก-๙\-_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const datetime = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

  let csv = "";
  let filename = "products.csv";

  if (platform === "shopee") {
    filename = `${safeShop}_shopee_${datetime}.csv`;
    csv = toCSV(
      ["ชื่อสินค้า", "ชื่อสินค้า (ไทย)", "คำอธิบาย", "ราคา", "ราคาก่อนลด", "จำนวนสต็อก", "รูปภาพหลัก", "รูปภาพเพิ่มเติม", "หมวดหมู่", "วันจัดส่ง (วัน)"],
      products.map((p) => [
        p.name,
        p.name_th ?? p.name,
        p.description_th ?? p.description,
        p.price,
        p.normalPrice ?? p.price,
        p.stock,
        p.images[0] ?? "",
        p.images.slice(1).join("|"),
        p.category.name,
        p.deliveryDays,
      ])
    );
  } else if (platform === "tiktok") {
    filename = `${safeShop}_tiktok_${datetime}.csv`;
    csv = toCSV(
      ["Product Name", "Product Name (TH)", "Description", "Price", "Stock", "Main Image", "Additional Images", "Category"],
      products.map((p) => [
        p.name,
        p.name_th ?? p.name,
        p.description,
        p.price,
        p.stock,
        p.images[0] ?? "",
        p.images.slice(1).join("|"),
        p.category.name,
      ])
    );
  } else if (platform === "facebook") {
    filename = `${safeShop}_facebook_${datetime}.csv`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    csv = toCSV(
      ["id", "title", "description", "price", "image_link", "additional_image_link", "brand", "availability", "condition", "link"],
      products.map((p) => [
        p.id,
        p.name_th ?? p.name,
        (p.description_th ?? p.description).slice(0, 500),
        `${p.price} THB`,
        p.images[0] ?? "",
        p.images.slice(1, 10).join(","),
        p.shop?.name ?? "",
        p.stock > 0 ? "in stock" : "out of stock",
        "new",
        `${appUrl}/products/${p.id}`,
      ])
    );
  }

  // UTF-8 BOM for Excel Thai support
  const bom = "\uFEFF";
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
