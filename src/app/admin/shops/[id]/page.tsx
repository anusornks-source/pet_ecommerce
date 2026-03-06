"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

interface CategoryGroup {
  id: string;
  name: string;
  name_th: string | null;
  icon: string | null;
}

interface Category {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  icon: string | null;
  groupId: string | null;
  group: CategoryGroup | null;
  enabled: boolean;
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
}

export default function EditShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({ name: "", name_th: "", slug: "", description: "", description_th: "", logoUrl: "", coverUrl: "", usePetType: true });
  const [saving, setSaving] = useState(false);
  const [savingCats, setSavingCats] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/shops/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          const s = data.data;
          setShop(s);
          setForm({
            name: s.name,
            name_th: s.name_th ?? "",
            slug: s.slug,
            description: s.description ?? "",
            description_th: s.description_th ?? "",
            logoUrl: s.logoUrl ?? "",
            coverUrl: s.coverUrl ?? "",
            usePetType: s.usePetType,
          });
        }
      });

    fetch(`/api/admin/shops/${id}/categories`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCategories(data.data);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/admin/shops/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
  };

  const toggleCategory = (catId: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const saveCategories = async () => {
    setSavingCats(true);
    const categoryIds = categories.filter((c) => c.enabled).map((c) => c.id);
    await fetch(`/api/admin/shops/${id}/categories`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryIds }),
    });
    setSavingCats(false);
  };

  if (!shop) return <div className="animate-pulse"><div className="h-8 bg-stone-100 rounded w-48 mb-4" /><div className="h-60 bg-stone-100 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/admin/shops")} className="text-stone-400 hover:text-stone-600">
          &larr;
        </button>
        <h1 className="text-2xl font-bold text-stone-800">Edit Shop: {shop.name}</h1>
      </div>

      {/* Shop Details */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="font-semibold text-stone-800 mb-4">Shop Details</h2>
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
            <label className="text-sm font-medium text-stone-600 block mb-1">Slug</label>
            <input className="input w-full" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Logo URL</label>
            <input className="input w-full" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Description (EN)</label>
            <input className="input w-full" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium text-stone-600 block mb-1">Description (TH)</label>
            <input className="input w-full" value={form.description_th} onChange={(e) => setForm({ ...form, description_th: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={form.usePetType} onChange={(e) => setForm({ ...form, usePetType: e.target.checked })} id="usePetType" />
            <label htmlFor="usePetType" className="text-sm text-stone-600">Use Pet Type categories</label>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm mt-4">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {/* Category Assignment */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-800">Categories for this Shop</h2>
          <button onClick={saveCategories} disabled={savingCats} className="btn-primary px-4 py-2 text-sm">
            {savingCats ? "Saving..." : "Save Categories"}
          </button>
        </div>
        <p className="text-sm text-stone-400 mb-3">Select which categories this shop sells. Only checked categories appear in the product form and storefront.</p>
        {(() => {
          // Build grouped structure
          const groupMap = new Map<string | null, { group: CategoryGroup | null; cats: Category[] }>();
          categories.forEach((cat) => {
            const key = cat.groupId ?? null;
            if (!groupMap.has(key)) groupMap.set(key, { group: cat.group, cats: [] });
            groupMap.get(key)!.cats.push(cat);
          });
          // Grouped first, then ungrouped
          const entries = [...groupMap.entries()].sort(([a], [b]) => {
            if (a === null) return 1;
            if (b === null) return -1;
            return 0;
          });
          return (
            <div className="space-y-4">
              {entries.map(([key, { group, cats }]) => (
                <div key={key ?? "ungrouped"}>
                  {group && (
                    <div className="text-xs font-semibold text-violet-600 mb-1.5 px-1">
                      {group.icon} {group.name_th || group.name}
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {cats.map((cat) => (
                      <label key={cat.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${cat.enabled ? "border-orange-300 bg-orange-50" : "border-stone-100 hover:bg-stone-50"}`}>
                        <input type="checkbox" checked={cat.enabled} onChange={() => toggleCategory(cat.id)} className="accent-orange-500" />
                        <span className="text-sm">
                          {cat.icon} {cat.name}
                          {cat.name_th && <span className="text-stone-400 ml-1">({cat.name_th})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Content quick links */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h2 className="font-semibold text-stone-800 mb-1">จัดการคอนเทนต์ร้าน</h2>
        <p className="text-sm text-stone-400 mb-4">คลิกเพื่อไปจัดการคอนเทนต์ของร้านนี้ — ระบบจะกรองให้อัตโนมัติตามร้านที่เลือก</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { icon: "🖼️", label: "Hero Banner", sub: "สไลด์หน้าแรก", href: "/admin/banners" },
            { icon: "🛍️", label: "สินค้า", sub: "จัดการสินค้า", href: "/admin/products" },
            { icon: "📚", label: "บทความ", sub: "บทความ / บล็อก", href: "/admin/articles" },
            { icon: "📦", label: "Shelves", sub: "ชั้นวางสินค้า", href: "/admin/shelves" },
            { icon: "🏪", label: "สาขา", sub: "แผนที่สาขา", href: "/admin/stores" },
            { icon: "🎟️", label: "คูปอง", sub: "โค้ดส่วนลด", href: "/admin/coupons" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-100 hover:border-orange-200 hover:bg-orange-50 transition-colors group"
            >
              <span className="text-2xl">{item.icon}</span>
              <div>
                <div className="text-sm font-medium text-stone-700 group-hover:text-orange-600">{item.label}</div>
                <div className="text-xs text-stone-400">{item.sub}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
