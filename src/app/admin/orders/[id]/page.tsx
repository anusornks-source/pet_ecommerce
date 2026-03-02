"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface Order {
  id: string;
  status: string;
  total: number;
  address: string;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  phone: string;
  note: string | null;
  cjOrderId: string | null;
  cjStatus: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  createdAt: string;
  user: { name: string; email: string; phone: string | null };
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { name: string; images: string[] };
  }[];
  payment: {
    method: string;
    status: string;
    amount: number;
  } | null;
}

interface CjApiLog {
  id: string;
  action: string;
  request: unknown;
  response: unknown;
  success: boolean;
  error: string | null;
  createdAt: string;
}

interface StockCheckItem {
  name: string;
  quantity: number;
  available: number;
  source: "CJ" | "local";
  ok: boolean;
}

interface StockCheck {
  ok: boolean;
  cjApiAvailable: boolean;
  items: StockCheckItem[];
  outOfStock: string[];
}

interface CostEstimate {
  itemsCostUSD: number;
  itemsCostTHB: number;
  freightTotalUSD: number;
  freightTHB: number;
  totalCostTHB: number;
  estimatedMarginTHB: number;
  usdToThb: number;
  freightItems: { name: string; priceUSD: number; logistic: string }[];
  freightApiAvailable: boolean;
  freightFallback: boolean;
  logistic: string;
}

