import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import ProductsClient from "./products/ProductsClient";
import type { Lang } from "@/lib/translations";
import { pickLang } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get("lang")?.value === "en" ? "en" : "th";
  const shops = await prisma.shop.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      name_th: true,
      slug: true,
      logoUrl: true,
      description: true,
      description_th: true,
      usePetType: true,
    },
  });

  const p = (th: string | null | undefined, en: string | null | undefined) =>
    pickLang(th, en, lang);

  const settings = await getSettings();

  const platformName = "CartNova";
  const heroTitle =
    settings.homeHeroTitle ||
    (lang === "th" ? "CartNova — ตะกร้ากลางสำหรับหลายร้าน" : "CartNova — Multi-shop Cart Platform");
  const heroSubtitle =
    settings.homeHeroSubtitle ||
    (lang === "th"
      ? "แพลตฟอร์มตะกร้ากลางที่รวมหลายร้านไว้ในที่เดียว เลือกร้านที่ใช่ แล้วช้อปสินค้าจากทุกมุม"
      : "A central cart platform connecting multiple shops in one place.");

  return (
    <div className="bg-stone-50 min-h-screen">
      {/* Hero / CartNova brand */}
      <section className="bg-stone-900 text-white">
        {settings.heroImageUrl ? (
          // ถ้ามี hero banner ใน settings ให้แสดงรูปเต็ม และ overlay ข้อความ + ปุ่มทับบนรูป
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.heroImageUrl}
              alt="CartNova hero"
              className="block w-full h-auto max-h-[520px] object-cover"
            />
            <div className="absolute inset-0">
              <div className="max-w-6xl mx-auto h-full flex items-center px-4">
                <div className="bg-black/45 backdrop-blur-sm rounded-3xl p-5 md:p-7 max-w-lg">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/20 text-xs text-stone-200 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{lang === "th" ? "แพลตฟอร์มรวมร้านค้า" : "Multi-shop ecommerce hub"}</span>
                  </div>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                    {heroTitle}
                  </h1>
                  <p className="mt-2 text-xs md:text-sm text-stone-200">
                    {heroSubtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href="#shops"
                      className="px-4 md:px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-xs md:text-sm font-semibold text-white shadow-sm transition-colors"
                    >
                      {lang === "th" ? "เลือกร้านค้า" : "Browse shops"}
                    </Link>
                    <Link
                      href="#all-products"
                      className="px-4 md:px-5 py-2.5 rounded-xl bg-black/40 hover:bg-black/60 text-xs md:text-sm font-semibold text-stone-100 border border-white/20 transition-colors"
                    >
                      {lang === "th" ? "ดูสินค้าทั้งหมด" : "View all products"}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-800 border border-stone-700 text-xs text-stone-300 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{lang === "th" ? "แพลตฟอร์มรวมร้านค้า" : "Multi-shop ecommerce hub"}</span>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
                {heroTitle}
              </h1>
              <p className="mt-3 text-sm md:text-base text-stone-300 max-w-xl">
                {heroSubtitle}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="#shops"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-sm font-semibold text-white shadow-sm transition-colors"
                >
                  {lang === "th" ? "เลือกร้านค้า" : "Browse shops"}
                </Link>
                <Link
                  href="#all-products"
                  className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-sm font-semibold text-stone-100 border border-stone-700 transition-colors"
                >
                  {lang === "th" ? "ดูสินค้าทั้งหมด" : "View all products"}
                </Link>
              </div>
            </div>
            <div className="flex-1 w-full">
              <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-orange-500 to-amber-400">
                <div className="relative p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/30 flex items-center justify-center text-2xl">
                      🛒
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-orange-100">
                        {lang === "th" ? "ตะกร้ากลาง" : "Cart hub"}
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {lang === "th" ? "ช้อปจากหลายร้านในคราวเดียว" : "Shop from multiple stores at once"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs text-orange-50">
                    <p>• {lang === "th" ? "รวมสินค้าและโปรโมชั่นจากหลายร้าน" : "Aggregate products and promos across shops"}</p>
                    <p>• {lang === "th" ? "ตะกร้าเดียว จ่ายครั้งเดียว" : "Single cart, single checkout"}</p>
                    <p>• {lang === "th" ? "ออกแบบมาเพื่อเจ้าของร้านหลาย niche" : "Designed for multi-niche sellers"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Section 1: All Shops */}
      <section id="shops" className="max-w-6xl mx-auto px-4 pt-6 pb-10 md:pt-8 md:pb-14">
        <div className="flex items-baseline justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900">
              {lang === "th" ? "เลือกร้านที่คุณอยากช้อป" : "Choose a shop to explore"}
            </h2>
            <p className="text-sm text-stone-500 mt-1">
              {lang === "th"
                ? `ตอนนี้มี ${shops.length} ร้านบนแพลตฟอร์ม CartNova`
                : `${shops.length} shops currently live on CartNova`}
            </p>
          </div>
        </div>
        {shops.length === 0 ? (
          <div className="text-sm text-stone-400 py-10 text-center">
            {lang === "th" ? "ยังไม่มีร้านที่เปิดให้ช้อป" : "No shops are available yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/${shop.slug}`}
                className="group bg-white rounded-2xl border border-orange-200 shadow-sm hover:bg-orange-50 hover:border-orange-300 hover:shadow-md transition-all p-4 flex gap-3"
              >
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-stone-100 flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                  {shop.logoUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={shop.logoUrl} alt={shop.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🏬</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-stone-900 group-hover:text-orange-600 truncate">
                    {p(shop.name_th, shop.name)}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 line-clamp-3">
                    {shop.description_th || shop.description || (lang === "th" ? "ร้านค้าบนแพลตฟอร์ม CartNova" : "Shop on CartNova")}
                  </p>
                  <p className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-orange-500 group-hover:bg-orange-600 transition-colors shadow-sm">
                    {lang === "th" ? "เข้าร้าน →" : "Enter shop →"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: All Products */}
      <section id="all-products" className="border-t border-stone-200 bg-white/60">
        <ProductsClient
          basePath="/"
          enableShopFilter={false}
          showPetFilter={false}
          title={
            lang === "th"
              ? "สินค้าทั้งหมดบน CartNova"
              : "All products on CartNova"
          }
        />
      </section>
    </div>
  );
}
