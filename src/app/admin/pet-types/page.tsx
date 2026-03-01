"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";

interface PetType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  order: number;
}

const empty = { name: "", slug: "", icon: "", order: 0 };

export default function AdminPetTypesPage() {
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PetType | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchPetTypes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/pet-types");
    const data = await res.json();
    if (data.success) setPetTypes(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPetTypes(); }, [fetchPetTypes]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, order: petTypes.length });
    setShowForm(true);
  };

  const openEdit = (pt: PetType) => {
    setEditing(pt);
    setForm({ name: pt.name, slug: pt.slug, icon: pt.icon || "", order: pt.order });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/admin/pet-types/${editing.id}` : "/api/admin/pet-types";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order: Number(form.order) }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(editing ? "แก้ไขเรียบร้อย" : "เพิ่มเรียบร้อย");
      setShowForm(false);
      fetchPetTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pt: PetType) => {
    if (!confirm(`ลบ "${pt.name}" ? สินค้าที่ผูกไว้จะถูก unlink`)) return;
    try {
      const res = await fetch(`/api/admin/pet-types/${pt.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("ลบเรียบร้อย");
      fetchPetTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  };

  const autoSlug = (name: string) => {
    const map: Record<string, string> = {
      สุนัข: "dog", แมว: "cat", นก: "bird", ปลา: "fish",
      กระต่าย: "rabbit", อื่นๆ: "other", หนู: "hamster",
      เต่า: "turtle", แมลง: "insect",
    };
    return map[name] || name.toLowerCase().replace(/\s+/g, "-");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ประเภทสัตว์เลี้ยง</h1>
          <p className="text-sm text-stone-500 mt-1">จัดการ pet types ที่ใช้กรองสินค้า</p>
        </div>
        <button onClick={openCreate} className="btn btn-primary">+ เพิ่ม</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">กำลังโหลด...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-500">ลำดับ</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">ไอคอน</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">ชื่อ</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Slug</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {petTypes.map((pt) => (
                <tr key={pt.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                  <td className="px-4 py-3 text-stone-400">{pt.order}</td>
                  <td className="px-4 py-3 text-xl">{pt.icon || "—"}</td>
                  <td className="px-4 py-3 font-medium text-stone-800">{pt.name}</td>
                  <td className="px-4 py-3 font-mono text-stone-500">{pt.slug}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(pt)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(pt)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-500"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {petTypes.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-stone-400">ยังไม่มีข้อมูล</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h2 className="text-lg font-bold text-stone-800 mb-4">
              {editing ? "แก้ไขประเภทสัตว์" : "เพิ่มประเภทสัตว์"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">ชื่อ (ภาษาไทย)</label>
                <input
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((f) => ({ ...f, name, slug: editing ? f.slug : autoSlug(name) }));
                  }}
                  placeholder="เช่น สุนัข"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">Slug</label>
                <input
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="dog"
                  required
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-600 mb-1">ไอคอน (emoji)</label>
                  <input
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={form.icon}
                    onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                    placeholder="🐕"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-stone-600 mb-1">ลำดับ</label>
                  <input
                    type="number"
                    className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 border border-stone-200 rounded-xl py-2 text-sm text-stone-600 hover:bg-stone-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-60"
                >
                  {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