const statusLabel: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  SHIPPING: "กำลังจัดส่ง",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const STEPS = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];
const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPING",
  SHIPPING: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
};

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPING: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [cjLogs, setCjLogs] = useState<CjApiLog[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const handleSyncTracking = async () => {
    if (!order?.cjOrderId) return;
    setSyncing(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/sync-tracking`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("อัปเดต tracking จาก CJ แล้ว");
        setOrder((o) => o ? { ...o, ...data.data } : o);
        // Refresh CJ logs
        fetch(`/api/admin/orders/${id}/cj-logs`).then((r) => r.json()).then((d) => { if (d.success) setCjLogs(d.data); });
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถ sync ได้");
    } finally {
      setSyncing(false);
    }
  };

  const handleRefund = async () => {
    if (!order || order.payment?.method !== "STRIPE") return;
    if (!confirm(`ยืนยันคืนเงิน ฿${order.payment.amount.toLocaleString("th-TH")} ผ่าน Stripe?`)) return;
    setRefunding(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/refund`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`คืนเงินสำเร็จ (${data.refundId})`);
        setOrder((o) => o ? { ...o, status: "CANCELLED", payment: o.payment ? { ...o.payment, status: "REFUNDED" } : null } : o);
      } else {
        toast.error(data.error || "คืนเงินไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setRefunding(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!order || !trackingInput.trim()) return;
    setSavingTracking(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: order.status,
          trackingNumber: trackingInput.trim(),
          trackingCarrier: carrierInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึก tracking แล้ว");
        setOrder((o) => o ? { ...o, trackingNumber: trackingInput.trim(), trackingCarrier: carrierInput.trim() || null } : o);
        setTrackingInput("");
        setCarrierInput("");
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setSavingTracking(false);
    }
  };

  // Stock check modal state
  const [stockModal, setStockModal] = useState<{
    open: boolean;
    stockCheck: StockCheck | null;
    costEstimate: CostEstimate | null;
    pendingStatus: string;
  }>({ open: false, stockCheck: null, costEstimate: null, pendingStatus: "" });

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          setNewStatus(d.data.status);
        }
      })
      .finally(() => setLoading(false));
    fetch(`/api/admin/orders/${id}/cj-logs`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setCjLogs(d.data); });
  }, [id]);

  const handleUpdateStatus = async (targetStatus?: string) => {
    const status = targetStatus ?? newStatus;
    if (!order || status === order.status) return;

    // Two-step: if confirming an unconfirmed order, do dry-run stock check + freight first
    if (status === "CONFIRMED" && order.status !== "CONFIRMED") {
      setChecking(true);
      try {
        const res = await fetch(`/api/admin/orders/${id}?dryRun=true`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (data.success && data.dryRun) {
          setStockModal({
            open: true,
            stockCheck: data.stockCheck,
            costEstimate: data.costEstimate ?? null,
            pendingStatus: status,
          });
          return;
        }
      } catch {
        toast.error("ไม่สามารถตรวจสอบสต็อกได้");
      } finally {
        setChecking(false);
      }
    }

    await commitStatus(status);
  };

  const commitStatus = async (status: string, force = false) => {
    setSaving(true);
    const url = force ? `/api/admin/orders/${id}?force=true` : `/api/admin/orders/${id}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("อัปเดตสถานะแล้ว");
      setOrder((o) => (o ? { ...o, status, cjOrderId: data.data?.cjOrderId ?? o.cjOrderId } : o));
      setStockModal({ open: false, stockCheck: null, costEstimate: null, pendingStatus: "" });
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-16 text-stone-400">ไม่พบคำสั่งซื้อ</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            คำสั่งซื้อ #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">รายการสินค้า</h2>
            </div>
            <div className="divide-y divide-stone-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    {item.product.images[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-stone-300 text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{item.product.name}</p>
                    <p className="text-sm text-stone-400">
                      {item.quantity} x ฿{item.price.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-800">
                      ฿{(item.quantity * item.price).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex justify-between">
              <span className="font-semibold text-stone-800">รวมทั้งสิ้น</span>
              <span className="font-bold text-lg text-orange-500">
                ฿{order.total.toLocaleString("th-TH")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Status Update */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-4">สถานะคำสั่งซื้อ</h2>

            {/* Stepper */}
            {order.status === "CANCELLED" ? (
              <span className="inline-block text-xs px-3 py-1.5 rounded-full font-medium bg-red-100 text-red-700 mb-4">
                ✕ ยกเลิกแล้ว
              </span>
            ) : (
              <div className="flex items-start mb-5">
                {STEPS.map((step, i) => {
                  const currentIdx = STEPS.indexOf(order.status);
                  const isPast = i < currentIdx;
                  const isCurrent = i === currentIdx;
                  const isLast = i === STEPS.length - 1;
                  return (
                    <div key={step} className="flex items-start flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-3 h-3 rounded-full border-2 transition-colors ${
                            isPast || isCurrent
                              ? "bg-orange-400 border-orange-400"
                              : "bg-white border-stone-300"
                          }`}
                        />
                        <p className={`text-[10px] mt-1.5 text-center leading-tight ${
                          isCurrent ? "font-bold text-orange-600" :
                          isPast ? "text-stone-500" : "text-stone-300"
                        }`}>
                          {statusLabel[step]}
                        </p>
                      </div>
                      {!isLast && (
                        <div className={`h-0.5 flex-1 mt-1.5 mx-0.5 transition-colors ${
                          i < currentIdx ? "bg-orange-300" : "bg-stone-200"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step Context — what to do at this step */}
            {order.status === "PENDING" && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 mb-3 text-xs">
                <p className="font-semibold text-yellow-700 mb-1">📋 รอดำเนินการ</p>
                {order.payment ? (
                  order.payment.status === "PAID" ? (
                    <p className="text-yellow-600">✓ ลูกค้าชำระเงินแล้ว — กด <span className="font-semibold">ยืนยันออเดอร์</span> เพื่อเริ่มจัดส่ง</p>
                  ) : (
                    <p className="text-yellow-600">⏳ รอการชำระเงิน ({order.payment.method}) — ตรวจสอบก่อนยืนยัน</p>
                  )
                ) : (
                  <p className="text-yellow-600">ตรวจสอบการชำระเงิน แล้วกด <span className="font-semibold">ยืนยันออเดอร์</span></p>
                )}
              </div>
            )}

            {order.status === "CONFIRMED" && (
              <div className={`rounded-xl px-4 py-3 mb-3 text-xs border ${
                order.cjOrderId
                  ? "bg-blue-50 border-blue-100"
                  : "bg-amber-50 border-amber-100"
              }`}>
                {order.cjOrderId ? (
                  <>
                    <p className="font-semibold text-blue-700 mb-1">🚚 CJ Order สร้างแล้ว</p>
                    <p className="font-mono text-blue-800 mb-1">{order.cjOrderId}</p>
                    {order.cjStatus && (
                      <p className="text-blue-500 mb-1">สถานะ CJ: <span className="font-medium text-blue-700">{order.cjStatus}</span></p>
                    )}
                    <ol className="text-blue-600 space-y-1 mb-2 list-none">
                      <li>1. ไปที่ CJ Dashboard → เลือก order นี้ → <span className="font-semibold">ชำระเงิน</span> (tick checkbox แล้วกด Pay)</li>
                      <li>2. รอ CJ เปลี่ยนสถานะ: Picking → Processing → <span className="font-semibold">Dispatched</span></li>
                      <li>3. กลับมาหน้านี้ → กด <span className="font-semibold">🔄 Sync จาก CJ</span> เพื่อรับ tracking number</li>
                      <li>4. เมื่อได้ tracking แล้ว → กด <span className="font-semibold">→ จัดส่งแล้ว</span></li>
                    </ol>
                    <a
                      href="https://app.cjdropshipping.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 font-medium"
                    >
                      ไปที่ CJ Dashboard →
                    </a>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-700 mb-1">⚠️ ไม่มี CJ Order</p>
                    <p className="text-amber-600">สินค้านี้ไม่ผ่าน CJ หรือสร้าง order ไม่สำเร็จ — จัดการส่งเอง แล้วกดเปลี่ยนเป็น "จัดส่งแล้ว"</p>
                  </>
                )}
              </div>
            )}

            {order.status === "SHIPPING" && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-3 text-xs">
                <p className="font-semibold text-purple-700 mb-1">📦 กำลังจัดส่ง</p>
                {order.trackingNumber ? (
                  <>
                    <p className="font-mono text-purple-900 text-sm font-semibold mb-0.5">{order.trackingNumber}</p>
                    {order.trackingCarrier && (
                      <p className="text-purple-500 mb-1">ขนส่ง: {order.trackingCarrier}</p>
                    )}
                    <a
                      href={`https://t.17track.net/th#nums=${order.trackingNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 underline hover:text-purple-800 font-medium"
                    >
                      ติดตามพัสดุ (17track) →
                    </a>
                    <p className="text-purple-500 mt-2">รอลูกค้าได้รับสินค้า แล้วกด <span className="font-semibold">ส่งแล้ว</span></p>
                  </>
                ) : (
                  <div>
                    {order.cjOrderId ? (
                      <p className="text-purple-600 mb-2">รอ tracking จาก CJ — กด Sync หากยังไม่อัปเดต</p>
                    ) : null}
                    <p className="text-purple-500 mb-2">กรอก tracking number ด้านล่าง:</p>
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Tracking number"
                      className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 mb-1.5"
                    />
                    <input
                      type="text"
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      placeholder="ชื่อขนส่ง เช่น CJPACKET, Kerry, Flash (ถ้ามี)"
                      className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-200 mb-2"
                    />
                    <button
                      onClick={handleSaveTracking}
                      disabled={savingTracking || !trackingInput.trim()}
                      className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                    >
                      {savingTracking ? "กำลังบันทึก..." : "💾 บันทึก Tracking"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {order.status === "DELIVERED" && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-3 text-xs">
                <p className="font-semibold text-green-700">✓ ออเดอร์เสร็จสมบูรณ์</p>
                <p className="text-green-600 mt-0.5">ลูกค้าได้รับสินค้าแล้ว</p>
              </div>
            )}

            {/* Action Buttons */}
            {(() => {
              const nextStatus = NEXT_STATUS[order.status];
              const canCancel = ["PENDING", "CONFIRMED"].includes(order.status);
              return (
                <div className="space-y-2">
                  {nextStatus && (
                    <button
                      onClick={() => handleUpdateStatus(nextStatus)}
                      disabled={saving || checking}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {checking
                        ? "กำลังตรวจสต็อก..."
                        : saving
                        ? "กำลังบันทึก..."
                        : `→ เปลี่ยนเป็น ${statusLabel[nextStatus]}`}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => {
                        if (confirm("ยืนยันยกเลิกออเดอร์นี้?")) commitStatus("CANCELLED");
                      }}
                      disabled={saving}
                      className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      ✕ ยกเลิกออเดอร์
                    </button>
                  )}
                  {!nextStatus && order.status !== "CANCELLED" && (
                    <p className="text-center text-xs text-stone-400 py-1">ออเดอร์เสร็จสมบูรณ์แล้ว</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-3">ข้อมูลลูกค้า</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-400">ชื่อ: </span>
                <span className="text-stone-700">{order.user.name}</span>
              </div>
              <div>
                <span className="text-stone-400">อีเมล: </span>
                <span className="text-stone-700">{order.user.email}</span>
              </div>
              <div>
                <span className="text-stone-400">โทร: </span>
                <span className="text-stone-700">{order.phone}</span>
              </div>
              <div>
                <span className="text-stone-400">ที่อยู่: </span>
                <span className="text-stone-700">
                  {order.address}
                  {order.city && ` แขวง/ตำบล ${order.city}`}
                  {order.province && ` ${order.province}`}
                  {order.zipCode && ` ${order.zipCode}`}
                </span>
              </div>
              {order.note && (
                <div>
                  <span className="text-stone-400">หมายเหตุ: </span>
                  <span className="text-stone-700">{order.note}</span>
                </div>
              )}
            </div>
          </div>

          {/* CJ Dropshipping */}
          {order.cjOrderId && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-blue-800">🚚 CJDropshipping</h2>
                <button
                  onClick={handleSyncTracking}
                  disabled={syncing}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  {syncing ? "กำลัง Sync..." : "🔄 Sync จาก CJ"}
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-blue-600">CJ Order ID: </span>
                  <span className="font-mono font-semibold text-blue-900">{order.cjOrderId}</span>
                </div>
                {order.cjStatus && (
                  <div>
                    <span className="text-blue-600">สถานะ CJ: </span>
                    <span className="text-blue-900">{order.cjStatus}</span>
                  </div>
                )}
                {order.trackingNumber && (
                  <div>
                    <span className="text-blue-600">Tracking: </span>
                    <span className="font-mono font-semibold text-blue-900">{order.trackingNumber}</span>
                    {order.trackingCarrier && (
                      <span className="ml-1 text-xs text-blue-500">({order.trackingCarrier})</span>
                    )}
                  </div>
                )}
                {order.trackingNumber && (
                  <a
                    href={`https://t.17track.net/th#nums=${order.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-blue-600 underline hover:text-blue-800"
                  >
                    ติดตามพัสดุ (17track) →
                  </a>
                )}
                <a
                  href="https://app.cjdropshipping.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-blue-600 underline hover:text-blue-800"
                >
                  ดูใน CJ Dashboard →
                </a>
              </div>
            </div>
          )}

          {/* CJ API Logs */}
          {cjLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-semibold text-stone-800 mb-3">📋 CJ Logs</h2>
              <div className="space-y-2">
                {cjLogs.map((log) => (
                  <div key={log.id} className="border border-stone-100 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-stone-50 transition-colors"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${log.success ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {log.success ? "✓" : "✗"}
                        </span>
                        <span className="font-mono text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-600">{log.action}</span>
                        <span className="text-stone-400 text-xs">
                          {new Date(log.createdAt).toLocaleString("th-TH", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      </div>
                      <span className="text-stone-300 text-xs">{expandedLog === log.id ? "▲" : "▼"}</span>
                    </div>
                    {log.error && (
                      <div className="px-4 pb-2 text-xs text-red-500 font-mono">{log.error}</div>
                    )}
                    {expandedLog === log.id && (
                      <div className="border-t border-stone-100 divide-y divide-stone-50">
                        {log.request !== null && (
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-stone-400 mb-1">Request →</p>
                            <pre className="text-[10px] text-stone-600 bg-stone-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(log.request, null, 2)}</pre>
                          </div>
                        )}
                        {log.response !== null && (
                          <div className="px-4 py-3">
                            <p className="text-xs font-semibold text-stone-400 mb-1">Response ←</p>
                            <pre className="text-[10px] text-stone-600 bg-stone-50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(log.response, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-semibold text-stone-800 mb-3">การชำระเงิน</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">วิธีชำระ:</span>
                  <span className="text-stone-700">{order.payment.method}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">สถานะ:</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    order.payment.status === "PAID" ? "bg-green-100 text-green-700" :
                    order.payment.status === "REFUNDED" ? "bg-purple-100 text-purple-700" :
                    order.payment.status === "FAILED" ? "bg-red-100 text-red-600" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {order.payment.status === "PAID" ? "✓ ชำระแล้ว" :
                     order.payment.status === "REFUNDED" ? "↩ คืนเงินแล้ว" :
                     order.payment.status === "FAILED" ? "✗ ล้มเหลว" : "รอชำระ"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">จำนวน:</span>
                  <span className="font-semibold text-stone-800">
                    ฿{order.payment.amount.toLocaleString("th-TH")}
                  </span>
                </div>
              </div>
              {/* Refund button — Stripe only, paid, not yet refunded */}
              {order.payment.method === "STRIPE" && order.payment.status === "PAID" && (
                <button
                  onClick={handleRefund}
                  disabled={refunding}
                  className="mt-4 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {refunding ? "กำลังคืนเงิน..." : "↩ คืนเงิน (Stripe Refund)"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stock Check + Cost Estimate Modal */}
      {stockModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-stone-100">
              <h2 className="text-lg font-bold text-stone-800">ตรวจสอบก่อนยืนยัน</h2>
              {stockModal.stockCheck && (
                <p className="text-xs text-stone-400 mt-1">
                  {stockModal.stockCheck.cjApiAvailable
                    ? "ข้อมูลสต็อก CJ แบบ real-time"
                    : "ข้อมูลสต็อกจากฐานข้อมูลภายใน"}
                </p>
              )}
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Stock Check */}
              {stockModal.stockCheck === null ? (
                <p className="text-sm text-stone-500 text-center py-2">ไม่มีสินค้า CJ ในออเดอร์นี้</p>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">สต็อก</p>
                  <div className="space-y-2">
                    {stockModal.stockCheck.items.map((item, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
                          item.ok ? "bg-green-50 border border-green-100" : "bg-red-50 border border-red-200"
                        }`}
                      >
                        <div className="flex-1 min-w-0 mr-3">
                          <p className="font-medium text-stone-800 truncate">{item.name}</p>
                          <p className="text-xs text-stone-400 mt-0.5">
                            ต้องการ {item.quantity} ชิ้น
                            {" · "}
                            <span className={item.source === "CJ" ? "text-blue-500" : "text-stone-400"}>
                              {item.source === "CJ" ? "CJ" : "คลัง"}
                            </span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-semibold ${item.ok ? "text-green-600" : "text-red-600"}`}>
                            {item.ok ? "✓" : "✗"} {item.available} ชิ้น
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {!stockModal.stockCheck.ok && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-red-700 mb-1">สต็อกไม่เพียงพอ</p>
                      {stockModal.stockCheck.outOfStock.map((msg, i) => (
                        <p key={i} className="text-xs text-red-600">{msg}</p>
                      ))}
                    </div>
                  )}

                  {stockModal.stockCheck.ok && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <p className="text-sm font-semibold text-green-700">✓ สต็อกเพียงพอ</p>
                    </div>
                  )}
                </div>
              )}

              {/* Cost & Margin Estimate */}
              {stockModal.costEstimate && (
                <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
                    💰 ประมาณการต้นทุน & กำไร
                  </p>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-stone-600">
                      <span>ต้นทุนสินค้า CJ</span>
                      <span className="font-medium">
                        ฿{stockModal.costEstimate.itemsCostTHB.toLocaleString()}
                        <span className="text-xs text-stone-400 ml-1">(~${stockModal.costEstimate.itemsCostUSD})</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>
                        ค่าส่ง ({stockModal.costEstimate.logistic})
                        {stockModal.costEstimate.freightFallback && (
                          <span className="text-xs text-amber-500 ml-1">*ประมาณ</span>
                        )}
                      </span>
                      <span className="font-medium">
                        ฿{stockModal.costEstimate.freightTHB.toLocaleString()}
                        <span className="text-xs text-stone-400 ml-1">(~${stockModal.costEstimate.freightTotalUSD})</span>
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-stone-700 border-t border-stone-200 pt-1.5">
                      <span>รวมต้นทุน{stockModal.costEstimate.freightFallback && <span className="text-amber-500 font-normal text-xs ml-1">*ประมาณ</span>}</span>
                      <span>฿{stockModal.costEstimate.totalCostTHB.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>ลูกค้าจ่าย</span>
                      <span className="font-medium text-orange-500">฿{order.total.toLocaleString("th-TH")}</span>
                    </div>
                    <div className={`flex justify-between font-bold border-t border-stone-200 pt-1.5 ${
                      stockModal.costEstimate.estimatedMarginTHB >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      <span>กำไรประมาณ{stockModal.costEstimate.freightFallback && <span className="text-amber-500 font-normal text-xs ml-1">*ประมาณ</span>}</span>
                      <span>
                        {stockModal.costEstimate.estimatedMarginTHB >= 0 ? "+" : ""}
                        ฿{stockModal.costEstimate.estimatedMarginTHB.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {stockModal.costEstimate.freightFallback && (
                    <p className="text-xs text-stone-400 mt-2">
                      * ค่าส่งเป็นประมาณการ (0.3 kg/ชิ้น × $3/kg) เนื่องจาก CJ API ไม่ตอบ — ดูราคาจริงใน CJ Dashboard
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
              <button
                onClick={() => setStockModal({ open: false, stockCheck: null, costEstimate: null, pendingStatus: "" })}
                className="flex-1 border border-stone-200 text-stone-600 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  const isInsufficient = stockModal.stockCheck && !stockModal.stockCheck.ok;
                  commitStatus(stockModal.pendingStatus, !!isInsufficient);
                }}
                disabled={saving}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors text-white disabled:opacity-50 ${
                  stockModal.stockCheck && !stockModal.stockCheck.ok
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >
                {saving
                  ? "กำลังยืนยัน..."
                  : stockModal.stockCheck && !stockModal.stockCheck.ok
                  ? "ยืนยันต่อแม้สต็อกไม่พอ"
                  : "ยืนยันออเดอร์"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
