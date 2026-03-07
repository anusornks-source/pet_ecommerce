"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

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
  icon: string | null;
  groupId: string | null;
  group: CategoryGroup | null;
  _count: { products: number };
}

export default function ShopCategoriesPage() {
  const { activeShop } = useShopAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const shopId = activeShop?.id;
    Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/category-groups").then((r) => r.json()),
      fetch("/api/admin/shop-categories").then((r) => r.json()),
      shopId ? fetch(`/api/categories?shopId=${shopId}`).then((r) => r.json()) : Promise.resolve(null),
    ]).then(([catData, grpData, selData, shopCatData]) => {
      if (grpData.success) setGroups(grpData.data);
      if (catData.success) {
        const shopCountMap: Record<string, number> = {};
        if (shopCatData?.success) {
          shopCatData.data.forEach((c: Category) => {
            shopCountMap[c.id] = c._count.products;
          });
        }
        setCategories(catData.data.map((c: Category) => ({
          ...c,
          _count: { products: shopCountMap[c.id] ?? 0 },
        })));
      }
      if (selData.success) setSelected(new Set(selData.data));
      setLoading(false);
    });
  }, [activeShop?.id]);

  const toggle = async (categoryId: string) => {
    const nowSelected = !selected.has(categoryId);
    setBusy(categoryId);
    setSelected((prev) => {
      const next = new Set(prev);
      nowSelected ? next.add(categoryId) : next.delete(categoryId);
      return next;
    });
    const res = await fetch("/api/admin/shop-categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, selected: nowSelected }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error("เกิดข้อผิดพลาด");
      setSelected((prev) => {
        const next = new Set(prev);
        nowSelected ? next.delete(categoryId) : next.add(categoryId);
        return next;
      });
    }
    setBusy(null);
  };

  const grouped: { group: CategoryGroup | null; cats: Category[] }[] = [];
  const ungrouped = categories.filter((c) => !c.groupId);
  groups.forEach((g) => {
    const cats = categories.filter((c) => c.groupId === g.id);
    if (cats.length > 0) grouped.push({ group: g, cats });
  });
  if (ungrouped.length > 0) grouped.push({ group: null, cats: ungrouped });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">หมวดหมู่ของร้าน</h1>
        <p className="text-stone-500 text-sm mt-1">
          เลือกหมวดหมู่ที่ร้านของคุณต้องการใช้
          {!loading && <span className="ml-1 text-orange-500 font-medium">({selected.size} หมวดหมู่ที่เลือก)</span>}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="w-10 px-4 py-3 text-center text-stone-400 font-medium">ใช้</th>
                <th className="text-left px-3 py-3 text-stone-500 font-medium">หมวดหมู่</th>
                <th className="text-left px-3 py-3 text-stone-500 font-medium hidden sm:table-cell">กลุ่ม</th>
                <th className="text-right px-3 py-3 text-stone-500 font-medium">สินค้าในร้าน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {grouped.map(({ group, cats }) => (
                <>
                  {group && (
                    <tr key={`grp-${group.id}`} className="bg-violet-50">
                      <td />
                      <td colSpan={3} className="px-3 py-1.5">
                        <span className="text-xs font-semibold text-violet-600">{group.icon} {group.name_th || group.name}</span>
                      </td>
                    </tr>
                  )}
                  {cats.map((cat) => (
                    <tr key={cat.id} className={`hover:bg-stone-50 transition-colors ${selected.has(cat.id) ? "bg-orange-50/30" : ""}`}>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(cat.id)}
                          disabled={busy === cat.id}
                          onChange={() => toggle(cat.id)}
                          className="w-4 h-4 accent-orange-500 cursor-pointer disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{cat.icon}</span>
                          <div>
                            <div className="font-medium text-stone-800 text-sm">{cat.name}</div>
                            {cat.name_th && <div className="text-xs text-stone-400">{cat.name_th}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell text-xs text-stone-400">
                        {cat.group ? <span>{cat.group.icon} {cat.group.name_th || cat.group.name}</span> : "—"}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-400 text-sm">{cat._count.products}</td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
