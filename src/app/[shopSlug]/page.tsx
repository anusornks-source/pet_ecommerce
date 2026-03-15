import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ProductValidationStatus } from "@/generated/prisma/client";
import ProductCard from "@/components/ProductCard";
import HeroSlider from "@/components/HeroSlider";
import type { Product } from "@/types";
import { pickLang, type Lang } from "@/lib/translations";
import { shopColorCSS } from "@/lib/shopColorCSS";

export const dynamic = "force-dynamic";

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

export default async function ShopPage({
  params,
}: {
  params: Promise<{ shopSlug: string }>;
}) {
  const { shopSlug } = await params;

  const shop = await prisma.shop.findUnique({
    where: { slug: shopSlug, active: true },
    include: {
      settings: {
        select: {
          primaryColor: true, secondaryColor: true, bgColor: true,
          phone: true, lineId: true, facebookUrl: true, instagramUrl: true, tiktokUrl: true,
          announcementText: true, announcementEnabled: true,
          shippingFee: true, freeShippingMin: true,
        },
      },
    },
  });
  if (!shop) notFound();

  const primary = shop.settings?.primaryColor ?? "#f97316";
  const secondary = shop.settings?.secondaryColor ?? "#f59e0b";
  const announcement = shop.settings?.announcementEnabled && shop.settings?.announcementText
    ? shop.settings.announcementText : null;

  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "en" ? "en" : "th";
  const p = (th: string | null | undefined, en: string | null | undefined) =>
    pickLang(th, en, lang);

  const productInclude = {
    category: true,
    petType: true,
    tags: true,
    variants: true,
  } as const;

  const [banners, shelves, categories, petTypes] = await Promise.all([
    prisma.heroBanner.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: { order: "asc" },
    }),
    prisma.shelf.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: { order: "asc" },
          where: { product: { active: true, validationStatus: ProductValidationStatus.Approved } },
          include: {
            product: {
              include: productInclude,
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      where: { products: { some: { shopId: shop.id, active: true } } },
      include: {
        _count: { select: { products: { where: { shopId: shop.id, active: true } } } },
      },
    }),
    shop.usePetType
      ? prisma.petType.findMany({ orderBy: { order: "asc" } })
      : Promise.resolve([]),
  ]);

  // Resolve products per shelf by sourceType
  const shelvesWithProducts = await Promise.all(
    shelves.map(async (shelf) => {
      const limit = Math.min(20, Math.max(1, shelf.limit ?? 8));
      let products: Awaited<ReturnType<typeof prisma.product.findMany>> = [];

      if (shelf.sourceType === "best_seller") {
        const sold = await prisma.orderItem.groupBy({
          by: ["productId"],
          where: { order: { shopId: shop.id } },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: limit,
        });
        const ids = sold.map((r) => r.productId);
        if (ids.length > 0) {
          products = await prisma.product.findMany({
            where: { id: { in: ids }, active: true, validationStatus: ProductValidationStatus.Approved },
            include: productInclude,
          });
          products = ids.map((id) => products.find((p) => p.id === id)!).filter(Boolean);
        }
      } else if (shelf.sourceType === "featured") {
        products = await prisma.product.findMany({
          where: { shopId: shop.id, featured: true, active: true, validationStatus: ProductValidationStatus.Approved },
          include: productInclude,
          orderBy: { createdAt: "desc" },
          take: limit,
        });
      } else {
        products = shelf.items.map((i) => i.product);
      }

      return { ...shelf, resolvedProducts: products };
    })
  );

  const activeShelves = shelvesWithProducts.filter(
    (s) => s.resolvedProducts.length > 0
  );
  const shopFilter = `shopSlug=${shopSlug}`;

  return (
    <div>
      <style>{`
        ${shopColorCSS(primary)}
        .shop-cat-card:hover { background-color: ${primary}18; border-color: ${primary}55; }
        .shop-cat-card:hover .shop-cat-label { color: ${primary}; }
        .shop-view-all { color: ${primary}cc; }
        .shop-view-all:hover { color: ${primary}; }
        .shop-primary-gradient { background: linear-gradient(to right, ${primary}, ${secondary}); }
        .shop-register-btn { color: ${primary}; }
        .shop-register-btn:hover { background-color: ${primary}18; }
      `}</style>
      {announcement && (
        <div className="py-2.5 px-4 text-center text-sm font-medium text-white" style={{ backgroundColor: primary }}>
          {announcement}
        </div>
      )}
      <HeroSlider banners={banners} />

      {/* Pet Types */}
      {petTypes.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-stone-800 mb-6">
            {p("เลือกตามประเภทสัตว์เลี้ยง", "Shop by Pet Type")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {petTypes.map((pt, i) => {
              const color = PET_COLORS[i % PET_COLORS.length];
              return (
                <Link
                  key={pt.slug}
                  href={`/products?${shopFilter}&petType=${pt.slug}`}
                  className={`${color.bg} ${color.border} border-2 rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-transform cursor-pointer`}
                >
                  <span className="text-5xl">{pt.icon}</span>
                  <span className="font-semibold text-stone-700">
                    {p(pt.name_th, pt.name)}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="bg-stone-50 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-stone-800 mb-6">
              {p("หมวดหมู่สินค้า", "Product Categories")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products?${shopFilter}&category=${cat.slug}`}
                  className="shop-cat-card bg-white rounded-2xl p-4 text-center border-2 border-transparent transition-all group"
                >
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <p className="shop-cat-label text-sm font-medium text-stone-700">
                    {p((cat as { name_th?: string | null }).name_th, cat.name)}
                  </p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {(cat as { _count?: { products: number } })._count?.products ?? 0}{" "}
                    {p("รายการ", "items")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Dynamic Shelves (manual, best_seller, featured) */}
      {activeShelves.map((shelf) => {
        const viewAllHref =
          shelf.sourceType === "best_seller"
            ? `/products?${shopFilter}&sort=best_seller`
            : shelf.sourceType === "featured"
              ? `/products?${shopFilter}&featured=true`
              : `/products?${shopFilter}&shelf=${shelf.slug}`;
        return (
          <section
            key={shelf.id}
            className="py-12"
            style={{ background: `linear-gradient(135deg, ${shelf.color}ee, ${shelf.color}88)` }}
          >
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  {(shelf.description_th || shelf.description) && (
                    <span className="inline-flex items-center bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-2">
                      {p(shelf.description_th ?? null, shelf.description ?? null)}
                    </span>
                  )}
                  <h2 className="text-2xl font-bold text-white">{p(shelf.name_th ?? null, shelf.name)}</h2>
                </div>
                <Link
                  href={viewAllHref}
                  className="text-white/80 hover:text-white text-sm font-medium transition-colors"
                >
                  {p("ดูทั้งหมด", "View All")} →
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {shelf.resolvedProducts.map((product) => (
                  <ProductCard key={product.id} product={product as unknown as Product} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      {/* Promo Banner */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="shop-primary-gradient rounded-3xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold mb-2">
              {p("สมัครสมาชิกวันนี้", "Register Today")}
            </h3>
            <p className="text-white/80">
              {p(
                "รับส่วนลดพิเศษสำหรับสมาชิกใหม่ และข่าวสารโปรโมชั่น",
                "Get special discounts for new members and promotions"
              )}
            </p>
          </div>
          <Link
            href="/register"
            className="shop-register-btn bg-white font-bold px-8 py-3 rounded-xl transition-colors whitespace-nowrap"
          >
            {p("สมัครฟรี →", "Register Free →")}
          </Link>
        </div>
      </section>
    </div>
  );
}
