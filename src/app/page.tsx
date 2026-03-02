import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
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

async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
  });
}

async function getPetTypes() {
  return prisma.petType.findMany({ orderBy: { order: "asc" } });
}

async function getActiveBanners() {
  return prisma.heroBanner.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

async function getActiveShelves() {
  const shelves = await prisma.shelf.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    include: {
      items: {
        orderBy: { order: "asc" },
        where: { product: { active: true } },
        include: { product: { include: { category: true, petType: true } } },
      },
    },
  });
  return shelves.filter((s) => s.items.length > 0);
}

export default async function HomePage() {
  const [featuredProducts, categories, petTypes, activeShelves, activeBanners] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getPetTypes(),
    getActiveShelves(),
    getActiveBanners(),
  ]);

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
      <HeroSlider banners={activeBanners} />

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

      {/* Dynamic Product Shelves */}
      {activeShelves.map((shelf) => (
        <section
          key={shelf.id}
          className="py-12"
          style={{ background: `linear-gradient(135deg, ${shelf.color}ee, ${shelf.color}88)` }}
        >
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                {shelf.description && (
                  <span className="inline-flex items-center bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
                    {shelf.description}
                  </span>
                )}
                <h2 className="text-2xl font-bold text-white">{shelf.name}</h2>
              </div>
              <Link
                href={`/products?shelf=${shelf.slug}`}
                className="text-white/80 hover:text-white text-sm font-medium transition-colors"
              >
                ดูทั้งหมด →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {shelf.items.map(({ product }) => (
                <ProductCard key={product.id} product={product as unknown as Product} />
              ))}
            </div>
          </div>
        </section>
      ))}

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
