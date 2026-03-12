"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";
import { useLocale } from "@/context/LocaleContext";

export default function AdminSettingsPage() {
  const { t } = useLocale();
  const { isAdmin } = useShopAdmin();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"logo" | null>(null);

  const [form, setForm] = useState({
    storeName: "",
    logoUrl: "",
    adminEmail: "",
    promptpayId: "",
    bankName: "",
    bankAccount: "",
    bankAccountName: "",
    useGlobalPayment: true,
    displayStockMin: "50",
    displayStockMax: "100",
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
            promptpayId: d.data.promptpayId ?? "",
            bankName: d.data.bankName ?? "",
            bankAccount: d.data.bankAccount ?? "",
            bankAccountName: d.data.bankAccountName ?? "",
            useGlobalPayment: d.data.useGlobalPayment ?? true,
            displayStockMin: String(d.data.displayStockMin ?? 50),
            displayStockMax: String(d.data.displayStockMax ?? 100),
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    setUploading("logo");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(null);
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

  const inputCls = "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  if (loading) {
    return <div className="p-12 text-center text-stone-400">กำลังโหลด...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("shopSettings", "adminPages")}</h1>
        <p className="text-sm text-stone-500 mt-0.5">ชื่อร้าน, โลโก้, การแจ้งเตือน และช่องทางชำระเงิน</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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

        {/* Display Stock */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-stone-700">📦 Display Stock (สต็อกที่แสดงลูกค้า)</h2>
            <p className="text-xs text-stone-400 mt-0.5">ใช้กับสินค้า CJ และการสร้างสินค้าใหม่ — ระบบจะสุ่มค่าในช่วงนี้เป็นสต็อกที่โชว์ลูกค้า</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ค่าต่ำสุด</label>
              <input
                type="number"
                min="1"
                value={form.displayStockMin}
                onChange={(e) => setForm((f) => ({ ...f, displayStockMin: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ค่าสูงสุด</label>
              <input
                type="number"
                min="1"
                value={form.displayStockMax}
                onChange={(e) => setForm((f) => ({ ...f, displayStockMax: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <p className="text-xs text-stone-500 bg-stone-50 rounded-xl px-3 py-2">
            ตัวอย่าง: ถ้าตั้ง 50–100 ระบบจะสุ่มระหว่าง 50 ถึง 100 ชิ้น • เมื่อลูกค้าซื้อจนเหลือ 0 ระบบจะ reset อัตโนมัติ
          </p>
        </div>

        {/* Stripe / Payment */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-stone-700">💳 Stripe (บัตรเครดิต/เดบิต)</h2>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">ใช้ Stripe ส่วนกลาง</p>
              <p className="text-xs text-stone-400 mt-0.5">
                {form.useGlobalPayment
                  ? "ร้านใช้บัญชี Stripe กลางของระบบ"
                  : "ร้านใช้บัญชี Stripe ของตัวเอง"}
              </p>
            </div>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, useGlobalPayment: !f.useGlobalPayment }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.useGlobalPayment ? "bg-green-400" : "bg-stone-300"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.useGlobalPayment ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            ) : (
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${form.useGlobalPayment ? "bg-green-50 text-green-600" : "bg-orange-50 text-orange-600"}`}>
                {form.useGlobalPayment ? "ส่วนกลาง" : "ของร้าน"}
              </span>
            )}
          </div>

          {form.useGlobalPayment ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-700">ระบบจะใช้ Stripe API keys จาก .env ส่วนกลาง — ไม่ต้องตั้งค่าเพิ่ม</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm text-amber-700">ฟีเจอร์ Stripe แยกต่อร้านยังไม่เปิดใช้งาน — ติดต่อ Admin เพื่อตั้งค่า</p>
            </div>
          )}
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
