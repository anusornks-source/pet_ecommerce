"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    storeName: "",
    logoUrl: "",
    adminEmail: "",
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            storeName: d.data.storeName ?? "",
            logoUrl: d.data.logoUrl ?? "",
            adminEmail: d.data.adminEmail ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, logoUrl: data.url }));
      toast.success("อัปโหลด logo สำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("บันทึกการตั้งค่าแล้ว");
    } else {
      toast.error(data.error ?? "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  const inputCls =
    "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  if (loading) {
    return <div className="p-12 text-center text-stone-400">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">ตั้งค่าร้าน</h1>
        <p className="text-sm text-stone-500 mt-0.5">ชื่อร้าน, โลโก้, และการแจ้งเตือนอีเมล</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Branding */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-700">🏪 ข้อมูลร้าน</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อร้าน *</label>
            <input
              required
              value={form.storeName}
              onChange={(e) => setForm((f) => ({ ...f, storeName: e.target.value }))}
              placeholder="PetShop"
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1">แสดงใน Navbar, Footer และ title ของเวบ</p>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">โลโก้ร้าน</label>
            <div className="flex gap-3 items-start">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 hover:bg-stone-50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">🖼️ คลิกเพื่ออัปโหลด logo</p>
                )}
              </div>

              {/* Preview */}
              <div className="w-16 h-16 rounded-xl border-2 border-stone-200 bg-stone-50 flex items-center justify-center shrink-0 overflow-hidden">
                {form.logoUrl && isValidUrl(form.logoUrl) ? (
                  <Image src={form.logoUrl} alt="Logo" fill className="object-contain p-1" sizes="64px" />
                ) : (
                  <span className="text-2xl">🐾</span>
                )}
              </div>
            </div>
            <input
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="หรือวาง URL โลโก้โดยตรง"
              className={`${inputCls} mt-2`}
            />
            <p className="text-xs text-stone-400 mt-1">ถ้าไม่ใส่จะแสดง 🐾 แทน</p>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-700">📧 การแจ้งเตือนอีเมล</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">อีเมลรับแจ้งเตือนคำสั่งซื้อ</label>
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
              placeholder="admin@yourshop.com"
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1">จะได้รับอีเมลทุกครั้งที่มี order ใหม่เข้ามา</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-700 mb-2">⚙️ ต้องตั้งค่า SMTP ใน .env ด้วย</p>
            <pre className="text-xs text-amber-600 font-mono leading-relaxed">{`EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your@gmail.com"
EMAIL_PASS="app-password"
EMAIL_FROM="Shop Name <your@gmail.com>"`}</pre>
            <p className="text-xs text-amber-600 mt-2">
              Gmail: เปิด 2FA → Google Account → Security → App Passwords
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </form>
    </div>
  );
}
