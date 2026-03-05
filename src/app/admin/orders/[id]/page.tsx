"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import { PAYMENT_METHOD_LABEL } from "@/lib/utils";

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
  selfTrackingNumber: string | null;
  selfTrackingCarrier: string | null;
  createdAt: string;
  statusHistory: { status: string; timestamp: string }[] | null;
  user: { name: string; email: string; phone: string | null };
  items: {
    id: string;
    quantity: number;
    price: number;
    productName: string | null;
    variantLabel: string | null;
    source: string | null;
    fulfillmentMethod: string | null;
    product: { id: string; name: string; images: string[]; cjProductId: string | null };
    variant: { id: string; cjVid: string | null; size: string | null; color: string | null; sku: string | null; variantImage: string | null; fulfillmentMethod: string | null } | null;
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
const STEP_ICON: Record<string, string> = {
  PENDING: "📋", CONFIRMED: "🔖", SHIPPING: "🚚", DELIVERED: "📦",
};
const NEXT_STATUS: Record<string, string | null> = {
  PENDING: "CONFIRMED",
  CONFIRMED: "SHIPPING",
  SHIPPING: "DELIVERED",
  DELIVERED: null,
  CANCELLED: null,
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
  const [markingPaid, setMarkingPaid] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [savingTracking, setSavingTracking] = useState(false);
  const [selfTrackingInput, setSelfTrackingInput] = useState("");
  const [selfTrackingCarrierInput, setSelfTrackingCarrierInput] = useState("");
  const [savingSelfTracking, setSavingSelfTracking] = useState(false);
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

  const handleMarkCodPaid = async () => {
    if (!order || order.payment?.method !== "COD") return;
    if (!confirm(`ยืนยันรับเงิน COD ฿${order.payment.amount.toLocaleString("th-TH")} แล้ว?`)) return;
    setMarkingPaid(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}/mark-paid`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกรับเงิน COD แล้ว");
        setOrder((o) => o ? { ...o, payment: o.payment ? { ...o.payment, status: "PAID" } : null } : o);
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setMarkingPaid(false);
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

  const handleSaveSelfTracking = async () => {
    if (!order || !selfTrackingInput.trim()) return;
    // Pure self-ship order → save to trackingNumber (visible to customer)
    // Mixed order (has CJ items) → save to selfTrackingNumber (separate from CJ tracking)
    const hasCJItems = order.items.some((item) => { const fm = item.fulfillmentMethod ?? item.variant?.fulfillmentMethod ?? item.source; return fm === "CJ" || (!item.fulfillmentMethod && fm !== "SELF" && !!(item.variant?.cjVid || item.product.cjProductId)); });
    const trackingField = hasCJItems ? "selfTrackingNumber" : "trackingNumber";
    const carrierField = hasCJItems ? "selfTrackingCarrier" : "trackingCarrier";
    setSavingSelfTracking(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: order.status,
          [trackingField]: selfTrackingInput.trim(),
          [carrierField]: selfTrackingCarrierInput.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึก tracking ส่งเองแล้ว");
        setOrder((o) => o ? { ...o, [trackingField]: selfTrackingInput.trim(), [carrierField]: selfTrackingCarrierInput.trim() || null } : o);
        setSelfTrackingInput("");
        setSelfTrackingCarrierInput("");
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("ไม่สามารถบันทึกได้");
    } finally {
      setSavingSelfTracking(false);
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
          {order.status === "DELIVERED" ? (() => {
            const deliveredEntry = order.statusHistory?.find((h) => h.status === "DELIVERED");
            if (!deliveredEntry) return null;
            const days = Math.floor((new Date(deliveredEntry.timestamp).getTime() - new Date(order.createdAt).getTime()) / 86400000);
            return <p className="text-xs font-semibold text-green-600 mt-0.5">📦 ได้ของใน {days} วัน</p>;
          })() : order.status !== "CANCELLED" ? (() => {
            const days = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000);
            const label = days === 0 ? "วันนี้" : `รอมา ${days} วัน`;
            const color = days >= 7 ? "text-red-600" : days >= 3 ? "text-orange-500" : "text-stone-600";
            return <p className={`text-xs font-semibold mt-0.5 ${color}`}>⏳ {label}</p>;
          })() : null}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">👤 ข้อมูลลูกค้า</h2>
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

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800 flex items-center gap-2">🛍️ รายการสินค้า</h2>
            </div>
            {(() => {
              const classifyItem = (item: Order["items"][0]) => {
                const fm = item.fulfillmentMethod ?? item.variant?.fulfillmentMethod ?? item.source;
                if (fm === "SUPPLIER") return "supplier" as const;
                if (fm === "CJ") return "cj" as const;
                if (!item.fulfillmentMethod && fm !== "SELF" && !!(item.variant?.cjVid || item.product.cjProductId)) return "cj" as const;
                return "self" as const;
              };
              const cjItems = order.items.filter(i => classifyItem(i) === "cj");
              const selfItems = order.items.filter(i => classifyItem(i) === "self");
              const supplierItems = order.items.filter(i => classifyItem(i) === "supplier");
              const isMixed = (cjItems.length > 0 && selfItems.length > 0) || supplierItems.length > 0;
              const showTracking = ["SHIPPING", "DELIVERED"].includes(order.status);

              const renderItemRow = (item: Order["items"][0], idx: number) => {
                const itemType = classifyItem(item);
                const fmBadge = itemType === "cj"
                  ? <span className="text-[9px] font-bold text-blue-600 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded shrink-0">🏭 CJ</span>
                  : itemType === "supplier"
                  ? <span className="text-[9px] font-bold text-purple-600 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded shrink-0">📦 SUP</span>
                  : <span className="text-[9px] font-bold text-orange-600 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded shrink-0">✋ เอง</span>;
                return (
                  <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                      {(item.variant?.variantImage || item.product.images[0]) ? (
                        <Image src={item.variant?.variantImage ?? item.product.images[0]} alt={item.productName ?? item.product.name} fill className="object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-stone-300 text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-stone-400">#{idx + 1}</span>
                        {fmBadge}
                        <p className="font-medium text-stone-800 truncate">{item.productName ?? item.product.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(item.variantLabel || item.variant?.size || item.variant?.color) && (
                          <span className="text-[9px] bg-stone-50 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                            {item.variantLabel ?? [item.variant?.size, item.variant?.color].filter(Boolean).join(" / ")}
                          </span>
                        )}
                        {item.variant?.sku && (
                          <span className="text-[9px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded">SKU: {item.variant.sku}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="text-[9px] font-mono text-stone-300 select-all">P:{item.product.id.slice(-8)}</span>
                        {item.variant && <span className="text-[9px] font-mono text-stone-300 select-all">V:{item.variant.id.slice(-8)}</span>}
                        {item.variant?.cjVid && <span className="text-[9px] font-mono text-blue-300 select-all">CJ-V:{item.variant.cjVid.slice(-10)}</span>}
                        {item.product.cjProductId && <span className="text-[9px] font-mono text-blue-300 select-all">CJ-P:{item.product.cjProductId.slice(-10)}</span>}
                        <span className="text-sm text-stone-400">{item.quantity} × ฿{item.price.toLocaleString("th-TH")}</span>
                      </div>
                    </div>
                    <p className="font-semibold text-stone-800 shrink-0">฿{(item.quantity * item.price).toLocaleString("th-TH")}</p>
                  </div>
                );
              };

              const renderGroup = (
                items: Order["items"],
                type: "cj" | "self" | "supplier",
                startIdx: number
              ) => {
                const bgColor = type === "cj" ? "bg-blue-50/50" : type === "self" ? "bg-orange-50/40" : "bg-purple-50/40";
                const borderColor = type === "cj" ? "border-blue-100" : type === "self" ? "border-orange-100" : "border-purple-100";
                const label = type === "cj" ? "🏭 CJ Dropshipping" : type === "self" ? "✋ ส่งเอง" : "📦 Supplier";
                const labelColor = type === "cj" ? "text-blue-600" : type === "self" ? "text-orange-600" : "text-purple-600";
                return (
                  <div key={type} className={`${bgColor} border-b ${borderColor}`}>
                    {isMixed && (
                      <div className={`px-5 pt-3 pb-1 text-[11px] font-semibold ${labelColor}`}>{label}</div>
                    )}
                    <div className="divide-y divide-stone-50/80">
                      {items.map((item, i) => renderItemRow(item, startIdx + i))}
                    </div>
                    {/* Tracking footer per group */}
                    {showTracking && type === "cj" && (
                      <div className="px-5 py-2.5 border-t border-blue-100 space-y-1">
                        {order.cjOrderId ? (
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-medium text-blue-600">CJ Order:</span>
                            <span className="font-mono text-blue-500 select-all">{order.cjOrderId}</span>
                            {order.cjStatus && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold text-[10px]">{order.cjStatus}</span>}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600">⚠ ยังไม่มี CJ order</p>
                        )}
                        {order.trackingNumber && (
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="font-medium text-blue-500">📦 Tracking:</span>
                            <span className="font-mono text-blue-700 select-all font-semibold">{order.trackingNumber}</span>
                            {order.trackingCarrier && <span className="text-blue-400">({order.trackingCarrier})</span>}
                            <a href={`https://t.17track.net/th#nums=${order.trackingNumber}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">ติดตาม →</a>
                          </div>
                        )}
                      </div>
                    )}
                    {showTracking && type === "self" && (order.selfTrackingNumber || (!order.cjOrderId && order.trackingNumber)) && (
                      <div className="px-5 py-2.5 border-t border-orange-100 space-y-1">
                        {(() => {
                          const trk = order.selfTrackingNumber ?? order.trackingNumber;
                          const cr = order.selfTrackingCarrier ?? order.trackingCarrier;
                          return (
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              <span className="font-medium text-orange-500">📦 Tracking:</span>
                              <span className="font-mono text-orange-700 select-all font-semibold">{trk}</span>
                              {cr && <span className="text-orange-400">({cr})</span>}
                              <a href={`https://t.17track.net/th#nums=${trk}`} target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">ติดตาม →</a>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                );
              };

              let idx = 0;
              return (
                <>
                  {cjItems.length > 0 && renderGroup(cjItems, "cj", (idx += 0, idx))}
                  {selfItems.length > 0 && renderGroup(selfItems, "self", (idx += cjItems.length, idx))}
                  {supplierItems.length > 0 && renderGroup(supplierItems, "supplier", (idx += selfItems.length, idx))}
                </>
              );
            })()}
            <div className="px-5 py-4 border-t border-stone-100 flex justify-between">
              <span className="font-semibold text-stone-800">รวมทั้งสิ้น</span>
              <span className="font-bold text-lg text-orange-500">฿{order.total.toLocaleString("th-TH")}</span>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-semibold text-stone-800 mb-3 flex items-center gap-2">💳 การชำระเงิน</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400">วิธีชำระ:</span>
                  <span className="text-stone-700">
                    {PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}
                  </span>
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
              {order.payment.method === "STRIPE" && order.payment.status === "PAID" && (
                <button onClick={handleRefund} disabled={refunding}
                  className="mt-4 w-full py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50">
                  {refunding ? "กำลังคืนเงิน..." : "↩ คืนเงิน (Stripe Refund)"}
                </button>
              )}
              {order.payment.method === "COD" && order.payment.status === "PENDING" && (
                <button onClick={handleMarkCodPaid} disabled={markingPaid}
                  className="mt-4 w-full py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {markingPaid ? "กำลังบันทึก..." : "✓ รับเงิน COD แล้ว"}
                </button>
              )}
            </div>
          )}

          {/* Status Update */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-4 flex items-center gap-2">📋 สถานะคำสั่งซื้อ</h2>

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
                  const ts = step === "PENDING"
                    ? order.createdAt
                    : order.statusHistory?.find((h) => h.status === step)?.timestamp ?? null;

                  let durationLabel = "";
                  if (!isLast && isPast) {
                    const nextStep = STEPS[i + 1];
                    const tsNext = order.statusHistory?.find((h) => h.status === nextStep)?.timestamp ?? null;
                    if (ts && tsNext) {
                      const ms = new Date(tsNext).getTime() - new Date(ts).getTime();
                      const totalMins = Math.floor(ms / 60000);
                      const hours = Math.floor(totalMins / 60);
                      const days = Math.floor(hours / 24);
                      if (days > 0) {
                        const remHours = hours % 24;
                        durationLabel = remHours > 0 ? `${days}ว ${remHours}ชม.` : `${days}ว`;
                      } else if (hours > 0) {
                        const remMins = totalMins % 60;
                        durationLabel = remMins > 0 ? `${hours}ชม. ${remMins}น.` : `${hours}ชม.`;
                      } else {
                        durationLabel = totalMins <= 0 ? "<1น." : `${totalMins}น.`;
                      }
                    }
                  }

                  return (
                    <div key={step} className="flex-1 flex flex-col items-center">
                      {/* Top: circle + connector */}
                      <div className="flex items-center w-full">
                        {i > 0 && (
                          <div className={`flex-1 h-0.5 ${isPast || isCurrent ? "bg-green-400" : "bg-stone-200"}`} />
                        )}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border-2 transition-all ${
                          isPast ? "bg-green-500 border-green-500 text-white"
                          : isCurrent ? "bg-orange-500 border-orange-500 text-white ring-4 ring-orange-100"
                          : "bg-white border-stone-200 text-stone-300"
                        }`}>
                          {isPast ? "✓" : STEP_ICON[step]}
                        </div>
                        {!isLast && (
                          <div className={`flex-1 h-0.5 ${isPast ? "bg-green-400" : "bg-stone-200"}`} />
                        )}
                      </div>
                      {/* Bottom: label + timestamp */}
                      <div className="mt-1.5 text-center px-1">
                        <p className={`text-xs font-semibold leading-tight ${
                          isCurrent ? "text-orange-600" : isPast ? "text-green-700" : "text-stone-300"
                        }`}>
                          {statusLabel[step]}
                        </p>
                        {ts && (isPast || isCurrent) ? (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            {new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                            {" "}{new Date(ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        ) : (
                          <p className="text-[10px] text-stone-300 mt-0.5">รอ</p>
                        )}
                        {durationLabel && (
                          <p className="text-[9px] text-green-600 font-medium mt-0.5">⏱ {durationLabel}</p>
                        )}
                      </div>
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
                  order.payment.method === "COD" ? (
                    <p className="text-yellow-600">💵 COD — ลูกค้าจ่ายเงินปลายทาง ตรวจสอบออเดอร์แล้วกด <span className="font-semibold">ยืนยันออเดอร์</span></p>
                  ) : order.payment.status === "PAID" ? (
                    <p className="text-yellow-600">✓ ลูกค้าชำระเงินแล้ว — กด <span className="font-semibold">ยืนยันออเดอร์</span> เพื่อเริ่มจัดส่ง</p>
                  ) : (
                    <p className="text-yellow-600">⏳ รอการชำระเงิน ({order.payment.method}) — ตรวจสอบก่อนยืนยัน</p>
                  )
                ) : (
                  <p className="text-yellow-600">ตรวจสอบการชำระเงิน แล้วกด <span className="font-semibold">ยืนยันออเดอร์</span></p>
                )}
              </div>
            )}

            {["CONFIRMED", "SHIPPING", "DELIVERED"].includes(order.status) && (() => {
              const isCJItem = (item: Order["items"][number]) => {
                const fm = item.fulfillmentMethod ?? item.variant?.fulfillmentMethod ?? item.source;
                if (fm === "CJ") return true;
                if (!item.fulfillmentMethod && fm !== "SELF" && !!(item.variant?.cjVid || item.product.cjProductId)) return true;
                return false;
              };
              const selfItems = order.items.filter((item) => !isCJItem(item));
              const hasCJItems = order.items.some(isCJItem);
              return (
                <div className="space-y-2 mb-3">
                  {/* CJ section */}
                  {hasCJItems && (() => {
                    const cjItems = order.items.filter(isCJItem);
                    return (
                      <div className={`rounded-xl px-4 py-3 text-xs border ${order.cjOrderId ? "bg-blue-50 border-blue-100" : "bg-amber-50 border-amber-100"}`}>
                        {order.cjOrderId ? (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-blue-700">🚚 CJ Order สร้างแล้ว</p>
                              <button
                                onClick={handleSyncTracking}
                                disabled={syncing}
                                className="text-[10px] px-2 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium transition-colors disabled:opacity-50"
                              >
                                {syncing ? "กำลัง Sync..." : "🔄 Sync จาก CJ"}
                              </button>
                            </div>
                            <p className="font-mono text-blue-800 mb-1">{order.cjOrderId}</p>
                            {order.cjStatus && <p className="text-blue-500 mb-1">สถานะ CJ: <span className="font-medium text-blue-700">{order.cjStatus}</span></p>}
                            {order.trackingNumber && (
                              <p className="text-blue-500 mb-1">Tracking: <span className="font-mono font-semibold text-blue-800">{order.trackingNumber}</span>{order.trackingCarrier && <span className="ml-1 text-blue-400">({order.trackingCarrier})</span>}</p>
                            )}
                            <div className="bg-white rounded-lg border border-blue-100 mb-2 divide-y divide-blue-50">
                              {cjItems.map((item) => {
                                const img = item.variant?.variantImage || item.product.images[0];
                                return (
                                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-blue-50 shrink-0">
                                      {img ? <Image src={img} alt="" fill className="object-cover" sizes="56px" /> : <div className="flex items-center justify-center h-full text-blue-200 text-xl">📦</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-stone-800 truncate text-xs">{item.productName ?? item.product.name}</p>
                                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                        {(item.variantLabel || item.variant?.size || item.variant?.color) && (
                                          <span className="text-[9px] bg-stone-50 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                                            {item.variantLabel ?? [item.variant?.size, item.variant?.color].filter(Boolean).join(" / ")}
                                          </span>
                                        )}
                                        {item.variant?.sku && (
                                          <span className="text-[9px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded">SKU: {item.variant.sku}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] font-mono text-stone-300 select-all">P:{item.product.id.slice(-8)}</span>
                                        {item.variant && <span className="text-[9px] font-mono text-stone-300 select-all">V:{item.variant.id.slice(-8)}</span>}
                                        <span className="text-sm text-stone-400">{item.quantity} × ฿{item.price.toLocaleString("th-TH")}</span>
                                      </div>
                                    </div>
                                    <p className="font-semibold text-stone-800 shrink-0">฿{(item.quantity * item.price).toLocaleString("th-TH")}</p>
                                  </div>
                                );
                              })}
                            </div>
                            <ol className="text-blue-600 space-y-1 mb-2 list-none">
                              <li>1. ไปที่ CJ Dashboard → เลือก order นี้ → <span className="font-semibold">ชำระเงิน</span></li>
                              <li>2. รอ CJ เปลี่ยนสถานะ → <span className="font-semibold">Dispatched</span></li>
                              <li>3. กด <span className="font-semibold">🔄 Sync จาก CJ</span> เพื่อรับ tracking</li>
                              <li>4. กด <span className="font-semibold">→ กำลังจัดส่ง</span></li>
                            </ol>
                            <a href="https://app.cjdropshipping.com" target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 font-medium">
                              ไปที่ CJ Dashboard →
                            </a>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-amber-700 mb-1">⚠️ CJ Order ยังไม่ถูกสร้าง</p>
                            <div className="bg-white rounded-lg border border-amber-100 mb-2 divide-y divide-amber-50">
                              {cjItems.map((item) => {
                                const img = item.variant?.variantImage || item.product.images[0];
                                return (
                                  <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-amber-50 shrink-0">
                                      {img ? <Image src={img} alt="" fill className="object-cover" sizes="56px" /> : <div className="flex items-center justify-center h-full text-amber-200 text-xl">📦</div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-stone-800 truncate text-xs">{item.productName ?? item.product.name}</p>
                                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                        {(item.variantLabel || item.variant?.size || item.variant?.color) && (
                                          <span className="text-[9px] bg-stone-50 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                                            {item.variantLabel ?? [item.variant?.size, item.variant?.color].filter(Boolean).join(" / ")}
                                          </span>
                                        )}
                                        {item.variant?.sku && (
                                          <span className="text-[9px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded">SKU: {item.variant.sku}</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] font-mono text-stone-300 select-all">P:{item.product.id.slice(-8)}</span>
                                        {item.variant && <span className="text-[9px] font-mono text-stone-300 select-all">V:{item.variant.id.slice(-8)}</span>}
                                        <span className="text-sm text-stone-400">{item.quantity} × ฿{item.price.toLocaleString("th-TH")}</span>
                                      </div>
                                    </div>
                                    <p className="font-semibold text-stone-800 shrink-0">฿{(item.quantity * item.price).toLocaleString("th-TH")}</p>
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-amber-600">มีสินค้า CJ แต่ยังไม่มี CJ order — ดู <span className="font-semibold">CJ Logs</span> หรือยืนยันออเดอร์ใหม่เพื่อ retry</p>
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* Self-ship section */}
                  {selfItems.length > 0 && (
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs">
                      <p className="font-semibold text-green-700 mb-2">✋ ส่งเอง — {selfItems.length} รายการ</p>
                      <div className="bg-white rounded-lg border border-green-100 mb-2 divide-y divide-green-50">
                        {selfItems.map((item) => {
                          const img = item.variant?.variantImage || item.product.images[0];
                          return (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-green-50 shrink-0">
                                {img ? <Image src={img} alt="" fill className="object-cover" sizes="56px" /> : <div className="flex items-center justify-center h-full text-green-200 text-xl">📦</div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-stone-800 truncate text-xs">{item.productName ?? item.product.name}</p>
                                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                  {(item.variantLabel || item.variant?.size || item.variant?.color) && (
                                    <span className="text-[9px] bg-stone-50 text-stone-500 border border-stone-200 px-1.5 py-0.5 rounded font-mono">
                                      {item.variantLabel ?? [item.variant?.size, item.variant?.color].filter(Boolean).join(" / ")}
                                    </span>
                                  )}
                                  {item.variant?.sku && (
                                    <span className="text-[9px] font-mono text-stone-400 bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded">SKU: {item.variant.sku}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[9px] font-mono text-stone-300 select-all">P:{item.product.id.slice(-8)}</span>
                                  {item.variant && <span className="text-[9px] font-mono text-stone-300 select-all">V:{item.variant.id.slice(-8)}</span>}
                                  <span className="text-sm text-stone-400">{item.quantity} × ฿{item.price.toLocaleString("th-TH")}</span>
                                </div>
                              </div>
                              <p className="font-semibold text-stone-800 shrink-0">฿{(item.quantity * item.price).toLocaleString("th-TH")}</p>
                            </div>
                          );
                        })}
                      </div>
                      <ol className="text-green-600 space-y-1 list-none mb-2">
                        <li>1. แพ็คสินค้า แล้วนำส่งขนส่ง (Kerry, Flash, J&T ฯลฯ)</li>
                        <li>2. กรอก tracking number ด้านล่าง แล้วกด บันทึก</li>
                        <li>3. กด <span className="font-semibold">→ กำลังจัดส่ง</span></li>
                      </ol>
                      {(() => {
                        const displayTracking = hasCJItems ? order.selfTrackingNumber : order.trackingNumber;
                        const displayCarrier = hasCJItems ? order.selfTrackingCarrier : order.trackingCarrier;
                        return displayTracking ? (
                          <div className="bg-white rounded-lg px-3 py-2 border border-green-200">
                            <p className="font-mono text-green-900 font-semibold">{displayTracking}</p>
                            {displayCarrier && <p className="text-green-500 text-[10px] mt-0.5">ขนส่ง: {displayCarrier}</p>}
                            <button
                              onClick={() => { setSelfTrackingInput(displayTracking); setSelfTrackingCarrierInput(displayCarrier ?? ""); }}
                              className="text-[10px] text-green-500 underline mt-1"
                            >แก้ไข</button>
                          </div>
                        ) : (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-stone-400 font-mono">
                            → field: <span className="font-semibold text-stone-500">{hasCJItems ? "selfTrackingNumber" : "trackingNumber"}</span>
                            {" "}{hasCJItems ? "(ลูกค้าเห็นแยกจาก CJ ✓)" : "(ลูกค้าเห็น ✓)"}
                          </p>
                          <input
                            type="text"
                            value={selfTrackingInput}
                            onChange={(e) => setSelfTrackingInput(e.target.value)}
                            placeholder="Tracking number (Kerry, Flash, J&T ฯลฯ)"
                            className="w-full border border-green-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-200"
                          />
                          <input
                            type="text"
                            value={selfTrackingCarrierInput}
                            onChange={(e) => setSelfTrackingCarrierInput(e.target.value)}
                            placeholder="ชื่อขนส่ง เช่น Kerry, Flash, J&T (ถ้ามี)"
                            className="w-full border border-green-200 rounded-lg px-3 py-1.5 text-xs text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-200"
                          />
                          <button
                            onClick={handleSaveSelfTracking}
                            disabled={savingSelfTracking || !selfTrackingInput.trim()}
                            className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            {savingSelfTracking ? "กำลังบันทึก..." : "💾 บันทึก Tracking"}
                          </button>
                        </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })()}

            {["SHIPPING", "DELIVERED"].includes(order.status) && (
              <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-purple-700">📦 กำลังจัดส่ง</p>
                  {order.cjOrderId && (
                    <button
                      onClick={handleSyncTracking}
                      disabled={syncing}
                      className="text-[10px] px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {syncing ? "กำลัง Sync..." : "🔄 Sync จาก CJ"}
                    </button>
                  )}
                </div>
                {/* CJ tracking */}
                {order.trackingNumber && (
                  <div className="mb-2">
                    <p className="text-purple-400 mb-0.5">🏭 CJ Tracking</p>
                    <p className="font-mono text-purple-900 text-sm font-semibold">{order.trackingNumber}</p>
                    {order.trackingCarrier && <p className="text-purple-500 mt-0.5">ขนส่ง: {order.trackingCarrier}</p>}
                    <a href={`https://t.17track.net/th#nums=${order.trackingNumber}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-purple-600 underline hover:text-purple-800 font-medium mt-1">
                      ติดตามพัสดุ (17track) →
                    </a>
                  </div>
                )}
                {/* Self-ship tracking */}
                {order.selfTrackingNumber && (
                  <div className="mb-2">
                    <p className="text-green-500 mb-0.5">✋ Self-ship Tracking</p>
                    <p className="font-mono text-green-900 text-sm font-semibold">{order.selfTrackingNumber}</p>
                    {order.selfTrackingCarrier && <p className="text-green-600 mt-0.5">ขนส่ง: {order.selfTrackingCarrier}</p>}
                    <a href={`https://t.17track.net/th#nums=${order.selfTrackingNumber}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 underline hover:text-green-800 font-medium mt-1">
                      ติดตามพัสดุ (17track) →
                    </a>
                  </div>
                )}
                {(order.trackingNumber || order.selfTrackingNumber) && (
                  <p className="text-purple-500 mt-1">รอลูกค้าได้รับสินค้า แล้วกด <span className="font-semibold">ส่งแล้ว</span></p>
                )}
                {!order.trackingNumber && !order.selfTrackingNumber && (() => {
                  const _isCJ = (i: Order["items"][0]) => { const fm = i.fulfillmentMethod ?? i.variant?.fulfillmentMethod ?? i.source; return fm === "CJ" || (!i.fulfillmentMethod && fm !== "SELF" && !!(i.variant?.cjVid || i.product.cjProductId)); };
                  const _hasSelfItems = order.items.some(i => !_isCJ(i));
                  if (!_hasSelfItems) {
                    // All CJ — tracking comes from CJ sync, no manual input needed
                    return (
                      <p className="text-purple-500">
                        {order.cjOrderId ? "รอ tracking จาก CJ — กด 🔄 Sync จาก CJ เพื่ออัปเดต" : "ยังไม่มี CJ order — ยืนยันออเดอร์ใหม่เพื่อสร้าง CJ order"}
                      </p>
                    );
                  }
                  return (
                    <div>
                      {order.cjOrderId && <p className="text-purple-600 mb-2">รอ tracking จาก CJ — กด Sync หากยังไม่อัปเดต</p>}
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
                  );
                })()}
              </div>
            )}


            {order.status === "DELIVERED" && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 mb-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-green-700">✓ ออเดอร์เสร็จสมบูรณ์</p>
                  {order.cjOrderId && (
                    <button onClick={handleSyncTracking} disabled={syncing}
                      className="text-[10px] px-2 py-1 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 font-medium transition-colors disabled:opacity-50">
                      {syncing ? "กำลัง Sync..." : "🔄 Sync CJ"}
                    </button>
                  )}
                </div>
                {/* CJ order */}
                {order.cjOrderId && (
                  <div className="mb-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-green-500 font-medium">🏭 CJ:</span>
                    <span className="font-mono text-green-700 select-all">{order.cjOrderId}</span>
                    {order.cjStatus && <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-semibold">{order.cjStatus}</span>}
                  </div>
                )}
                {/* CJ tracking */}
                {order.trackingNumber && (
                  <div className="mb-2">
                    <p className="text-green-400 mb-0.5">🏭 CJ Tracking</p>
                    <p className="font-mono text-green-900 font-semibold">{order.trackingNumber}</p>
                    {order.trackingCarrier && <p className="text-green-500 mt-0.5">ขนส่ง: {order.trackingCarrier}</p>}
                    <a href={`https://t.17track.net/th#nums=${order.trackingNumber}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-green-600 underline hover:text-green-800 font-medium mt-1">
                      ติดตามพัสดุ (17track) →
                    </a>
                  </div>
                )}
                {/* Self-ship tracking */}
                {order.selfTrackingNumber && (
                  <div className="mb-2">
                    <p className="text-teal-500 mb-0.5">✋ Self-ship Tracking</p>
                    <p className="font-mono text-teal-900 font-semibold">{order.selfTrackingNumber}</p>
                    {order.selfTrackingCarrier && <p className="text-teal-600 mt-0.5">ขนส่ง: {order.selfTrackingCarrier}</p>}
                    <a href={`https://t.17track.net/th#nums=${order.selfTrackingNumber}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-600 underline hover:text-teal-800 font-medium mt-1">
                      ติดตามพัสดุ (17track) →
                    </a>
                  </div>
                )}
                {/* Edit/add tracking (same as SHIPPING) */}
                {order.items.some(i => { const fm = i.fulfillmentMethod ?? i.variant?.fulfillmentMethod ?? i.source; return fm === "CJ" || (!i.fulfillmentMethod && fm !== "SELF" && !!(i.variant?.cjVid || i.product.cjProductId)); }) && !order.trackingNumber && order.cjOrderId && (
                  <div className="mb-2">
                    <p className="text-green-600 mb-1">รอ tracking จาก CJ — กด Sync หากยังไม่อัปเดต</p>
                    <input type="text" value={trackingInput} onChange={e => setTrackingInput(e.target.value)}
                      placeholder="Tracking number (CJ)" className="w-full border border-green-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 mb-1" />
                    <input type="text" value={carrierInput} onChange={e => setCarrierInput(e.target.value)}
                      placeholder="ชื่อขนส่ง (ถ้ามี)" className="w-full border border-green-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-200 mb-1.5" />
                    <button onClick={handleSaveTracking} disabled={savingTracking || !trackingInput.trim()}
                      className="w-full bg-green-500 hover:bg-green-600 text-white rounded-lg py-1.5 font-medium transition-colors disabled:opacity-40">
                      {savingTracking ? "กำลังบันทึก..." : "💾 บันทึก CJ Tracking"}
                    </button>
                  </div>
                )}
                {(() => {
                  const _isCJItem2 = (i: Order["items"][0]) => { const fm = i.fulfillmentMethod ?? i.variant?.fulfillmentMethod ?? i.source; return fm === "CJ" || (!i.fulfillmentMethod && fm !== "SELF" && !!(i.variant?.cjVid || i.product.cjProductId)); };
                  const _hasCJ = order.items.some(_isCJItem2);
                  const hasSelfItems = order.items.some(i => !_isCJItem2(i));
                  const displayTracking = _hasCJ ? order.selfTrackingNumber : order.trackingNumber;
                  const displayCarrier = _hasCJ ? order.selfTrackingCarrier : order.trackingCarrier;
                  return !displayTracking && hasSelfItems ? (
                    <div className="mb-2 space-y-1.5">
                      <p className="text-teal-600">กรอก tracking ส่งเอง (แก้ไขได้หลังส่ง):</p>
                      <input type="text" value={selfTrackingInput} onChange={e => setSelfTrackingInput(e.target.value)}
                        placeholder="Tracking number (Kerry, Flash ฯลฯ)" className="w-full border border-teal-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
                      <input type="text" value={selfTrackingCarrierInput} onChange={e => setSelfTrackingCarrierInput(e.target.value)}
                        placeholder="ชื่อขนส่ง (ถ้ามี)" className="w-full border border-teal-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-200" />
                      <button onClick={handleSaveSelfTracking} disabled={savingSelfTracking || !selfTrackingInput.trim()}
                        className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-lg py-1.5 font-medium transition-colors disabled:opacity-40">
                        {savingSelfTracking ? "กำลังบันทึก..." : "💾 บันทึก Tracking ส่งเอง"}
                      </button>
                    </div>
                  ) : displayTracking ? (
                    <button onClick={() => { setSelfTrackingInput(displayTracking); setSelfTrackingCarrierInput(displayCarrier ?? ""); }}
                      className="text-[10px] text-teal-500 underline mb-2">แก้ไข tracking ส่งเอง</button>
                  ) : null;
                })()}
                <p className="text-green-600">ลูกค้าได้รับสินค้าแล้ว</p>
                {order.payment?.method === "COD" && order.payment.status === "PENDING" && (
                  <p className="text-amber-600 mt-1.5 font-medium">⚠️ ยังไม่ได้บันทึกรับเงิน — กด <span className="font-semibold">รับเงิน COD แล้ว</span> ด้านล่าง</p>
                )}
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
                    {stockModal.costEstimate.freightFallback ? (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        <span className="text-amber-500 text-base shrink-0">⚠️</span>
                        <div>
                          <p className="text-xs text-amber-700 font-medium">ไม่สามารถดึงข้อมูลค่าส่งจาก CJ ได้</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            ดูค่าส่งจริงได้ที่{" "}
                            <a
                              href="https://app.cjdropshipping.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline font-medium hover:text-amber-800"
                            >
                              CJ Dashboard →
                            </a>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-stone-600">
                        <span>ค่าส่ง ({stockModal.costEstimate.logistic})</span>
                        <span className="font-medium">
                          ฿{stockModal.costEstimate.freightTHB.toLocaleString()}
                          <span className="text-xs text-stone-400 ml-1">(~${stockModal.costEstimate.freightTotalUSD})</span>
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-stone-700 border-t border-stone-200 pt-1.5">
                      <span>รวมต้นทุน{stockModal.costEstimate.freightFallback && <span className="text-amber-500 font-normal text-xs ml-1">(ไม่รวมค่าส่ง)</span>}</span>
                      <span>฿{stockModal.costEstimate.freightFallback ? stockModal.costEstimate.itemsCostTHB.toLocaleString() : stockModal.costEstimate.totalCostTHB.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-stone-600">
                      <span>ลูกค้าจ่าย</span>
                      <span className="font-medium text-orange-500">฿{order.total.toLocaleString("th-TH")}</span>
                    </div>
                    {!stockModal.costEstimate.freightFallback && (
                      <div className={`flex justify-between font-bold border-t border-stone-200 pt-1.5 ${
                        stockModal.costEstimate.estimatedMarginTHB >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        <span>กำไรประมาณ</span>
                        <span>
                          {stockModal.costEstimate.estimatedMarginTHB >= 0 ? "+" : ""}
                          ฿{stockModal.costEstimate.estimatedMarginTHB.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
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
