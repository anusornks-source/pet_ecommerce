"use client";

import { useEffect, useState, useCallback } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";
import Image from "next/image";

interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string; name: string; name_th: string | null; price: number; normalPrice: number | null;
    images: string[]; shopId: string; source: string | null; fulfillmentMethod: string;
    cjProductId: string | null;
  };
  variant: {
    id: string; size: string | null; color: string | null; price: number;
    sku: string | null; variantImage: string | null; fulfillmentMethod: string | null;
    cjVid: string | null;
  } | null;
}

interface AbandonedCart {
  id: string;
  updatedAt: string;
  cartValue: number;
  itemCount: number;
  ageDays: number;
  user: { id: string; name: string; email: string; phone: string | null; avatar: string | null };
  items: CartItem[];
}

interface Stats {
  totalCarts: number;
  totalValue: number;
  totalItems: number;
  avgAgeDays: number;
}

const DAY_FILTERS = [
  { label: "ตอนนี้", value: 0, desc: "ทุกตะกร้าที่มีของ" },
  { label: "1+ วัน", value: 1 },
  { label: "7+ วัน", value: 7 },
  { label: "14+ วัน", value: 14 },
  { label: "30+ วัน", value: 30 },
];


function formatPrice(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function AbandonedCartsPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const [shopFilter, setShopFilter] = useState("");
  const [days, setDays] = useState(0);
  const [page, setPage] = useState(1);
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<Stats>({ totalCarts: 0, totalValue: 0, totalItems: 0, avgAgeDays: 0 });
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(30);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (activeShop?.id && !shopFilter) setShopFilter(activeShop.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop?.id]);

  const load = useCallback(() => {
    setLoading(true);
    const sid = shopFilter || activeShop?.id;
    const qs = new URLSearchParams();
    if (sid) qs.set("shopId", sid);
    if (days > 0) qs.set("days", String(days));
    qs.set("page", String(page));
    fetch(`/api/admin/abandoned-carts?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCarts(d.data);
          setStats(d.stats);
          setTotal(d.total);
          setPageSize(d.pageSize);
        }
      })
      .finally(() => setLoading(false));
  }, [shopFilter, activeShop?.id, days, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [days, shopFilter]);


  const totalPages = Math.ceil(total / pageSize);

  const statCards = [
    { label: "ตะกร้าที่ถูกทิ้ง", value: stats.totalCarts, icon: "🛒", color: "text-red-600", bg: "bg-red-50" },
    { label: "มูลค่ารวม", value: `฿${formatPrice(stats.totalValue)}`, icon: "💰", color: "text-orange-600", bg: "bg-orange-50" },
    { label: "สินค้ารวม", value: `${stats.totalItems} ชิ้น`, icon: "📦", color: "text-blue-600", bg: "bg-blue-50" },
    { label: "อายุเฉลี่ย", value: `${stats.avgAgeDays} วัน`, icon: "⏳", color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">🛒 Abandoned Carts</h1>
          <p className="text-xs text-stone-400 mt-0.5">ตะกร้าที่มีสินค้าแต่ยังไม่สั่งซื้อ</p>
        </div>
        {(isAdmin || shops.length > 1) && (
          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600"
          >
            {isAdmin && <option value="all">ทั้งหมด (ทุกร้าน)</option>}
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {statCards.map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{s.icon}</span>
              <span className="text-xs text-stone-500">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Day Filters */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {DAY_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDays(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              days === f.value
                ? "bg-orange-500 text-white"
                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-stone-400 text-sm py-10 text-center">กำลังโหลด...</div>
      ) : carts.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">ไม่พบตะกร้าที่ถูกทิ้ง</div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 text-xs">
                  <th className="text-left px-4 py-3 font-medium">ลูกค้า</th>
                  <th className="text-center px-3 py-3 font-medium">สินค้า</th>
                  <th className="text-right px-3 py-3 font-medium">มูลค่า</th>
                  <th className="text-right px-4 py-3 font-medium">ทิ้งมาแล้ว</th>
                </tr>
              </thead>
              <tbody>
                {carts.map((c) => (
                  <>
                    <tr
                      key={c.id}
                      onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="border-b border-stone-50 hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {c.user.avatar ? (
                            <Image src={c.user.avatar} alt="" width={32} height={32} className="rounded-full" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs text-stone-500">
                              {c.user.name?.[0] ?? "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-stone-800 text-sm">{c.user.name}</p>
                            <p className="text-xs text-stone-400">{c.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full text-xs font-medium">
                          {c.itemCount} ชิ้น
                        </span>
                      </td>
                      <td className="text-right px-3 py-3 font-semibold text-orange-600">
                        ฿{formatPrice(c.cartValue)}
                      </td>
                      <td className="text-right px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          c.ageDays >= 30 ? "bg-red-100 text-red-600"
                            : c.ageDays >= 7 ? "bg-orange-100 text-orange-600"
                            : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {c.ageDays} วัน
                        </span>
                      </td>
                    </tr>
                    {expanded === c.id && (
                      <tr key={`${c.id}-detail`} className="bg-stone-50/50">
                        <td colSpan={4} className="px-4 py-3">
                          <div className="space-y-2.5">
                            {c.items.map((item) => {
                              const price = item.variant?.price ?? item.product.price;
                              const img = item.variant?.variantImage || item.product.images?.[0];
                              const fm = item.variant?.fulfillmentMethod ?? item.product.fulfillmentMethod;
                              const variantParts = [item.variant?.size, item.variant?.color].filter(Boolean);
                              return (
                                <div key={item.id} className="flex items-center gap-3 text-xs">
                                  <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                                    {img ? (
                                      <Image src={img} alt="" fill className="object-cover" sizes="48px" />
                                    ) : (
                                      <div className="flex items-center justify-center h-full text-stone-300">📦</div>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      {fm === "CJ" && <span className="shrink-0 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 rounded">CJ</span>}
                                      {fm === "SELF" && <span className="shrink-0 text-[9px] font-bold bg-orange-100 text-orange-600 px-1 rounded">SELF</span>}
                                      {fm === "SUPPLIER" && <span className="shrink-0 text-[9px] font-bold bg-purple-100 text-purple-600 px-1 rounded">SUP</span>}
                                      <p className="text-stone-700 truncate font-medium">{item.product.name_th || item.product.name}</p>
                                    </div>
                                    {variantParts.length > 0 && (
                                      <p className="text-stone-400 mt-0.5">
                                        {variantParts.join(" / ")}
                                        {item.variant?.sku && <span className="ml-2 text-stone-300">SKU: {item.variant.sku}</span>}
                                      </p>
                                    )}
                                    {item.product.normalPrice && item.product.normalPrice > price && (
                                      <p className="text-stone-300 line-through mt-0.5">฿{formatPrice(item.product.normalPrice)}</p>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-stone-500">x{item.quantity}</p>
                                    <p className="text-stone-700 font-semibold">฿{formatPrice(price * item.quantity)}</p>
                                    {item.quantity > 1 && (
                                      <p className="text-stone-300 text-[10px]">@฿{formatPrice(price)}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {c.user.phone && (
                            <p className="text-xs text-stone-400 mt-3 pt-2 border-t border-stone-100">โทร: {c.user.phone}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-40 transition-colors"
              >
                ก่อนหน้า
              </button>
              <span className="text-xs text-stone-400">
                หน้า {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-lg text-xs bg-stone-100 text-stone-500 hover:bg-stone-200 disabled:opacity-40 transition-colors"
              >
                ถัดไป
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
