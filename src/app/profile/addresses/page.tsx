"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { Address } from "@/types";
import ThaiAddressInput from "@/components/ThaiAddressInput";

const LABEL_OPTIONS = ["บ้าน", "ที่ทำงาน", "อื่นๆ"];

const emptyForm = { label: "บ้าน", name: "", phone: "", address: "", city: "", province: "", zipCode: "", isDefault: false };

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [user, authLoading, router]);

  const loadAddresses = async () => {
    const res = await fetch("/api/addresses");
    const data = await res.json();
    if (data.success) setAddresses(data.data);
    setLoading(false);
  };

  useEffect(() => { if (user) loadAddresses(); }, [user]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (addr: Address) => {
    setEditId(addr.id);
    setForm({ label: addr.label, name: addr.name, phone: addr.phone, address: addr.address, city: addr.city || "", province: addr.province || "", zipCode: addr.zipCode || "", isDefault: addr.isDefault });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.address.trim() || !form.city.trim() || !form.province.trim() || !form.zipCode.trim()) {
      toast.error("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    setSaving(true);
    try {
      const url = editId ? `/api/addresses/${editId}` : "/api/addresses";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) { toast.error(data.error ?? "เกิดข้อผิดพลาด"); return; }
      toast.success(editId ? "แก้ไขที่อยู่แล้ว" : "เพิ่มที่อยู่แล้ว");
      setShowForm(false);
      loadAddresses();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบที่อยู่นี้?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    const data = await res.json();
    setDeletingId(null);
    if (data.success) { toast.success("ลบที่อยู่แล้ว"); loadAddresses(); }
    else toast.error(data.error ?? "เกิดข้อผิดพลาด");
  };

  const handleSetDefault = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}/default`, { method: "PATCH" });
    const data = await res.json();
    if (data.success) { toast.success("ตั้งเป็นที่อยู่หลักแล้ว"); loadAddresses(); }
    else toast.error(data.error ?? "เกิดข้อผิดพลาด");
  };

  if (authLoading || loading) {
    return <div className="max-w-2xl mx-auto px-4 py-20 text-center text-stone-400">กำลังโหลด...</div>;
  }

  const inputCls = "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">📍 ที่อยู่จัดส่ง</h1>
          <p className="text-sm text-stone-500 mt-0.5">บันทึกที่อยู่ที่ใช้บ่อยเพื่อความสะดวกในการสั่งซื้อ</p>
        </div>
        <button onClick={openAdd} className="btn-primary px-4 py-2 text-sm">+ เพิ่มที่อยู่</button>
      </div>

      {/* Address List */}
      {addresses.length === 0 && !showForm ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-medium">ยังไม่มีที่อยู่ที่บันทึก</p>
          <button onClick={openAdd} className="mt-4 btn-primary px-6 py-2 text-sm">เพิ่มที่อยู่แรก</button>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl border-2 p-5 transition-colors ${addr.isDefault ? "border-orange-400" : "border-stone-100"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{addr.label}</span>
                    {addr.isDefault && (
                      <span className="text-xs font-semibold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⭐ ที่อยู่หลัก</span>
                    )}
                  </div>
                  <p className="font-semibold text-stone-800">{addr.name}</p>
                  <p className="text-sm text-stone-500">{addr.phone}</p>
                  <p className="text-sm text-stone-600 mt-1 leading-relaxed">{addr.address}</p>
                  {(addr.city || addr.province || addr.zipCode) && (
                    <p className="text-sm text-stone-500">{[addr.city, addr.province, addr.zipCode].filter(Boolean).join(" ")}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => openEdit(addr)} className="text-xs text-orange-500 hover:text-orange-600 font-medium px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-colors">แก้ไข</button>
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-stone-500 hover:text-stone-700 font-medium px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">ตั้งหลัก</button>
                  )}
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    className="text-xs text-red-400 hover:text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {deletingId === addr.id ? "..." : "ลบ"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-orange-300 p-6 space-y-4">
          <h2 className="font-bold text-stone-800">{editId ? "แก้ไขที่อยู่" : "เพิ่มที่อยู่ใหม่"}</h2>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">ประเภท</label>
            <div className="flex gap-2">
              {LABEL_OPTIONS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, label: l }))}
                  className={`px-4 py-1.5 rounded-xl text-sm font-medium border-2 transition-colors ${form.label === l ? "border-orange-500 bg-orange-50 text-orange-600" : "border-stone-200 text-stone-600 hover:border-orange-300"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อผู้รับ *</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ชื่อ-นามสกุล" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">เบอร์โทร *</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="081-234-5678" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">ที่อยู่ (บ้านเลขที่ / ถนน / แขวง) *</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="เช่น 123/4 ถนนสุขุมวิท แขวงคลองเตย"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">เขต/อำเภอ * <span className="text-stone-400 font-normal text-xs">(พิมพ์เพื่อค้นหา)</span></label>
            <ThaiAddressInput
              value={form.city}
              onChange={(v) => setForm((f) => ({ ...f, city: v }))}
              onSelect={(addr) => setForm((f) => ({ ...f, city: addr.amphoe, province: addr.province, zipCode: addr.zipcode }))}
              placeholder="พิมพ์แขวง/เขต/จังหวัด หรือรหัสไปรษณีย์"
              className={inputCls}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">จังหวัด *</label>
              <input value={form.province} onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} placeholder="กรุงเทพมหานคร" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">รหัสไปรษณีย์ *</label>
              <input value={form.zipCode} onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value.replace(/\D/g, "") }))} placeholder="10110" maxLength={5} className={inputCls} />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-stone-700">ตั้งเป็นที่อยู่หลัก</span>
          </label>

          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowForm(false)} className="btn-outline px-5 py-2.5 text-sm">ยกเลิก</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-5 py-2.5 text-sm flex-1">
              {saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
