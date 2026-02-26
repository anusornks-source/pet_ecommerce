import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "สุนัข" },
      update: {},
      create: { name: "สุนัข", slug: "dogs" },
    }),
    prisma.category.upsert({
      where: { name: "แมว" },
      update: {},
      create: { name: "แมว", slug: "cats" },
    }),
    prisma.category.upsert({
      where: { name: "อาหาร" },
      update: {},
      create: { name: "อาหาร", slug: "food" },
    }),
    prisma.category.upsert({
      where: { name: "ของเล่น" },
      update: {},
      create: { name: "ของเล่น", slug: "toys" },
    }),
    prisma.category.upsert({
      where: { name: "อุปกรณ์" },
      update: {},
      create: { name: "อุปกรณ์", slug: "accessories" },
    }),
    prisma.category.upsert({
      where: { name: "นก" },
      update: {},
      create: { name: "นก", slug: "birds" },
    }),
  ]);

  console.log("✅ Categories created");

  // Admin user
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@petshop.com" },
    update: {},
    create: {
      email: "admin@petshop.com",
      password: hashedPassword,
      name: "Admin",
      phone: "0812345678",
      address: "123 Admin St",
      role: Role.ADMIN,
    },
  });

  console.log("✅ Admin user created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
