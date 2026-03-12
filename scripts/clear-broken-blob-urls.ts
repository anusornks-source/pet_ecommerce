/**
 * ล้าง URL ที่ชี้ไปยัง Blob ที่ถูกลบแล้ว
 * รัน: npx tsx scripts/clear-broken-blob-urls.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function checkUrl(url: string | null): Promise<boolean> {
  if (!url || !url.includes("blob.vercel-storage.com")) return true;
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log("กำลังตรวจสอบ Blob URLs...\n");

  // SiteSettings
  const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
  if (settings) {
    const updates: Record<string, null> = {};
    if (settings.heroImageUrl && !(await checkUrl(settings.heroImageUrl))) {
      updates.heroImageUrl = null;
      console.log("❌ heroImageUrl ถูกลบแล้ว → จะล้าง");
    }
    if (settings.logoUrl && !(await checkUrl(settings.logoUrl))) {
      updates.logoUrl = null;
      console.log("❌ logoUrl ถูกลบแล้ว → จะล้าง");
    }
    if (settings.thaiAddressBlobUrl && !(await checkUrl(settings.thaiAddressBlobUrl))) {
      updates.thaiAddressBlobUrl = null;
      console.log("❌ thaiAddressBlobUrl ถูกลบแล้ว → จะล้าง");
    }
    if (Object.keys(updates).length > 0) {
      await prisma.siteSettings.update({
        where: { id: "default" },
        data: updates as never,
      });
      console.log("✓ อัปเดต SiteSettings แล้ว\n");
    }
  }

  // Shops
  const shops = await prisma.shop.findMany({
    select: { id: true, name: true, logoUrl: true, coverUrl: true },
  });
  for (const shop of shops) {
    const updates: Record<string, null> = {};
    if (shop.logoUrl && !(await checkUrl(shop.logoUrl))) {
      updates.logoUrl = null;
      console.log(`❌ Shop "${shop.name}" logoUrl ถูกลบแล้ว → จะล้าง`);
    }
    if (shop.coverUrl && !(await checkUrl(shop.coverUrl))) {
      updates.coverUrl = null;
      console.log(`❌ Shop "${shop.name}" coverUrl ถูกลบแล้ว → จะล้าง`);
    }
    if (Object.keys(updates).length > 0) {
      await prisma.shop.update({ where: { id: shop.id }, data: updates as never });
    }
  }
  if (shops.some((s) => s.logoUrl || s.coverUrl)) {
    console.log("✓ ตรวจสอบ Shops แล้ว\n");
  }

  console.log("เสร็จสิ้น");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
