"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const empty = {
  code: "", type: "PERCENT" as "PERCENT" | "FIXED", value: "", minOrder: "", maxUses: "",
  active: true, expiresAt: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/coupons");
    const data = await res.json();
    if (data.success) setCoupons(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(empty); setEditId(null); setShowForm(true); };
  const openEdit = (c: Coupon) => {
    setForm({
      code: c.code, type: c.type, value: String(c.value),
      minOrder: c.minOrder ? String(c.minOrder) : "",
      maxUses: c.maxUses ? String(c.maxUses) : "",
      active: c.active,
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    });
    setEditId(c.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.value) { toast.error("กรุณากรอกโค้ดและมูลค่า"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/coupons/${editId}` : "/api/admin/coupons";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error ?? "เกิดข้อผิดพลาด"); return; }
      toast.success(editId ? "แก้ไขสำเร็จ" : "สร้างคูปองสำเร็จ");
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`ลบคูปอง "${code}" ?`)) return;
    const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบสำเร็จ"); load(); }
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.active }),
    });
    load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">คูปองส่วนลด</h1>
        <button onClick={openCreate} className="btn-primary px-4 py-2 text-sm">
          + สร้างคูปอง
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">{editId ? "แก้ไขคูปอง" : "สร้างคูปองใหม่"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">โค้ด *</label>
              <input className="input uppercase" placeholder="เช่น SAVE10" value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">ประเภท *</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as "PERCENT" | "FIXED" }))}>
                <option value="PERCENT">% ส่วนลด</option>
                <option value="FIXED">ลดตายตัว (฿)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">
                มูลค่า * {form.type === "PERCENT" ? "(%)" : "(฿)"}
              </label>
              <input className="input" type="number" min="0" placeholder={form.type === "PERCENT" ? "10" : "50"}
                value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">ยอดขั้นต่ำ (฿)</label>
              <input className="input" type="number" min="0" placeholder="ไม่จำกัด"
                value={form.minOrder} onChange={e => setForm(f => ({ ...f, minOrder: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">จำนวนครั้งสูงสุด</label>
              <input className="input" type="number" min="1" placeholder="ไม่จำกัด"
                value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">หมดอายุ</label>
              <input className="input" type="date" value={form.expiresAt}
                onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              เปิดใช้งาน
            </label>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2 text-sm">
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline px-5 py-2 text-sm">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-stone-400">กำลังโหลด...</div>
        ) : coupons.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <div className="text-5xl mb-3">🎟️</div>
            <p>ยังไม่มีคูปอง</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                {["โค้ด", "ประเภท", "มูลค่า", "ขั้นต่ำ", "การใช้งาน", "หมดอายุ", "สถานะ", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-stone-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {coupons.map(c => (
                <tr key={c.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3 font-mono font-bold text-orange-600">{c.code}</td>
                  <td className="px-4 py-3">{c.type === "PERCENT" ? "เปอร์เซ็นต์" : "ตายตัว"}</td>
                  <td className="px-4 py-3">{c.type === "PERCENT" ? `${c.value}%` : formatPrice(c.value)}</td>
                  <td className="px-4 py-3">{c.minOrder ? formatPrice(c.minOrder) : "—"}</td>
                  <td className="px-4 py-3">
                    {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""} ครั้ง
                  </td>
                  <td className="px-4 py-3">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("th-TH") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                      {c.active ? "เปิด" : "ปิด"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="text-xs text-blue-500 hover:underline">แก้ไข</button>
                      <button onClick={() => handleDelete(c.id, c.code)} className="text-xs text-red-400 hover:underline">ลบ</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
