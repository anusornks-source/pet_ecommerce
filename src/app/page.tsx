import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: { featured: true, active: true },
    include: { category: true, petType: true },
    orderBy: { createdAt: "desc" },
  });
  return products as unknown as Product[];
}

async function getHighlightProducts() {
  const products = await prisma.product.findMany({
    where: { highlight: true, active: true },
    include: { category: true, petType: true },
    orderBy: { highlightOrder: "asc" },
  });
  return products as unknown as Product[];
}

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
}

async function getPetTypes() {
  return prisma.petType.findMany({ orderBy: { order: "asc" } });
}

async function getSettings() {
  return prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", storeName: "PetShop" },
    update: {},
  });
}

const DEFAULT_HERO_IMAGE = "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400";

export default async function HomePage() {
  const [featuredProducts, highlightProducts, categories, settings, petTypes] = await Promise.all([
    getFeaturedProducts(),
    getHighlightProducts(),
    getCategories(),
    getSettings(),
    getPetTypes(),
  ]);

  const heroImageUrl: string = settings?.heroImageUrl || DEFAULT_HERO_IMAGE;

  const PET_COLORS = [
    { bg: "bg-amber-50", border: "border-amber-200" },
    { bg: "bg-orange-50", border: "border-orange-200" },
    { bg: "bg-sky-50", border: "border-sky-200" },
    { bg: "bg-teal-50", border: "border-teal-200" },
    { bg: "bg-violet-50", border: "border-violet-200" },
    { bg: "bg-pink-50", border: "border-pink-200" },
    { bg: "bg-green-50", border: "border-green-200" },
    { bg: "bg-yellow-50", border: "border-yellow-200" },
  ];

  return (
    <div>
      {/* Hero Section — full-width background image */}
      <section className="relative overflow-hidden h-120 md:h-140">
        {/* Background image */}
        <Image
          src={heroImageUrl}
          alt="Hero"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        {/* Gradient overlay: dark on left for text, fades to transparent on right */}
        <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/30 to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 h-full flex items-center">
          <div className="max-w-lg space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30">
              🎉 ยินดีต้อนรับสู่ PetShop
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-md">
              ทุกสิ่งที่{" "}
              <span className="text-orange-300">น้องรัก</span>
              <br />ต้องการ ที่นี่ครบ!
            </h1>
            <p className="text-white/85 text-lg leading-relaxed">
              คัดสรรสัตว์เลี้ยงคุณภาพ พร้อมอาหาร ของเล่น และอุปกรณ์ครบครัน จัดส่งถึงบ้านทั่วประเทศ
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/products" className="btn-primary px-8 py-3 text-base">
                ช้อปเลย 🛒
              </Link>
              <Link
                href="/products?category=dogs"
                className="bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 transition-colors px-8 py-3 text-base rounded-xl font-medium"
              >
                ดูสัตว์เลี้ยง
              </Link>
            </div>
            <div className="flex items-center gap-6 text-sm text-white/80">
              <div className="flex items-center gap-1.5">✅ สินค้าคุณภาพ</div>
              <div className="flex items-center gap-1.5">🚚 จัดส่งทั่วไทย</div>
              <div className="flex items-center gap-1.5">💬 ดูแลหลังขาย</div>
            </div>
          </div>
        </div>

        {/* Floating badges */}
        <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center gap-2 z-10">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="text-xs text-stone-500">ความพึงพอใจ</p>
            <p className="font-bold text-stone-800">4.9/5.0</p>
          </div>
        </div>
        <div className="absolute top-6 right-6 bg-orange-500/90 backdrop-blur-sm text-white rounded-2xl shadow-lg p-3 z-10 text-center">
          <p className="text-xs font-medium">สินค้ามากกว่า</p>
          <p className="text-2xl font-bold">500+</p>
          <p className="text-xs">รายการ</p>
        </div>
      </section>

      {/* Pet Types */}
      {petTypes.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">เลือกตามประเภทสัตว์เลี้ยง</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {petTypes.map((pt, i) => {
              const color = PET_COLORS[i % PET_COLORS.length];
              return (
                <Link
                  key={pt.slug}
                  href={`/products?petType=${pt.slug}`}
                  className={`${color.bg} ${color.border} border-2 rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer`}
                >
                  <span className="text-5xl">{pt.icon}</span>
                  <span className="font-semibold text-stone-700">{pt.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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

      {/* Highlight Shelf */}
      {highlightProducts.length > 0 && (
        <section className="py-12 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-400">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
                  ✨ คัดสรรพิเศษ
                </span>
                <h2 className="text-2xl font-bold text-white">สินค้ายอดนิยม</h2>
              </div>
              <Link
                href="/products?highlight=true"
                className="text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {highlightProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-800">สินค้าแนะนำ ⭐</h2>
          <Link href="/products?featured=true" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            ดูทั้งหมด →
          </Link>
        </div>
        {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
