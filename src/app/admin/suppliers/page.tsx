"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Supplier {
  id: string;
  name: string;
  nameTh: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  _count: { products: number };
}

const emptyForm = { name: "", nameTh: "", contact: "", website: "", note: "" };

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const loadSuppliers = () => {
    fetch("/api/admin/suppliers")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSuppliers(d.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อ");
      return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/suppliers/${editId}` : "/api/admin/suppliers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameTh: form.nameTh.trim() || null,
          contact: form.contact.trim() || null,
          website: form.website.trim() || null,
          note: form.note.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "อัปเดตแล้ว" : "สร้างซัพพลายเออร์แล้ว");
        setForm(emptyForm);
        setEditId(null);
        setShowForm(false);
        loadSuppliers();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบซัพพลายเออร์นี้?")) return;
    const res = await fetch(`/api/admin/suppliers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบแล้ว");
      loadSuppliers();
    } else {
      toast.error(data.error || "ลบไม่สำเร็จ");
    }
  };

  const startEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      nameTh: s.nameTh ?? "",
      contact: s.contact ?? "",
      website: s.website ?? "",
      note: s.note ?? "",
    });
    setEditId(s.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ซัพพลายเออร์</h1>
          <p className="text-sm text-stone-500 mt-1">
            จัดการแหล่งซื้อสินค้า และ map สินค้ากับซัพพลายเออร์
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm);
            setEditId(null);
            setShowForm(!showForm);
          }}
          className="text-sm bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มซัพพลายเออร์"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-bold text-stone-800">
            {editId ? "แก้ไขซัพพลายเออร์" : "เพิ่มซัพพลายเออร์"}
          </h2>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">ชื่อ *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="เช่น CJ Dropshipping, AliExpress"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">ชื่อ (ไทย)</label>
            <input
              value={form.nameTh}
              onChange={(e) => setForm((f) => ({ ...f, nameTh: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="ชื่อภาษาไทย"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">ติดต่อ / ข้อมูล</label>
            <textarea
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
              placeholder="เบอร์โทร, อีเมล, ลิงก์"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">เว็บไซต์</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">หมายเหตุ</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
              placeholder="หมายเหตุเพิ่มเติม"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:bg-stone-300 text-white text-sm font-medium"
            >
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
              className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-sm"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">กำลังโหลด...</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-100">
          <div className="text-4xl mb-3">🏭</div>
          <p className="text-stone-500">ยังไม่มีซัพพลายเออร์</p>
          <p className="text-sm text-stone-400 mt-1">กด &quot;เพิ่มซัพพลายเออร์&quot; เพื่อเริ่มต้น</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white border border-stone-200 rounded-xl p-4 flex items-center justify-between hover:border-stone-300 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-stone-800">{s.name}</span>
                  {s.nameTh && (
                    <span className="text-sm text-stone-500">({s.nameTh})</span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-0.5">
                  {s._count.products} สินค้า
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/admin/suppliers/${s.id}`}
                  className="text-sm px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 font-medium"
                >
                  จัดการสินค้า
                </Link>
                <button
                  onClick={() => startEdit(s)}
                  className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-sm px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
