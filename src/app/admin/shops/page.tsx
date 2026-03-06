"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Shop {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  logoUrl: string | null;
  active: boolean;
  usePetType: boolean;
  _count: { products: number; orders: number; members: number };
  members: { role: string; user: { id: string; name: string; email: string; phone: string | null; avatar: string | null } }[];
}

export default function ShopsPage() {
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
        <h1 className="text-2xl font-bold text-stone-800">Shops</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary px-4 py-2 text-sm"
        >
          + New Shop
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
          <option value="">สถานะ: ทั้งหมด</option>
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
      <div className="grid gap-4">
        {filteredShops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-2xl border border-stone-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 overflow-hidden">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-stone-400">{shop.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <div className="w-56 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-stone-800">{shop.name}</h3>
                {shop.name_th && <span className="text-sm text-stone-400">({shop.name_th})</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${shop.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                  {shop.active ? "Active" : "Inactive"}
                </span>
                {shop.usePetType && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">🐾 Pet Type</span>
                )}
              </div>
              <a href={`/${shop.slug}`} target="_blank" rel="noopener noreferrer" className="text-sm text-stone-400 hover:text-orange-500 hover:underline transition-colors">/{shop.slug}</a>
              <div className="flex gap-4 mt-1 text-xs text-stone-400">
                <span>{shop._count.products} products</span>
                <span>{shop._count.orders} orders</span>
              </div>
            </div>
            {/* Members — center column */}
            <div className="flex-1 min-w-0">
              {shop.members?.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {shop.members.map((m) => (
                    <div key={m.user.id} className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white font-bold overflow-hidden shrink-0 ${
                          m.role === "OWNER" ? "bg-orange-400" : m.role === "MANAGER" ? "bg-blue-400" : "bg-stone-400"
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {m.user.avatar ? (
                          <img src={m.user.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          m.user.name[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-stone-700 font-medium truncate">{m.user.name}</span>
                          <span className={`text-xs font-medium shrink-0 ${m.role === "OWNER" ? "text-orange-500" : m.role === "MANAGER" ? "text-blue-500" : "text-stone-400"}`}>
                            {m.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-stone-400 truncate">{m.user.email}</span>
                          {m.user.phone && <span className="text-xs text-stone-400 shrink-0">{m.user.phone}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-stone-300">ยังไม่มีสมาชิก</span>
              )}
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href={`/admin/shops/${shop.id}`} className="btn-outline px-3 py-1.5 text-xs">
                Edit
              </Link>
              <button
                onClick={() => handleToggleActive(shop)}
                className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-500"
              >
                {shop.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
