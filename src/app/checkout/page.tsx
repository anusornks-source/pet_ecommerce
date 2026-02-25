"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import toast from "react-hot-toast";

type PaymentMethod = "CREDIT_CARD" | "BANK_TRANSFER" | "PROMPTPAY" | "COD";

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartCount } = useCart();

  const [form, setForm] = useState({
    address: user?.address || "",
    phone: user?.phone || "",
    note: "",
    paymentMethod: "PROMPTPAY" as PaymentMethod,
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"info" | "payment" | "confirm">("info");

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">กรุณาเข้าสู่ระบบ</h2>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  const items = cart?.items || [];
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">ตะกร้าว่างเปล่า</h2>
        <Link href="/products" className="btn-primary px-8 py-3">เลือกซื้อสินค้า</Link>
      </div>
    );
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const total = subtotal + shipping;

  const paymentMethods: PaymentMethod[] = ["PROMPTPAY", "CREDIT_CARD", "BANK_TRANSFER", "COD"];
  const pmIcons: Record<PaymentMethod, string> = {
    PROMPTPAY: "📱",
    CREDIT_CARD: "💳",
    BANK_TRANSFER: "🏦",
    COD: "💵",
  };

  const handleSubmit = async () => {
    if (!form.address.trim() || !form.phone.trim()) {
      toast.error("กรุณากรอกที่อยู่และเบอร์โทรศัพท์");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          phone: form.phone,
          note: form.note,
          paymentMethod: form.paymentMethod,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("สั่งซื้อสำเร็จ! 🎉");
      router.push(`/checkout/success?orderId=${data.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { key: "info", label: "ข้อมูลการจัดส่ง" },
    { key: "payment", label: "ชำระเงิน" },
    { key: "confirm", label: "ยืนยัน" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">ชำระเงิน</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              step === s.key
                ? "bg-orange-500 text-white"
                : steps.indexOf({ key: step, label: "" }) > idx || step !== s.key
                ? "bg-stone-100 text-stone-400"
                : "bg-stone-100 text-stone-400"
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                step === s.key ? "bg-white text-orange-500" : "bg-stone-200 text-stone-500"
              }`}>
                {idx + 1}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="w-8 h-0.5 bg-stone-200" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {step === "info" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">ข้อมูลการจัดส่ง</h2>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อผู้รับ</label>
                <input type="text" value={user.name} disabled style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e7e5e4", borderRadius: "0.75rem", background: "#fafaf9", color: "#78716c" }} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">เบอร์โทรศัพท์ *</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="081-234-5678"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ที่อยู่จัดส่ง *</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="ระบุหมายเหตุพิเศษ เช่น ฝากไว้กับรปภ."
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <button
                onClick={() => setStep("payment")}
                disabled={!form.address || !form.phone}
                className="w-full btn-primary py-3"
              >
                ถัดไป: เลือกวิธีชำระเงิน →
              </button>
            </div>
          )}

          {step === "payment" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">วิธีชำระเงิน</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setForm({ ...form, paymentMethod: pm })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      form.paymentMethod === pm
                        ? "border-orange-500 bg-orange-50"
                        : "border-stone-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{pmIcons[pm]}</div>
                    <div className="font-medium text-stone-800 text-sm">{PAYMENT_METHOD_LABEL[pm]}</div>
                  </button>
                ))}
              </div>

              {/* Payment detail */}
              {form.paymentMethod === "PROMPTPAY" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
                  <p className="font-medium mb-1">พร้อมเพย์ หมายเลข 081-234-5678</p>
                  <p>โอนแล้วส่งหลักฐานมาที่ Line: @petshop</p>
                </div>
              )}
              {form.paymentMethod === "BANK_TRANSFER" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">ธนาคารกสิกรไทย</p>
                  <p>เลขที่บัญชี: 123-4-56789-0</p>
                  <p>ชื่อบัญชี: บริษัท เพ็ทช็อป จำกัด</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("info")} className="btn-outline py-3 px-6">← ย้อนกลับ</button>
                <button onClick={() => setStep("confirm")} className="flex-1 btn-primary py-3">
                  ถัดไป: ยืนยันคำสั่งซื้อ →
                </button>
              </div>
            </div>
          )}

          {step === "confirm" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">ยืนยันคำสั่งซื้อ</h2>
              <div className="bg-orange-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-stone-500 w-28">ที่อยู่จัดส่ง:</span>
                  <span className="text-stone-800 flex-1">{form.address}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-stone-500 w-28">เบอร์โทร:</span>
                  <span className="text-stone-800">{form.phone}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-stone-500 w-28">วิธีชำระ:</span>
                  <span className="text-stone-800">{pmIcons[form.paymentMethod]} {PAYMENT_METHOD_LABEL[form.paymentMethod]}</span>
                </div>
                {form.note && (
                  <div className="flex gap-2">
                    <span className="text-stone-500 w-28">หมายเหตุ:</span>
                    <span className="text-stone-800">{form.note}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep("payment")} className="btn-outline py-3 px-6">← ย้อนกลับ</button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : "🎉"}
                  ยืนยันสั่งซื้อ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            <h3 className="font-bold text-stone-800 mb-4">รายการสินค้า ({cartCount})</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-lg shrink-0">
                    {item.product.category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-700 truncate">{item.product.name}</p>
                    <p className="text-stone-400">x{item.quantity}</p>
                  </div>
                  <span className="font-semibold text-orange-500 shrink-0">
                    {formatPrice(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm border-t border-stone-100 pt-3">
              <div className="flex justify-between text-stone-500">
                <span>ราคาสินค้า</span><span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>ค่าจัดส่ง</span>
                <span className={shipping === 0 ? "text-green-500" : ""}>{shipping === 0 ? "ฟรี" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-stone-100">
                <span>รวม</span>
                <span className="text-orange-500">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
