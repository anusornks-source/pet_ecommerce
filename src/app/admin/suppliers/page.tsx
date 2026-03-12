"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLocale } from "@/context/LocaleContext";

interface ImportedProduct {
  id: string;
  product: { id: string; name: string; name_th: string | null; images: string[] };
}

interface SupplierProductItem {
  id: string;
  name: string;
  name_th: string | null;
  images: string[];
  productId: string | null;
  supplierPrice: number | null;
  validationStatus: string;
}

interface Supplier {
  id: string;
  name: string;
  nameTh: string | null;
  imageUrl: string | null;
  tel: string | null;
  email: string | null;
  contact: string | null;
  website: string | null;
  note: string | null;
  _count: { products: number; supplierProducts: number };
  products: ImportedProduct[];
  supplierProducts: SupplierProductItem[];
}

const emptyForm = { name: "", nameTh: "", imageUrl: "", tel: "", email: "", contact: "", website: "", note: "" };

export default function AdminSuppliersPage() {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      const payload = {
        name: form.name.trim(),
        nameTh: form.nameTh.trim() || null,
        imageUrl: form.imageUrl.trim() || null,
        tel: form.tel.trim() || null,
        email: form.email.trim() || null,
        contact: form.contact.trim() || null,
        website: form.website.trim() || null,
        note: form.note.trim() || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "Updated" : "Supplier created");
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

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success("อัปโหลดรูปสำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const startEdit = (s: Supplier) => {
    setForm({
      name: s.name,
      nameTh: s.nameTh ?? "",
      imageUrl: s.imageUrl ?? "",
      tel: s.tel ?? "",
      email: s.email ?? "",
      contact: s.contact ?? "",
      website: s.website ?? "",
      note: s.note ?? "",
    });
    setEditId(s.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-2 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t("suppliers", "adminPages")}</h1>
          <p className="text-sm text-stone-500 mt-1">
            Manage product sources and map products to suppliers
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
          {showForm ? "Cancel" : "+ Add Supplier"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4"
        >
          <h2 className="font-bold text-stone-800">
            {editId ? "Edit Supplier" : "Add Supplier"}
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
            <label className="block text-xs font-semibold text-stone-600 mb-1">รูป</label>
            <div className="flex items-center gap-3">
              {form.imageUrl ? (
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-stone-200 shrink-0">
                  <Image src={form.imageUrl} alt="" fill className="object-cover" sizes="64px" />
                </div>
              ) : null}
              <label className={`flex items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-teal-300 hover:bg-teal-50/50 transition-colors text-sm text-stone-500 ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                {uploading ? "กำลังอัปโหลด..." : "คลิกเพื่ออัปโหลดรูป"}
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  ลบรูป
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">เบอร์โทร</label>
              <input
                type="tel"
                value={form.tel}
                onChange={(e) => setForm((f) => ({ ...f, tel: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="02-xxx-xxxx"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">อีเมล</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                placeholder="supplier@example.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">ติดต่อ / ข้อมูลเพิ่มเติม</label>
            <textarea
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              rows={2}
              className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
              placeholder="ข้อมูลติดต่ออื่น ๆ"
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
          <p className="text-stone-500">No suppliers yet</p>
          <p className="text-sm text-stone-400 mt-1">Click &quot;Add Supplier&quot; to get started</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="relative bg-white border border-stone-200 rounded-xl p-3 hover:border-stone-300 transition-colors"
            >
              <div className="absolute top-2 right-2 flex items-center gap-1">
                <Link
                  href={`/admin/suppliers/${s.id}/view`}
                  className="text-[10px] px-2 py-0.5 rounded border border-stone-300 bg-stone-50 text-stone-600 hover:bg-stone-100 font-medium"
                >
                  ดู
                </Link>
                <Link
                  href={`/admin/suppliers/${s.id}`}
                  className="text-[10px] px-2 py-0.5 rounded border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium"
                >
                  จัดการสินค้า
                </Link>
                <button
                  onClick={() => startEdit(s)}
                  className="text-[10px] px-2 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 font-medium"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-[10px] px-2 py-0.5 rounded border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                >
                  ลบ
                </button>
              </div>
              <div className="flex items-center gap-2 pr-36">
                {s.imageUrl ? (
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-stone-100 shrink-0">
                    <Image src={s.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 text-base shrink-0">
                    🏭
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800">{s.name}</span>
                    {s.nameTh && (
                      <span className="text-sm text-stone-500">({s.nameTh})</span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {s._count.supplierProducts} สินค้า Supplier · {s._count.products} Import แล้ว
                  </p>
                  {(s.tel || s.email || s.contact) && (
                    <p className="text-xs text-stone-500 mt-1 flex flex-wrap gap-x-2 gap-y-0.5" title={[s.tel && `📞 ${s.tel}`, s.email && `✉️ ${s.email}`, s.contact].filter(Boolean).join(" · ")}>
                      {s.tel && (
                        <a href={`tel:${s.tel.replace(/\s/g, "")}`} className="text-teal-600 hover:text-teal-700 hover:underline">
                          📞 {s.tel}
                        </a>
                      )}
                      {s.email && (
                        <a href={`mailto:${s.email}`} className="text-teal-600 hover:text-teal-700 hover:underline">
                          ✉️ {s.email}
                        </a>
                      )}
                      {s.contact && <span>{s.contact}</span>}
                    </p>
                  )}
                </div>
              </div>
              {((s.supplierProducts && s.supplierProducts.length > 0) || (s.products && s.products.length > 0)) && (
                <div className="mt-2 pt-2 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium text-stone-500 mb-1">Supplier Products</p>
                    <div className="flex flex-wrap gap-1">
                      {s.supplierProducts?.length ? s.supplierProducts.map((sp) => (
                        <Link
                          key={sp.id}
                          href={`/admin/supplier-products/${sp.id}/view`}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors group shrink-0 min-w-0"
                        >
                          {sp.images?.[0] ? (
                            <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                              <Image src={sp.images[0]} alt="" fill className="object-cover" sizes="20px" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-[9px] shrink-0">—</div>
                          )}
                          <span className="text-[10px] text-stone-600 group-hover:text-amber-700 truncate max-w-24" title={sp.name_th ?? sp.name}>
                            {sp.name_th ?? sp.name}
                          </span>
                          {sp.productId ? <span className="text-[8px] px-0.5 rounded bg-green-100 text-green-700 shrink-0">✓</span> : null}
                        </Link>
                      )) : (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-medium text-stone-500 mb-1">Products (Import แล้ว)</p>
                    <div className="flex flex-wrap gap-1">
                      {s.products?.length ? s.products.map((ps) => (
                        <Link
                          key={ps.id}
                          href={`/admin/products/${ps.product.id}`}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 hover:bg-green-100 border border-green-100 transition-colors group shrink-0 min-w-0"
                        >
                          {ps.product.images?.[0] ? (
                            <div className="relative w-5 h-5 rounded overflow-hidden shrink-0">
                              <Image src={ps.product.images[0]} alt="" fill className="object-cover" sizes="20px" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded bg-stone-200 flex items-center justify-center text-stone-400 text-[9px] shrink-0">—</div>
                          )}
                          <span className="text-[10px] text-stone-600 group-hover:text-green-700 truncate max-w-24" title={ps.product.name_th ?? ps.product.name}>
                            {ps.product.name_th ?? ps.product.name}
                          </span>
                        </Link>
                      )) : (
                        <span className="text-[10px] text-stone-400">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
