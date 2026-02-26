"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  _count: { products: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", slug: "", icon: "" });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", slug: "", icon: "" });

  const fetchCategories = async () => {
    const res = await fetch("/api/admin/categories");
    const data = await res.json();
    if (data.success) setCategories(data.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newForm),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("เพิ่มหมวดหมู่แล้ว");
      setNewForm({ name: "", slug: "", icon: "" });
      fetchCategories();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setAdding(false);
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditForm({ name: cat.name, slug: cat.slug, icon: cat.icon || "" });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    const res = await fetch(`/api/admin/categories/${editId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("บันทึกแล้ว");
      setEditId(null);
      fetchCategories();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบหมวดหมู่ "${name}" ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบแล้ว");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">หมวดหมู่</h1>
        <p className="text-stone-500 text-sm mt-1">{categories.length} หมวดหมู่</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Add Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-4">เพิ่มหมวดหมู่ใหม่</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  ชื่อหมวดหมู่
                </label>
                <input
                  required
                  value={newForm.name}
                  onChange={(e) => setNewForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="เช่น อาหารสัตว์"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Slug
                </label>
                <input
                  required
                  value={newForm.slug}
                  onChange={(e) => setNewForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="เช่น pet-food"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  ไอคอน (Emoji)
                </label>
                <input
                  value={newForm.icon}
                  onChange={(e) => setNewForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="🐾"
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </div>
              <button
                type="submit"
                disabled={adding}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
              >
                {adding ? "กำลังเพิ่ม..." : "+ เพิ่มหมวดหมู่"}
              </button>
            </form>
          </div>
        </div>

        {/* Table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            {loading ? (
              <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-4 py-3 text-stone-500 font-medium">หมวดหมู่</th>
                    <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">Slug</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">สินค้า</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {categories.map((cat) =>
                    editId === cat.id ? (
                      <tr key={cat.id} className="bg-orange-50">
                        <td className="px-4 py-2" colSpan={4}>
                          <form onSubmit={handleEdit} className="flex items-center gap-2 flex-wrap">
                            <input
                              value={editForm.icon}
                              onChange={(e) => setEditForm((f) => ({ ...f, icon: e.target.value }))}
                              placeholder="🐾"
                              className="w-14 border border-stone-200 rounded-lg px-2 py-1.5 text-sm text-center"
                            />
                            <input
                              required
                              value={editForm.name}
                              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                              className="flex-1 min-w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                            />
                            <input
                              required
                              value={editForm.slug}
                              onChange={(e) => setEditForm((f) => ({ ...f, slug: e.target.value }))}
                              className="flex-1 min-w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-sm"
                            />
                            <button
                              type="submit"
                              className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditId(null)}
                              className="text-xs px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg"
                            >
                              ยกเลิก
                            </button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={cat.id} className="hover:bg-stone-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="font-medium text-stone-800">{cat.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-400 font-mono text-xs hidden sm:table-cell">
                          {cat.slug}
                        </td>
                        <td className="px-4 py-3 text-right text-stone-500">
                          {cat._count.products}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => startEdit(cat)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                            >
                              แก้ไข
                            </button>
                            <button
                              onClick={() => handleDelete(cat.id, cat.name)}
                              disabled={cat._count.products > 0}
                              title={cat._count.products > 0 ? "มีสินค้าอยู่ในหมวดหมู่นี้" : ""}
                              className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
