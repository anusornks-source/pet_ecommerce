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
}

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", name_th: "", slug: "", description: "", usePetType: true });
  const [saving, setSaving] = useState(false);

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
      setForm({ name: "", name_th: "", slug: "", description: "", usePetType: true });
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

      <div className="grid gap-4">
        {shops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-2xl border border-stone-100 p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-2xl shrink-0">
              {shop.logoUrl ? (
                <img src={shop.logoUrl} alt="" className="w-full h-full rounded-xl object-cover" />
              ) : (
                "🏪"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-800">{shop.name}</h3>
                {shop.name_th && <span className="text-sm text-stone-400">({shop.name_th})</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full ${shop.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                  {shop.active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-sm text-stone-500">/{shop.slug}</p>
              <div className="flex gap-4 mt-1 text-xs text-stone-400">
                <span>{shop._count.products} products</span>
                <span>{shop._count.orders} orders</span>
                <span>{shop._count.members} members</span>
              </div>
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
