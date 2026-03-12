"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Image from "next/image";
import MarketingAssetsSection from "@/components/admin/MarketingAssetsSection";
import { useLocale } from "@/context/LocaleContext";

interface Category {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  icon: string | null;
}

interface Member {
  role: string;
  user: { id: string; name: string; email: string; avatar: string | null };
}

interface ShopDetail {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  description: string | null;
  description_th: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  usePetType: boolean;
  active: boolean;
  settings?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    bgColor?: string | null;
    phone?: string | null;
    lineId?: string | null;
    facebookUrl?: string | null;
    instagramUrl?: string | null;
    tiktokUrl?: string | null;
    announcementText?: string | null;
    announcementEnabled?: boolean;
    shippingFee?: number | null;
    freeShippingMin?: number | null;
  } | null;
  members?: Member[];
  shopCategories?: { category: Category }[];
  _count?: { products: number; orders: number; marketingAssets: number };
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5">
      <h3 className="font-semibold text-stone-800 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-3 py-2 border-b border-stone-50 last:border-0">
      <span className="text-sm text-stone-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-stone-800">{value}</span>
    </div>
  );
}

export default function ShopViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = useLocale();
  const { id } = use(params);
  const [shop, setShop] = useState<ShopDetail | null>(null);

  useEffect(() => {
    fetch(`/api/admin/shops/${id}`)
      .then((r) => r.json())
      .then((d) => d.success && setShop(d.data));
  }, [id]);

  if (!shop) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-stone-100 rounded w-48" />
          <div className="h-48 bg-stone-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  const primaryColor = shop.settings?.primaryColor ?? "#f97316";
  const secondaryColor = shop.settings?.secondaryColor ?? "#f59e0b";
  const categories = shop.shopCategories?.map((sc) => sc.category) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/shops" className="text-stone-400 hover:text-stone-600 text-sm">
          ← รายการร้าน
        </Link>
        <h1 className="text-2xl font-bold text-stone-800 flex-1 min-w-0">{t("shopDetail", "adminPages")}: {shop.name}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/shops/${id}`} className="btn-primary text-sm px-4 py-2 rounded-xl">
            แก้ไขร้าน
          </Link>
          <a
            href={`/${shop.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-stone-600"
          >
            ดูหน้าร้าน →
          </a>
        </div>
      </div>

      {/* Hero */}
      <div
        className="rounded-2xl overflow-hidden border border-stone-100"
        style={{ backgroundColor: primaryColor + "20" }}
      >
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
          <div className="flex flex-col gap-3 shrink-0">
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-lg">
              {shop.logoUrl ? (
                <Image src={shop.logoUrl} alt={shop.name} fill className="object-contain" sizes="96px" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
              )}
            </div>
            {shop.coverUrl && (
              <div className="relative w-48 h-24 rounded-xl overflow-hidden bg-white border border-stone-100">
                <Image src={shop.coverUrl} alt="" fill className="object-cover" sizes="192px" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-stone-800">{shop.name_th ?? shop.name}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ${shop.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                {shop.active ? "Active" : "Inactive"}
              </span>
              {shop.usePetType && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">🐾 Pet Type</span>
              )}
            </div>
            <p className="text-stone-500 text-sm mt-0.5">/{shop.slug}</p>
            {shop._count && (
              <p className="text-sm text-stone-500 mt-2">
                {shop._count.products} สินค้า · {shop._count.orders} ออเดอร์
                {shop._count.marketingAssets != null && (
                  <>
                    {" · "}
                    <a href="#marketing-assets" className="text-orange-500 hover:text-orange-600 hover:underline">
                      {shop._count.marketingAssets} marketing assets
                    </a>
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* ข้อมูลร้าน */}
        <InfoCard title="ข้อมูลร้าน">
          <InfoRow label="ชื่อ (EN)" value={shop.name} />
          <InfoRow label="ชื่อ (TH)" value={shop.name_th} />
          <InfoRow label="Slug" value={`/${shop.slug}`} />
          <InfoRow label="คำอธิบาย (EN)" value={shop.description} />
          <InfoRow label="คำอธิบาย (TH)" value={shop.description_th} />
          {!shop.description && !shop.description_th && (
            <p className="text-sm text-stone-400 py-2">— ไม่มีคำอธิบาย</p>
          )}
        </InfoCard>

        {/* Theme Colors */}
        <InfoCard title="ธีมสี">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg border border-stone-200" style={{ backgroundColor: primaryColor }} />
              <div>
                <p className="text-xs font-medium text-stone-600">Primary</p>
                <p className="text-xs text-stone-400 font-mono">{primaryColor}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg border border-stone-200" style={{ backgroundColor: secondaryColor }} />
              <div>
                <p className="text-xs font-medium text-stone-600">Secondary</p>
                <p className="text-xs text-stone-400 font-mono">{secondaryColor}</p>
              </div>
            </div>
            <div
              className="rounded-xl px-4 py-2 text-white text-sm font-medium"
              style={{ background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})` }}
            >
              Preview
            </div>
          </div>
        </InfoCard>
      </div>

      {/* Contact & Social */}
      <InfoCard title="ติดต่อ & โซเชียล">
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoRow label="📞 เบอร์โทร" value={shop.settings?.phone} />
          <InfoRow label="💬 LINE ID" value={shop.settings?.lineId} />
          <InfoRow label="📘 Facebook" value={shop.settings?.facebookUrl ? <a href={shop.settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[200px]">{shop.settings.facebookUrl}</a> : null} />
          <InfoRow label="📸 Instagram" value={shop.settings?.instagramUrl ? <a href={shop.settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline truncate block max-w-[200px]">{shop.settings.instagramUrl}</a> : null} />
          <InfoRow label="🎵 TikTok" value={shop.settings?.tiktokUrl ? <a href={shop.settings.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:underline truncate block max-w-[200px]">{shop.settings.tiktokUrl}</a> : null} />
        </div>
        {!shop.settings?.phone && !shop.settings?.lineId && !shop.settings?.facebookUrl && !shop.settings?.instagramUrl && !shop.settings?.tiktokUrl && (
          <p className="text-sm text-stone-400 py-2">— ยังไม่ได้ตั้งค่าติดต่อ</p>
        )}
      </InfoCard>

      {/* Announcement Bar */}
      {shop.settings?.announcementEnabled && shop.settings?.announcementText && (
        <InfoCard title="แถบประกาศ">
          <div className="rounded-xl px-4 py-3 text-white text-sm text-center font-medium" style={{ backgroundColor: primaryColor }}>
            {shop.settings.announcementText}
          </div>
        </InfoCard>
      )}

      {/* Shipping */}
      <InfoCard title="ค่าจัดส่ง">
        <p className="text-sm text-stone-700">
          {shop.settings?.shippingFee === 0
            ? `✅ ส่งฟรีทุกออเดอร์`
            : shop.settings?.freeShippingMin && shop.settings.freeShippingMin > 0
            ? `🚚 ค่าจัดส่ง ฿${shop.settings.shippingFee} · ฟรีเมื่อซื้อครบ ฿${shop.settings.freeShippingMin}`
            : `🚚 ค่าจัดส่ง ฿${shop.settings?.shippingFee ?? 0}`}
        </p>
      </InfoCard>

      {/* Categories */}
      {categories.length > 0 && (
        <InfoCard title="หมวดหมู่ที่ขาย">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <span key={cat.id} className="text-xs px-3 py-1.5 rounded-full bg-stone-100 text-stone-700">
                {cat.icon} {cat.name_th ?? cat.name}
              </span>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Members */}
      {shop.members && shop.members.length > 0 && (
        <InfoCard title="สมาชิกร้าน">
          <div className="space-y-3">
            {shop.members.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 py-2 border-b border-stone-50 last:border-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden ${
                    m.role === "OWNER" ? "bg-orange-400" : m.role === "MANAGER" ? "bg-blue-400" : "bg-stone-400"
                  }`}
                >
                  {m.user.avatar ? <img src={m.user.avatar} alt="" className="w-full h-full object-cover" /> : m.user.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-800">{m.user.name}</span>
                    <span className={`text-xs font-medium ${m.role === "OWNER" ? "text-orange-500" : m.role === "MANAGER" ? "text-blue-500" : "text-stone-400"}`}>
                      {m.role}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 truncate">{m.user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}

      {/* Quick Links */}
      <InfoCard title="จัดการคอนเทนต์ร้าน">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: "🖼️", label: "Hero Banner", sub: "สไลด์หน้าแรก", href: `/admin/banners?shopId=${id}` },
            { icon: "🛍️", label: "สินค้า", sub: "จัดการสินค้า", href: `/admin/products?shopId=${id}` },
            { icon: "📚", label: "บทความ", sub: "บทความ / บล็อก", href: `/admin/articles?shopId=${id}` },
            { icon: "📦", label: "Shelves", sub: "ชั้นวางสินค้า", href: `/admin/shelves?shopId=${id}` },
            { icon: "🏪", label: "สาขา", sub: "แผนที่สาขา", href: `/admin/stores?shopId=${id}` },
            { icon: "🎟️", label: "คูปอง", sub: "โค้ดส่วนลด", href: `/admin/coupons?shopId=${id}` },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-stone-700 group-hover:text-orange-600">{item.label}</div>
                <div className="text-xs text-stone-400">{item.sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </InfoCard>

      {/* Marketing Assets */}
      <MarketingAssetsSection shopId={id} count={shop._count?.marketingAssets} />
    </div>
  );
}
