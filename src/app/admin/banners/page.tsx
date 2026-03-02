"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Banner {
  id: string;
  imageUrl: string;
  badge: string | null;
  title: string | null;
  titleHighlight: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  order: number;
  active: boolean;
}

const emptyForm = {
  imageUrl: "",
  badge: "",
  title: "",
  titleHighlight: "",
  subtitle: "",
  ctaLabel: "",
  ctaUrl: "",
  secondaryCtaLabel: "",
  secondaryCtaUrl: "",
  order: "0",
  active: true,
};

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    fetch("/api/admin/banners")
      .then((r) => r.json())
      .then((d) => { if (d.success) setBanners(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl.trim()) { toast.error("กรุณาใส่รูปภาพ"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/banners/${editId}` : "/api/admin/banners";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "อัปเดตแล้ว" : "สร้าง banner แล้ว");
        setForm(emptyForm);
        setEditId(null);
        setShowForm(false);
        load();
      } else {
        toast.error(data.error ?? "เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Banner) => {
    setForm({
      imageUrl: b.imageUrl,
      badge: b.badge ?? "",
      title: b.title ?? "",
      titleHighlight: b.titleHighlight ?? "",
      subtitle: b.subtitle ?? "",
      ctaLabel: b.ctaLabel ?? "",
      ctaUrl: b.ctaUrl ?? "",
      secondaryCtaLabel: b.secondaryCtaLabel ?? "",
      secondaryCtaUrl: b.secondaryCtaUrl ?? "",
      order: String(b.order),
      active: b.active,
    });
    setEditId(b.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm(`ลบ banner นี้ใช่ไหม?`)) return;
    const res = await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบแล้ว"); load(); }
    else toast.error(data.error ?? "ลบไม่สำเร็จ");
  };

  const toggleActive = async (b: Banner) => {
    const res = await fetch(`/api/admin/banners/${b.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    const data = await res.json();
    if (data.success) load();
  };

  const cancel = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const inputCls = "w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">🖼️ Hero Banner</h1>
          <p className="text-xs text-stone-400 mt-0.5">Slider บนหน้าแรก — เรียงลำดับตาม Order</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            + เพิ่ม Banner
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 mb-5 space-y-5">
          <p className="text-sm font-semibold text-stone-700">{editId ? "แก้ไข Banner" : "สร้าง Banner ใหม่"}</p>

          {/* Image upload */}
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">รูปภาพ Banner *</label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative border-2 border-dashed border-stone-200 rounded-xl overflow-hidden cursor-pointer hover:border-orange-300 hover:bg-stone-50 transition-colors aspect-5/2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
              />
              {form.imageUrl && isValidUrl(form.imageUrl) ? (
                <>
                  <Image src={form.imageUrl} alt="Banner" fill className="object-cover" sizes="800px" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium">📷 เปลี่ยนรูป</span>
                  </div>
                </>
              ) : uploading ? (
                <div className="h-full flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                  <span className="text-3xl">🖼️</span>
                  <p className="text-sm">คลิกเพื่ออัปโหลดรูป Banner</p>
                  <p className="text-xs">แนะนำ: 1400×560px ขึ้นไป (ratio 5:2)</p>
                </div>
              )}
            </div>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="หรือวาง URL รูปโดยตรง"
              className={`${inputCls} mt-2`}
            />
          </div>

          {/* Text content */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Badge (ข้อความเล็กบนสุด)</label>
              <input
                value={form.badge}
                onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                placeholder="🎉 ยินดีต้อนรับสู่ PetShop"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Order (ลำดับ)</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title (หัวเรื่องหลัก)</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ทุกสิ่งที่"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title Highlight (สีส้ม)</label>
              <input
                value={form.titleHighlight}
                onChange={(e) => setForm((f) => ({ ...f, titleHighlight: e.target.value }))}
                placeholder="น้องรัก ต้องการ ที่นี่ครบ!"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-stone-500 mb-1">Subtitle (คำอธิบาย)</label>
            <textarea
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
              rows={2}
              placeholder="คัดสรรสัตว์เลี้ยงคุณภาพ พร้อมอาหาร ของเล่น และอุปกรณ์ครบครัน จัดส่งถึงบ้านทั่วประเทศ"
              className={inputCls}
            />
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มหลัก (CTA Label)</label>
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                placeholder="ช้อปเลย 🛒"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มหลัก (CTA URL)</label>
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
                placeholder="/products"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มรอง (Secondary Label)</label>
              <input
                value={form.secondaryCtaLabel}
                onChange={(e) => setForm((f) => ({ ...f, secondaryCtaLabel: e.target.value }))}
                placeholder="ดูสัตว์เลี้ยง"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มรอง (Secondary URL)</label>
              <input
                value={form.secondaryCtaUrl}
                onChange={(e) => setForm((f) => ({ ...f, secondaryCtaUrl: e.target.value }))}
                placeholder="/products?category=dogs"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="active" className="text-sm text-stone-600">แสดงบนหน้าเว็บ (Active)</label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "สร้าง"}
            </button>
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* Banner list */}
      {loading ? (
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">ยังไม่มี banner — กด "+ เพิ่ม Banner" เพื่อเริ่ม</div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <div key={b.id} className={`bg-white rounded-2xl border ${b.active ? "border-stone-100" : "border-stone-100 opacity-60"} overflow-hidden`}>
              <div className="flex gap-4 p-4">
                {/* Thumbnail */}
                <div className="relative w-40 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                  {b.imageUrl && isValidUrl(b.imageUrl) ? (
                    <Image src={b.imageUrl} alt="Banner" fill className="object-cover" sizes="160px" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-stone-300 text-2xl">🖼️</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {b.badge && <p className="text-xs text-orange-500 font-medium mb-0.5">{b.badge}</p>}
                      <p className="font-semibold text-stone-800 text-sm">
                        {b.title}{b.titleHighlight && <span className="text-orange-500"> {b.titleHighlight}</span>}
                        {!b.title && !b.titleHighlight && <span className="text-stone-400 italic">ไม่มีหัวเรื่อง</span>}
                      </p>
                      {b.subtitle && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{b.subtitle}</p>}
                      <div className="flex gap-2 mt-1.5">
                        {b.ctaLabel && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{b.ctaLabel}</span>
                        )}
                        {b.secondaryCtaLabel && (
                          <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{b.secondaryCtaLabel}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">#{b.order}</span>
                      <button
                        onClick={() => toggleActive(b)}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${b.active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}
                      >
                        {b.active ? "แสดง" : "ซ่อน"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-50 px-4 py-2 flex gap-3">
                <button onClick={() => startEdit(b)} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">แก้ไข</button>
                <button onClick={() => handleDelete(b)} className="text-xs text-red-400 hover:text-red-600 transition-colors">ลบ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
