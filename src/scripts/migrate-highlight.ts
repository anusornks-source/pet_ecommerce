/**
 * One-time migration: move highlight products → "สินค้ายอดนิยม" shelf
 * Run: npx tsx src/scripts/migrate-highlight.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Upsert the "สินค้ายอดนิยม" shelf (orange, same color as old highlight section)
  const shelf = await prisma.shelf.upsert({
    where: { slug: "popular" },
    create: {
      name: "สินค้ายอดนิยม",
      slug: "popular",
      description: "✨ คัดสรรพิเศษ",
      color: "#f97316",
      active: true,
      order: 0,
    },
    update: {},
  });

  console.log(`✅ Shelf: "${shelf.name}" (id: ${shelf.id})`);

  // 2. Get all highlighted products ordered by highlightOrder
  const products = await prisma.product.findMany({
    where: { highlight: true },
    orderBy: [{ highlightOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, highlightOrder: true },
  });

  console.log(`📦 Found ${products.length} highlighted products to migrate`);

  if (products.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  // 3. Create ShelfItems (skip duplicates)
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const existing = await prisma.shelfItem.findUnique({
      where: { shelfId_productId: { shelfId: shelf.id, productId: product.id } },
    });

    if (existing) {
      console.log(`  ⏭ Skip (already in shelf): ${product.name}`);
      skipped++;
      continue;
    }

    await prisma.shelfItem.create({
      data: { shelfId: shelf.id, productId: product.id, order: i },
    });
    console.log(`  ✓ Migrated [${i}]: ${product.name}`);
    created++;
  }

  console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
