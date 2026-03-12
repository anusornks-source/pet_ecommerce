"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";

interface Shop {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  logoUrl: string | null;
  coverUrl: string | null;
  active: boolean;
  usePetType: boolean;
  _count: { products: number; orders: number; members: number };
  members: { role: string; user: { id: string; name: string; email: string; phone: string | null; avatar: string | null } }[];
}

export default function ShopsPage() {
  const { t } = useLocale();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", name_th: "", slug: "", description: "", usePetType: false});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");

  const fetchShops = () => {
    fetch("/api/admin/shops")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setShops(data.data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchShops(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/shops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setForm({ name: "", name_th: "", slug: "", description: "", usePetType: false});
      setShowForm(false);
      fetchShops();
    }
    setSaving(false);
  };

  const handleToggleActive = async (shop: Shop) => {
    await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !shop.active }),
    });
    fetchShops();
  };

  const filteredShops = shops.filter((s) => {
    const q = search.toLowerCase();
    if (q && !s.name.toLowerCase().includes(q) && !(s.name_th ?? "").toLowerCase().includes(q) && !s.slug.includes(q)) return false;
    if (filterActive && String(s.active) !== filterActive) return false;
    return true;
  });

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-8 bg-stone-100 rounded w-48" /><div className="h-40 bg-stone-100 rounded-2xl" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("shops", "adminPages")}</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 text-sm"
        >
          + {t("newShop", "adminLabels")}
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาร้าน..."
          className="flex-1 min-w-48 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as "" | "true" | "false")}
          className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
          <option value="">{t("statusAll", "adminLabels")}</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        {(search || filterActive) && (
          <button onClick={() => { setSearch(""); setFilterActive(""); }}
            className="text-xs px-3 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50">
            ล้าง
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">Create New Shop</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Name (EN)</label>
              <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Name (TH)</label>
              <input className="input w-full" value={form.name_th} onChange={(e) => setForm({ ...form, name_th: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Slug (URL)</label>
              <input className="input w-full" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="my-shop" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">Description</label>
              <input className="input w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <input type="checkbox" checked={form.usePetType} onChange={(e) => setForm({ ...form, usePetType: e.target.checked })} id="usePetType" />
              <label htmlFor="usePetType" className="text-sm text-stone-600">Use Pet Type categories (disable for non-pet shops)</label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? "Creating..." : "Create Shop"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {filteredShops.length === 0 && (
        <div className="text-center py-16 text-stone-400 text-sm">ไม่พบร้านที่ตรงกับเงื่อนไข</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredShops.map((shop) => {
          const imageUrl = shop.coverUrl || shop.logoUrl;
          const isCover = !!shop.coverUrl;
          return (
            <div key={shop.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm hover:shadow-md hover:border-orange-100 transition-all duration-200 flex flex-col group">
              <Link href={`/admin/shops/${shop.id}/view`} className="block">
                <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-stone-100">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={shop.name}
                      className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${isCover ? "" : "p-6 object-contain"}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-2xl font-bold text-orange-400 font-mono">
                        {shop.name[0]?.toUpperCase()}
                      </div>
                      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgb(120 113 108 / 0.15) 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                    </div>
                  )}
                    </div>
              </Link>
              <div className="p-3 flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <Link href={`/admin/shops/${shop.id}`} className="font-semibold text-stone-800 hover:text-orange-600 transition-colors text-sm truncate">
                    {shop.name}
                  </Link>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium ${shop.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
                    {shop.active ? "Active" : "Inactive"}
                  </span>
                </div>
                <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-stone-500 hover:text-orange-600 truncate block mt-0.5">
                  /{shop.slug}
                </a>
                <div className="flex gap-3 mt-2 text-xs text-stone-400">
                  <span>{shop._count.products} สินค้า</span>
                  <span>{shop._count.orders} ออเดอร์</span>
                </div>
                <div className="flex gap-1.5 mt-3 pt-3 border-t border-stone-100">
                  <Link href={`/admin/shops/${shop.id}/view`} className="inline-flex items-center justify-center btn-primary text-xs px-2 py-1.5 flex-1 min-w-0 rounded-lg">
                    View
                  </Link>
                  <Link href={`/admin/shops/${shop.id}`} className="inline-flex items-center justify-center btn-outline text-xs px-2 py-1.5 flex-1 min-w-0 rounded-lg">
                    Edit
                  </Link>
                  <button
                    onClick={() => handleToggleActive(shop)}
                    className="inline-flex items-center justify-center text-xs px-2 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600 flex-1 min-w-0 transition-colors"
                  >
                    {shop.active ? "ปิด" : "เปิด"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
