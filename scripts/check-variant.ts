import { prisma } from "../src/lib/prisma";

async function main() {
  const v = await prisma.productVariant.findMany({
    where: { product: { name: { contains: "Dog Two-leg Clothing" } } },
    select: { size: true, color: true, cjVid: true, variantImage: true },
    take: 10,
  });
  console.log(v);
}

main().catch(console.error).finally(() => prisma.$disconnect());
