import { prisma } from "../src/lib/prisma";
import { FulfillmentMethod } from "@prisma/client";

async function main() {
  const products = await prisma.product.updateMany({
    where: { OR: [{ source: "CJ" }, { cjProductId: { not: null } }] },
    data: { fulfillmentMethod: FulfillmentMethod.CJ },
  });
  const variants = await prisma.productVariant.updateMany({
    where: { cjVid: { not: null } },
    data: { fulfillmentMethod: FulfillmentMethod.CJ },
  });
  console.log(`Updated ${products.count} products, ${variants.count} variants → CJ`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
