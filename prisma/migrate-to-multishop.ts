/**
 * Migration script: Create default shop and backfill shopId on all existing data.
 * Run with: npx tsx prisma/migrate-to-multishop.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Multi-Shop Migration ===\n");

  // 1. Create default shop
  let shop = await prisma.shop.findUnique({ where: { slug: "default" } });
  if (!shop) {
    const settings = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    shop = await prisma.shop.create({
      data: {
        name: settings?.storeName ?? "PetShop",
        name_th: settings?.storeName ?? "PetShop",
        slug: "default",
        description: "Default shop",
        logoUrl: settings?.logoUrl,
        usePetType: true,
        active: true,
      },
    });
    console.log(`Created default shop: ${shop.id}`);
  } else {
    console.log(`Default shop already exists: ${shop.id}`);
  }

  const shopId = shop.id;

  // 2. Create ShopSettings from SiteSettings
  const existingSettings = await prisma.shopSettings.findUnique({ where: { shopId } });
  if (!existingSettings) {
    const site = await prisma.siteSettings.findUnique({ where: { id: "default" } });
    if (site) {
      await prisma.shopSettings.create({
        data: {
          shopId,
          promptpayId: site.promptpayId,
          bankName: site.bankName,
          bankAccount: site.bankAccount,
          bankAccountName: site.bankAccountName,
          adminEmail: site.adminEmail,
          cjAccessToken: site.cjAccessToken,
          cjTokenExpiresAt: site.cjTokenExpiresAt,
          cjPriceFactor: site.cjPriceFactor,
          usdToThb: site.usdToThb,
          displayStockMin: site.displayStockMin,
          displayStockMax: site.displayStockMax,
        },
      });
      console.log("Created ShopSettings from SiteSettings");
    }
  } else {
    console.log("ShopSettings already exists");
  }

  // 3. Backfill shopId on all existing models
  const updates = [
    { model: "product", table: "products" },
    { model: "heroBanner", table: "hero_banners" },
    { model: "shelf", table: "shelves" },
    { model: "article", table: "articles" },
    { model: "coupon", table: "coupons" },
    { model: "order", table: "orders" },
    { model: "cjApiLog", table: "cj_api_logs" },
  ];

  for (const { table } of updates) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "${table}" SET "shopId" = $1 WHERE "shopId" IS NULL`,
      shopId
    );
    console.log(`Updated ${table}: ${result} rows`);
  }

  // 4. Create ShopCategory for all existing categories
  const categories = await prisma.category.findMany();
  let created = 0;
  for (const cat of categories) {
    const exists = await prisma.shopCategory.findUnique({
      where: { shopId_categoryId: { shopId, categoryId: cat.id } },
    });
    if (!exists) {
      await prisma.shopCategory.create({
        data: { shopId, categoryId: cat.id },
      });
      created++;
    }
  }
  console.log(`Created ${created} ShopCategory entries (${categories.length} total categories)`);

  // 5. Create ShopMember OWNER for existing ADMIN users
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  let membersCreated = 0;
  for (const admin of admins) {
    const exists = await prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: admin.id, shopId } },
    });
    if (!exists) {
      await prisma.shopMember.create({
        data: { userId: admin.id, shopId, role: "OWNER" },
      });
      membersCreated++;
    }
  }
  console.log(`Created ${membersCreated} ShopMember OWNER entries for ${admins.length} admins`);

  console.log("\n=== Migration Complete ===");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
