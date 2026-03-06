"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

const StoresMap = dynamic(() => import("@/app/stores/StoresMap"), { ssr: false });

interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  openHours: string;
  image: string | null;
  remark: string | null;
  lat: number;
  lng: number;
}

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  openHours: "",
  image: "",
  remark: "",
  lat: "",
  lng: "",
};

export default function AdminStoresPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const [shopFilter, setShopFilter] = useState<string>("");
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStores = useCallback(() => {
    setLoading(true);
    const url = shopFilter ? `/api/admin/stores?shopId=${shopFilter}` : "/api/admin/stores";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setStores(d.data); })
      .finally(() => setLoading(false));
  }, [shopFilter]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const startEdit = (store: Store) => {
    setEditId(store.id);
    setForm({
      name: store.name,
      address: store.address,
      phone: store.phone,
      openHours: store.openHours,
      image: store.image ?? "",
      remark: store.remark ?? "",
      lat: String(store.lat),
      lng: String(store.lng),
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, image: data.url }));
      toast.success("อัปโหลดสำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      ...(!editId && activeShop && { shopId: activeShop.id }),
    };

    const url = editId ? `/api/admin/stores/${editId}` : "/api/admin/stores";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(editId ? "บันทึกแล้ว" : "เพิ่มสาขาแล้ว");
      cancelEdit();
      fetchStores();
    } else {
      toast.error(data.error ?? "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบสาขา "${name}" ใช่ไหม?`)) return;
    const res = await fetch(`/api/admin/stores/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบสาขาแล้ว");
      fetchStores();
    } else {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const inputCls = "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">จัดการสาขา</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-stone-500">{stores.length} สาขา</p>
            {isAdmin ? (
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600"
              >
                <option value="">ร้าน: {activeShop?.name ?? "..."}</option>
                <option value="all">ทั้งหมด (ทุกร้าน)</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            ) : activeShop ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">ร้าน: {activeShop.name}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
        <h2 className="text-base font-semibold text-stone-700 mb-4">
          {editId ? "✏️ แก้ไขสาขา" : "➕ เพิ่มสาขาใหม่"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อสาขา *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="เช่น PetShop สาขาสยาม" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">เบอร์โทรศัพท์ *</label>
              <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="02-xxx-xxxx" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">ที่อยู่ *</label>
            <textarea required rows={2} value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="เลขที่ ถนน แขวง เขต กรุงเทพฯ"
              className={`${inputCls} resize-none`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">เวลาทำการ *</label>
              <input required value={form.openHours} onChange={(e) => setForm((f) => ({ ...f, openHours: e.target.value }))}
                placeholder="จ-ศ 09:00-18:00, ส-อา 10:00-17:00" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">หมายเหตุ</label>
              <input value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder="เช่น มีที่จอดรถ, บริการ grooming" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Latitude *</label>
              <input required type="number" step="any" value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                placeholder="13.7563" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">Longitude *</label>
              <input required type="number" step="any" value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
                placeholder="100.5018" className={inputCls} />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">รูปภาพสาขา</label>
            <div className="flex gap-3 items-start">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 hover:bg-stone-50 transition-colors"
              >
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">📷 คลิกเพื่ออัปโหลดรูป</p>
                )}
              </div>
              {form.image && (() => {
                try { new URL(form.image); return true; } catch { return false; }
              })() && (
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 shrink-0">
                  <Image src={form.image} alt="" fill className="object-cover" sizes="80px" />
                </div>
              )}
            </div>
            <input value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
              placeholder="หรือวาง URL รูปภาพโดยตรง" className={`${inputCls} mt-2`} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || uploading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
              {saving ? "กำลังบันทึก..." : editId ? "บันทึกการแก้ไข" : "เพิ่มสาขา"}
            </button>
            {editId && (
              <button type="button" onClick={cancelEdit}
                className="px-6 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors">
                ยกเลิก
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Store list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-400">กำลังโหลด...</div>
        ) : stores.length === 0 ? (
          <div className="p-12 text-center text-stone-400">ยังไม่มีสาขา</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-600">สาขา</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden md:table-cell">เบอร์โทร</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden lg:table-cell">เวลาทำการ</th>
                <th className="text-left px-4 py-3 font-medium text-stone-600 hidden lg:table-cell">พิกัด</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {stores.map((store) => (
                <tr key={store.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {store.image && (() => { try { new URL(store.image); return true; } catch { return false; } })() ? (
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-stone-100 shrink-0">
                          <Image src={store.image} alt="" fill className="object-cover" sizes="40px" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-lg shrink-0">📍</div>
                      )}
                      <div>
                        <p className="font-medium text-stone-800">{store.name}</p>
                        <p className="text-xs text-stone-400 line-clamp-1">{store.address}</p>
                        {store.remark && <p className="text-xs text-stone-400 italic">{store.remark}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{store.phone}</td>
                  <td className="px-4 py-3 text-stone-600 hidden lg:table-cell">{store.openHours}</td>
                  <td className="px-4 py-3 text-stone-400 text-xs hidden lg:table-cell">
                    {store.lat.toFixed(4)}, {store.lng.toFixed(4)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => startEdit(store)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors text-stone-600">
                        แก้ไข
                      </button>
                      <button onClick={() => handleDelete(store.id, store.name)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors text-red-500">
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Map */}
      {stores.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-stone-100">
            <h2 className="text-base font-semibold text-stone-700">🗺️ แผนที่สาขา</h2>
          </div>
          <div style={{ height: "420px" }}>
            <StoresMap stores={stores} />
          </div>
        </div>
      )}
    </div>
  );
}
