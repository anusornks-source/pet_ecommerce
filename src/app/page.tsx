import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { featured: true },
    include: { category: true },
    take: 6,
    orderBy: { createdAt: "desc" },
  });
  return products as unknown as Product[];
}

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
}

export default async function HomePage() {
  const [featuredProducts, categories] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
  ]);

  const pets = [
    { emoji: "🐕", label: "สุนัข", slug: "dogs", bg: "bg-amber-50", border: "border-amber-200" },
    { emoji: "🐈", label: "แมว", slug: "cats", bg: "bg-orange-50", border: "border-orange-200" },
    { emoji: "🐦", label: "นก", slug: "birds", bg: "bg-sky-50", border: "border-sky-200" },
    { emoji: "🐠", label: "ปลา", slug: "fish", bg: "bg-teal-50", border: "border-teal-200" },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-medium">
              🎉 ยินดีต้อนรับสู่ PetShop
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-800 leading-tight">
              ทุกสิ่งที่{" "}
              <span className="text-orange-500">น้องรัก</span>
              <br />ต้องการ ที่นี่ครบ!
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed">
              คัดสรรสัตว์เลี้ยงคุณภาพ พร้อมอาหาร ของเล่น และอุปกรณ์ครบครัน จัดส่งถึงบ้านทั่วประเทศ
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary px-8 py-3 text-base">
                ช้อปเลย 🛒
              </Link>
              <Link href="/products?category=dogs" className="btn-outline px-8 py-3 text-base">
                ดูสัตว์เลี้ยง
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-stone-500">
              <div className="flex items-center gap-1.5">✅ สินค้าคุณภาพ</div>
              <div className="flex items-center gap-1.5">🚚 จัดส่งทั่วไทย</div>
              <div className="flex items-center gap-1.5">💬 ดูแลหลังขาย</div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="relative w-full h-80 md:h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200/40 to-amber-200/40 rounded-3xl" />
              <Image
                src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600"
                alt="Happy pets"
                fill
                className="object-cover rounded-3xl"
                priority
              />
            </div>
            {/* Floating badges */}
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-3 flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-xs text-stone-500">ความพึงพอใจ</p>
                <p className="font-bold text-stone-800">4.9/5.0</p>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-orange-500 text-white rounded-2xl shadow-lg p-3">
              <p className="text-xs font-medium">สินค้ามากกว่า</p>
              <p className="text-2xl font-bold">500+</p>
              <p className="text-xs">รายการ</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pet Types */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-stone-800 mb-6">เลือกตามประเภทสัตว์เลี้ยง</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {pets.map((pet) => (
            <Link
              key={pet.slug}
              href={`/products?petType=${pet.slug.toUpperCase().replace("S", "").replace("H", "")}`}
              className={`${pet.bg} ${pet.border} border-2 rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer`}
            >
              <span className="text-5xl">{pet.emoji}</span>
              <span className="font-semibold text-stone-700">{pet.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="bg-stone-50 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">หมวดหมู่สินค้า</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="bg-white rounded-2xl p-4 text-center hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all group"
              >
                <div className="text-3xl mb-2">{cat.icon}</div>
                <p className="text-sm font-medium text-stone-700 group-hover:text-orange-500">{cat.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {(cat as { _count?: { products: number } })._count?.products || 0} รายการ
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-800">สินค้าแนะนำ ⭐</h2>
          <Link href="/products?featured=true" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            ดูทั้งหมด →
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-400">ยังไม่มีสินค้าแนะนำ</div>
        )}
      </section>

      {/* Promo Banner */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">สมัครสมาชิกวันนี้</h3>
            <p className="text-orange-100">รับส่วนลดพิเศษสำหรับสมาชิกใหม่ และข่าวสารโปรโมชั่น</p>
          </div>
          <Link
            href="/register"
            className="bg-white text-orange-500 font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors whitespace-nowrap"
          >
            สมัครฟรี →
          </Link>
        </div>
      </section>
    </div>
  );
}
