"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { formatPrice, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import toast from "react-hot-toast";
import type { Address } from "@/types";
import ThaiAddressInput from "@/components/ThaiAddressInput";

// Load Stripe form lazily — avoids bundle bloat when not used
const StripeCardForm = dynamic(() => import("@/components/StripeCardForm"), { ssr: false });

type PaymentMethod = "CREDIT_CARD" | "BANK_TRANSFER" | "PROMPTPAY" | "COD";

interface ShopSettings {
  promptpayId?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartCount, clearCart } = useCart();

  const [form, setForm] = useState({
    address: user?.address || "",
    city: "",
    province: "",
    zipCode: "",
    phone: user?.phone || "",
    note: "",
    paymentMethod: "PROMPTPAY" as PaymentMethod,
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"info" | "payment" | "confirm" | "stripe">("info");
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [settings, setSettings] = useState<ShopSettings>({});
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSettings(d.data); });
    fetch("/api/addresses")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.length > 0) {
          setSavedAddresses(d.data);
          // Pre-select default address
          const def = d.data.find((a: Address) => a.isDefault) ?? d.data[0];
          setSelectedAddressId(def.id);
          setForm((f) => ({ ...f, address: def.address, city: def.city || "", province: def.province || "", zipCode: def.zipCode || "", phone: def.phone }));
        }
      });
  }, []);

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

  const subtotal = items.reduce((sum, item) => sum + (item.variant?.price ?? item.product.price) * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 50;
  const discount = couponApplied?.discount ?? 0;
  const total = subtotal + shipping - discount;

  const paymentMethods: PaymentMethod[] = ["PROMPTPAY", "CREDIT_CARD", "BANK_TRANSFER", "COD"];
  const pmIcons: Record<PaymentMethod, string> = {
    PROMPTPAY: "📱",
    CREDIT_CARD: "💳",
    BANK_TRANSFER: "🏦",
    COD: "💵",
  };

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponLoading(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), subtotal }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); return; }
      setCouponApplied({ code: data.data.code, discount: data.data.discount });
      toast.success(`ใช้โค้ด ${data.data.code} สำเร็จ! ลด ${formatPrice(data.data.discount)}`);
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setCouponLoading(false);
    }
  };

  const createOrder = async (): Promise<string | null> => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          city: form.city,
          province: form.province,
          zipCode: form.zipCode,
          phone: form.phone,
          note: form.note,
          paymentMethod: form.paymentMethod,
          couponCode: couponApplied?.code ?? null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data.data.id as string;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.address.trim() || !form.phone.trim() || !form.city.trim() || !form.province.trim() || !form.zipCode.trim()) {
      toast.error("กรุณากรอกที่อยู่ให้ครบถ้วน");
      return;
    }

    if (form.paymentMethod === "CREDIT_CARD") {
      const orderId = await createOrder();
      if (!orderId) return;
      setCreatedOrderId(orderId);
      setStep("stripe");
    } else {
      const orderId = await createOrder();
      if (!orderId) return;
      await clearCart();
      toast.success("สั่งซื้อสำเร็จ! 🎉");
      router.push(`/checkout/success?orderId=${orderId}`);
    }
  };

  const steps = [
    { key: "info", label: "ข้อมูลการจัดส่ง" },
    { key: "payment", label: "ชำระเงิน" },
    { key: "confirm", label: "ยืนยัน" },
  ];
  const visibleSteps = step === "stripe"
    ? [...steps, { key: "stripe", label: "กรอกบัตร" }]
    : steps;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">ชำระเงิน</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {visibleSteps.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              step === s.key ? "bg-orange-500 text-white" : "bg-stone-100 text-stone-400"
            }`}>
              <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold ${
                step === s.key ? "bg-white text-orange-500" : "bg-stone-200 text-stone-500"
              }`}>
                {idx + 1}
              </span>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {idx < visibleSteps.length - 1 && <div className="w-8 h-0.5 bg-stone-200" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">

          {/* Step 1 */}
          {step === "info" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">ข้อมูลการจัดส่ง</h2>

              {/* Saved address picker */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-stone-700">ที่อยู่ที่บันทึกไว้</label>
                    <Link href="/profile/addresses" className="text-xs text-orange-500 hover:text-orange-600">จัดการที่อยู่ →</Link>
                  </div>
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                    {savedAddresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          setForm((f) => ({ ...f, phone: addr.phone, address: addr.address, city: addr.city || "", province: addr.province || "", zipCode: addr.zipCode || "" }));
                        }}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                          selectedAddressId === addr.id
                            ? "border-orange-500 bg-orange-50"
                            : "border-stone-200 hover:border-orange-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{addr.label}</span>
                          {addr.isDefault && <span className="text-xs text-orange-500 font-medium">⭐ ที่อยู่หลัก</span>}
                        </div>
                        <p className="text-sm font-medium text-stone-800">{addr.name} · {addr.phone}</p>
                        <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{addr.address}</p>
                      </button>
                    ))}
                    {/* Manual entry option */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddressId(null);
                        setForm((f) => ({ ...f, phone: "", address: "", city: "", province: "", zipCode: "" }));
                      }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selectedAddressId === null
                          ? "border-orange-500 bg-orange-50"
                          : "border-stone-200 hover:border-orange-300"
                      }`}
                    >
                      <p className="text-sm font-medium text-stone-700">+ กรอกที่อยู่ใหม่</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Manual fields — always shown, pre-filled when address selected */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อผู้รับ</label>
                <input type="text" value={user.name} disabled style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e7e5e4", borderRadius: "0.75rem", background: "#fafaf9", color: "#78716c" }} readOnly />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">เบอร์โทรศัพท์ *</label>
                <input type="tel" className="input" placeholder="081-234-5678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">ที่อยู่ (บ้านเลขที่ / ถนน / แขวง) *</label>
                <textarea className="input resize-none" rows={2} placeholder="เช่น 123/4 ถนนสุขุมวิท แขวงคลองเตย" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">เขต/อำเภอ * <span className="text-stone-400 font-normal text-xs">(พิมพ์เพื่อค้นหา)</span></label>
                <ThaiAddressInput
                  value={form.city}
                  onChange={(v) => setForm({ ...form, city: v })}
                  onSelect={(addr) => setForm((f) => ({ ...f, city: addr.amphoe, province: addr.province, zipCode: addr.zipcode }))}
                  placeholder="พิมพ์แขวง/เขต/จังหวัด หรือรหัสไปรษณีย์"
                  className="input w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">จังหวัด *</label>
                  <input type="text" className="input" placeholder="กรุงเทพมหานคร" value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">รหัสไปรษณีย์ *</label>
                  <input type="text" className="input" placeholder="10110" maxLength={5} value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value.replace(/\D/g, "") })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">หมายเหตุ (ถ้ามี)</label>
                <input type="text" className="input" placeholder="ระบุหมายเหตุพิเศษ เช่น ฝากไว้กับรปภ." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <button onClick={() => setStep("payment")} disabled={!form.address || !form.phone || !form.city || !form.province || !form.zipCode} className="w-full btn-primary py-3">
                ถัดไป: เลือกวิธีชำระเงิน →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === "payment" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">วิธีชำระเงิน</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm}
                    onClick={() => setForm({ ...form, paymentMethod: pm })}
                    className={`p-4 rounded-2xl border-2 text-left transition-all ${
                      form.paymentMethod === pm ? "border-orange-500 bg-orange-50" : "border-stone-200 hover:border-orange-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{pmIcons[pm]}</div>
                    <div className="font-medium text-stone-800 text-sm">{PAYMENT_METHOD_LABEL[pm]}</div>
                    {pm === "CREDIT_CARD" && <div className="text-xs text-stone-400 mt-0.5">Visa, Mastercard, JCB</div>}
                  </button>
                ))}
              </div>

              {form.paymentMethod === "PROMPTPAY" && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-700">
                  <p className="font-semibold mb-1">📱 พร้อมเพย์</p>
                  {settings.promptpayId
                    ? <p>หมายเลข: <strong>{settings.promptpayId}</strong> — QR Code พร้อมยอดเงินจะแสดงหลังสั่งซื้อ</p>
                    : <p className="text-stone-400">QR Code จะแสดงหลังสั่งซื้อ</p>
                  }
                </div>
              )}

              {form.paymentMethod === "BANK_TRANSFER" && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
                  <p className="font-semibold mb-1">🏦 โอนเงินผ่านธนาคาร</p>
                  {settings.bankName || settings.bankAccount ? (
                    <>
                      {settings.bankName && <p>{settings.bankName}</p>}
                      {settings.bankAccount && <p>เลขที่บัญชี: <strong>{settings.bankAccount}</strong></p>}
                      {settings.bankAccountName && <p>ชื่อบัญชี: {settings.bankAccountName}</p>}
                    </>
                  ) : (
                    <p className="text-stone-400">ยังไม่ได้ตั้งค่าบัญชีธนาคาร</p>
                  )}
                </div>
              )}

              {form.paymentMethod === "CREDIT_CARD" && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-sm text-purple-700">
                  <p className="font-semibold mb-1">💳 ชำระด้วยบัตรเครดิต/เดบิต</p>
                  <p>คุณจะกรอกข้อมูลบัตรในขั้นตอนถัดไปอย่างปลอดภัยผ่าน Stripe</p>
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

          {/* Step 3 */}
          {step === "confirm" && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">ยืนยันคำสั่งซื้อ</h2>
              <div className="bg-orange-50 rounded-2xl p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-stone-500 w-28 shrink-0">ที่อยู่จัดส่ง:</span>
                  <span className="text-stone-800 flex-1">
                    {form.address}<br />
                    {form.city} {form.province} {form.zipCode}
                  </span>
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
                <button onClick={handleSubmit} disabled={loading} className="flex-1 btn-primary py-3 flex items-center justify-center gap-2">
                  {loading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : form.paymentMethod === "CREDIT_CARD" ? "💳" : "🎉"}
                  {form.paymentMethod === "CREDIT_CARD" ? "ไปกรอกข้อมูลบัตร →" : "ยืนยันสั่งซื้อ"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Stripe */}
          {step === "stripe" && createdOrderId && (
            <div className="card p-6 space-y-5">
              <h2 className="font-bold text-stone-800 text-lg">💳 กรอกข้อมูลบัตร</h2>
              <p className="text-sm text-stone-500">ชำระเงินอย่างปลอดภัยผ่าน Stripe — ข้อมูลบัตรเข้ารหัส TLS และไม่ถูกจัดเก็บ</p>
              <StripeCardForm
                orderId={createdOrderId}
                total={total}
                onSuccess={async () => {
                  await clearCart();
                  toast.success("ชำระเงินสำเร็จ! 🎉");
                  router.push(`/checkout/success?orderId=${createdOrderId}`);
                }}
              />
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-5 sticky top-20">
            <h3 className="font-bold text-stone-800 mb-4">รายการสินค้า ({cartCount})</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((item) => {
                const img = item.variant?.variantImage ?? item.product.images?.[0] ?? null;
                const variantAttrs = [
                  item.variant?.size ? `ขนาด: ${item.variant.size}` : null,
                  item.variant?.color ? `สี: ${item.variant.color}` : null,
                  ...(item.variant?.attributes?.map((a) => `${a.name}: ${a.value}`) ?? []),
                ].filter(Boolean);
                return (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="relative w-10 h-10 bg-orange-50 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-lg">
                      {img ? (
                        <Image src={img} alt={item.product.name} fill className="object-cover" sizes="40px" />
                      ) : (
                        item.product.category.icon
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-700 truncate">{item.product.name}</p>
                      {variantAttrs.length > 0 && (
                        <p className="text-xs text-stone-400 truncate">{variantAttrs.join(" · ")}</p>
                      )}
                      <p className="text-stone-400">x{item.quantity}</p>
                    </div>
                    <span className="font-semibold text-orange-500 shrink-0">
                      {formatPrice((item.variant?.price ?? item.product.price) * item.quantity)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-stone-100 pt-3 mb-1">
              {couponApplied ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 text-sm">
                  <span className="text-green-700 font-medium">🎟️ {couponApplied.code}</span>
                  <button onClick={() => { setCouponApplied(null); setCouponInput(""); }} className="text-stone-400 hover:text-red-400 text-xs ml-2">ยกเลิก</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" className="input text-sm flex-1 py-2" placeholder="โค้ดส่วนลด" value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && applyCoupon()} />
                  <button onClick={applyCoupon} disabled={couponLoading || !couponInput.trim()} className="btn-primary px-3 py-2 text-sm shrink-0">{couponLoading ? "..." : "ใช้"}</button>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm border-t border-stone-100 pt-3">
              <div className="flex justify-between text-stone-500"><span>ราคาสินค้า</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between text-stone-500">
                <span>ค่าจัดส่ง</span>
                <span className={shipping === 0 ? "text-green-500" : ""}>{shipping === 0 ? "ฟรี" : formatPrice(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600"><span>ส่วนลด</span><span>-{formatPrice(discount)}</span></div>
              )}
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
