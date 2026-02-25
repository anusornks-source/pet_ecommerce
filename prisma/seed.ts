import { PrismaClient, PetType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting seed...");

  // Categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "dogs" },
      update: {},
      create: { name: "สุนัข", slug: "dogs", icon: "🐕" },
    }),
    prisma.category.upsert({
      where: { slug: "cats" },
      update: {},
      create: { name: "แมว", slug: "cats", icon: "🐈" },
    }),
    prisma.category.upsert({
      where: { slug: "food" },
      update: {},
      create: { name: "อาหาร", slug: "food", icon: "🍖" },
    }),
    prisma.category.upsert({
      where: { slug: "toys" },
      update: {},
      create: { name: "ของเล่น", slug: "toys", icon: "🎾" },
    }),
    prisma.category.upsert({
      where: { slug: "accessories" },
      update: {},
      create: { name: "อุปกรณ์", slug: "accessories", icon: "🎀" },
    }),
    prisma.category.upsert({
      where: { slug: "birds" },
      update: {},
      create: { name: "นก", slug: "birds", icon: "🐦" },
    }),
  ]);

  console.log("✅ Categories created");

  const [dogs, cats, food, toys, accessories] = categories;

  // Products
  const products = [
    {
      name: "โกลเด้น รีทรีฟเวอร์",
      description:
        "สุนัขพันธุ์โกลเด้น รีทรีฟเวอร์ น่ารัก เชื่อง เหมาะกับครอบครัว อายุ 3 เดือน วัคซีนครบ",
      price: 15000,
      stock: 3,
      images: [
        "https://images.unsplash.com/photo-1552053831-71594a27632d?w=500",
        "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500",
      ],
      categoryId: dogs.id,
      petType: PetType.DOG,
      featured: true,
    },
    {
      name: "ปอมเมอเรเนียน",
      description:
        "สุนัขพันธุ์ปอมเมอเรเนียน ขนฟู น่ารัก ขนาดเล็ก เลี้ยงง่าย อายุ 2 เดือน",
      price: 12000,
      stock: 5,
      images: [
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500",
      ],
      categoryId: dogs.id,
      petType: PetType.DOG,
      featured: true,
    },
    {
      name: "เปอร์เซีย",
      description:
        "แมวพันธุ์เปอร์เซีย ขนยาว สีขาว หน้าแบน น่ารัก อายุ 4 เดือน",
      price: 8000,
      stock: 4,
      images: [
        "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=500",
      ],
      categoryId: cats.id,
      petType: PetType.CAT,
      featured: true,
    },
    {
      name: "สกอตติช โฟลด์",
      description: "แมวพันธุ์สกอตติช โฟลด์ หูพับ น่ารักมาก อายุ 3 เดือน",
      price: 10000,
      stock: 2,
      images: [
        "https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=500",
      ],
      categoryId: cats.id,
      petType: PetType.CAT,
      featured: false,
    },
    {
      name: "อาหารสุนัข Royal Canin (3kg)",
      description:
        "อาหารสุนัขคุณภาพสูง Royal Canin สูตรสุนัขโตทั่วไป บำรุงขน และกระดูก ขนาด 3kg",
      price: 890,
      stock: 50,
      images: [
        "https://images.unsplash.com/photo-1568640347023-a616a30bc3bd?w=500",
      ],
      categoryId: food.id,
      petType: PetType.DOG,
      featured: false,
    },
    {
      name: "อาหารแมว Whiskas (1.2kg)",
      description:
        "อาหารแมว Whiskas รสปลาทูน่า บำรุงสุขภาพ ขนสวย เงางาม ขนาด 1.2kg",
      price: 320,
      stock: 80,
      images: [
        "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=500",
      ],
      categoryId: food.id,
      petType: PetType.CAT,
      featured: false,
    },
    {
      name: "ลูกบอลยางสำหรับสุนัข",
      description:
        "ลูกบอลยางธรรมชาติ ทนทาน ปลอดภัย เหมาะสำหรับสุนัขทุกขนาด มีหลายสี",
      price: 150,
      stock: 100,
      images: [
        "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=500",
      ],
      categoryId: toys.id,
      petType: PetType.DOG,
      featured: false,
    },
    {
      name: "เสาลับเล็บแมว",
      description: "เสาลับเล็บแมว หุ้มเชือกปอ ทนทาน ฐานมั่นคง สูง 60cm",
      price: 450,
      stock: 30,
      images: [
        "https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=500",
      ],
      categoryId: toys.id,
      petType: PetType.CAT,
      featured: false,
    },
    {
      name: "สายจูงสุนัขพร้อมสายรัดอก",
      description:
        "ชุดสายจูงพร้อมสายรัดอก วัสดุไนลอน คุณภาพสูง ปรับขนาดได้ เหมาะสุนัขกลาง-ใหญ่",
      price: 380,
      stock: 45,
      images: [
        "https://images.unsplash.com/photo-1601758174493-45d0a4d3e407?w=500",
      ],
      categoryId: accessories.id,
      petType: PetType.DOG,
      featured: true,
    },
    {
      name: "ที่นอนสุนัข/แมว ขนนุ่ม",
      description:
        "ที่นอนสัตว์เลี้ยง วัสดุขนนุ่ม นุ่มสบาย ซักทำความสะอาดได้ ขนาด 60x60cm",
      price: 590,
      stock: 25,
      images: [
        "https://images.unsplash.com/photo-1526336179256-1347bdb255ee?w=500",
      ],
      categoryId: accessories.id,
      petType: undefined,
      featured: false,
    },
    {
      name: "อาหารสุนัข Pedigree (5kg)",
      description:
        "อาหารสุนัข Pedigree สูตรเนื้อวัวและผัก บำรุงร่างกาย ราคาประหยัด ขนาด 5kg",
      price: 650,
      stock: 60,
      images: [
        "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500",
      ],
      categoryId: food.id,
      petType: PetType.DOG,
      featured: false,
    },
    {
      name: "ของเล่นแมว ไม้ตกแมว",
      description: "ไม้ตกแมว ปลายมีขนนกสีสันสวยงาม กระตุ้นการเล่นสัตว์เลี้ยง",
      price: 120,
      stock: 70,
      images: [
        "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=500",
      ],
      categoryId: toys.id,
      petType: PetType.CAT,
      featured: false,
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  console.log("✅ Products created");

  // Admin user
  const hashedPassword = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@petshop.com" },
    update: {},
    create: {
      email: "admin@petshop.com",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  // Demo user
  const demoPassword = await bcrypt.hash("demo1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@petshop.com" },
    update: {},
    create: {
      email: "demo@petshop.com",
      password: demoPassword,
      name: "Demo User",
      phone: "081-234-5678",
      address: "123 ถนนสุขุมวิท แขวงคลองตัน เขตคลองเตย กรุงเทพฯ 10110",
    },
  });

  console.log("✅ Users created");
  console.log("🎉 Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
