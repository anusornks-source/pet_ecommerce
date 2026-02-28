"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function AdminSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "hero" | null>(null);

  const [form, setForm] = useState({
    storeName: "",
    logoUrl: "",
    heroImageUrl: "",
    adminEmail: "",
    promptpayId: "",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setForm({
            storeName: d.data.storeName ?? "",
            logoUrl: d.data.logoUrl ?? "",
            heroImageUrl: d.data.heroImageUrl ?? "",
            adminEmail: d.data.adminEmail ?? "",
            promptpayId: d.data.promptpayId ?? "",
            bankName: d.data.bankName ?? "",
            bankAccount: d.data.bankAccount ?? "",
            bankAccountName: d.data.bankAccountName ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File, target: "logo" | "hero") => {
    setUploading(target);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(null);
    if (data.success) {
      if (target === "logo") setForm((f) => ({ ...f, logoUrl: data.url }));
      else setForm((f) => ({ ...f, heroImageUrl: data.url }));
      toast.success(target === "logo" ? "อัปโหลด logo สำเร็จ" : "อัปโหลดรูป Hero สำเร็จ");
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

  const inputCls = "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  if (loading) {
    return <div className="p-12 text-center text-stone-400">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">ตั้งค่าร้าน</h1>
        <p className="text-sm text-stone-500 mt-0.5">ชื่อร้าน, โลโก้, การแจ้งเตือน และช่องทางชำระเงิน</p>
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
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")}
                />
                {uploading === "logo" ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">🖼️ คลิกเพื่ออัปโหลด logo</p>
                )}
              </div>
              <div className="relative w-16 h-16 rounded-xl border-2 border-stone-200 bg-stone-50 flex items-center justify-center shrink-0 overflow-hidden">
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
          </div>

          {/* Hero Image */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">รูปหน้าแรก (Hero)</label>
            <div
              onClick={() => heroInputRef.current?.click()}
              className="relative border-2 border-dashed border-stone-200 rounded-xl overflow-hidden cursor-pointer hover:border-orange-300 hover:bg-stone-50 transition-colors"
              style={{ height: "140px" }}
            >
              <input
                ref={heroInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "hero")}
              />
              {form.heroImageUrl && isValidUrl(form.heroImageUrl) ? (
                <>
                  <Image src={form.heroImageUrl} alt="Hero" fill className="object-cover" sizes="640px" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium">📷 เปลี่ยนรูป</span>
                  </div>
                </>
              ) : uploading === "hero" ? (
                <div className="h-full flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-1 text-stone-400">
                  <span className="text-3xl">🖼️</span>
                  <p className="text-sm">คลิกเพื่ออัปโหลดรูป Hero หน้าแรก</p>
                  <p className="text-xs">แนะนำ: 1200×600px ขึ้นไป</p>
                </div>
              )}
            </div>
            <input
              value={form.heroImageUrl}
              onChange={(e) => setForm((f) => ({ ...f, heroImageUrl: e.target.value }))}
              placeholder="หรือวาง URL รูป Hero โดยตรง"
              className={`${inputCls} mt-2`}
            />
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-700">📧 การแจ้งเตือนอีเมล</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">อีเมลรับแจ้งเตือน (Admin)</label>
            <input
              type="email"
              value={form.adminEmail}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
              placeholder="admin@yourshop.com"
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1">รับแจ้งทุก order ใหม่ — ลูกค้าจะได้รับ email ยืนยัน order อัตโนมัติด้วย</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-700 mb-2">⚙️ ต้องตั้งค่า SMTP ใน .env</p>
            <pre className="text-xs text-amber-600 font-mono leading-relaxed">{`EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="your@gmail.com"
EMAIL_PASS="app-password"
EMAIL_FROM="Shop Name <your@gmail.com>"`}</pre>
          </div>
        </div>

        {/* PromptPay */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-700">📱 พร้อมเพย์ (PromptPay QR)</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">หมายเลขพร้อมเพย์</label>
            <input
              value={form.promptpayId}
              onChange={(e) => setForm((f) => ({ ...f, promptpayId: e.target.value }))}
              placeholder="0812345678 หรือ เลขบัตรประชาชน 13 หลัก"
              className={inputCls}
            />
            <p className="text-xs text-stone-400 mt-1">ระบบจะ generate QR Code ให้ลูกค้าสแกนชำระเงินอัตโนมัติพร้อมยอดที่ถูกต้อง</p>
          </div>
        </div>

        {/* Bank Transfer */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-stone-700">🏦 โอนเงินผ่านธนาคาร</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อธนาคาร</label>
              <input
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="ธนาคารกสิกรไทย"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">เลขที่บัญชี</label>
              <input
                value={form.bankAccount}
                onChange={(e) => setForm((f) => ({ ...f, bankAccount: e.target.value }))}
                placeholder="123-4-56789-0"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อบัญชี</label>
            <input
              value={form.bankAccountName}
              onChange={(e) => setForm((f) => ({ ...f, bankAccountName: e.target.value }))}
              placeholder="บริษัท เพ็ทช็อป จำกัด"
              className={inputCls}
            />
          </div>
        </div>

        {/* Stripe */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h2 className="text-base font-semibold text-stone-700 mb-4">💳 Stripe (บัตรเครดิต/เดบิต)</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-700 mb-2">⚙️ ตั้งค่า Stripe ใน .env</p>
            <pre className="text-xs text-blue-600 font-mono leading-relaxed">{`STRIPE_SECRET_KEY="sk_live_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..."`}</pre>
            <p className="text-xs text-blue-600 mt-2">สร้าง API keys ได้ที่ dashboard.stripe.com → Developers → API keys</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading !== null}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
        </button>
      </form>
    </div>
  );
}
