"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDate, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/utils";

interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  note?: string;
}

interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: { id: string; name: string; images: string[]; category: { icon: string } };
  variant?: { size?: string | null; color?: string | null } | null;
}

interface OrderDetail {
  id: string;
  status: string;
  total: number;
  discount: number;
  couponCode: string | null;
  address: string;
  phone: string;
  note: string | null;
  createdAt: string;
  statusHistory: StatusHistoryEntry[] | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  items: OrderItem[];
  payment?: { method: string; status: string; amount: number } | null;
}

const TIMELINE_STEPS = [
  { status: "PENDING", label: "รอดำเนินการ", icon: "📋" },
  { status: "CONFIRMED", label: "ยืนยันแล้ว", icon: "✅" },
  { status: "SHIPPING", label: "กำลังจัดส่ง", icon: "🚚" },
  { status: "DELIVERED", label: "จัดส่งแล้ว", icon: "📦" },
];

const STATUS_ORDER = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];

export default function OrderTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setOrder(data.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-4">กรุณาเข้าสู่ระบบ</h2>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😢</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">ไม่พบคำสั่งซื้อ</h2>
        <Link href="/profile/orders" className="btn-primary px-8 py-3">กลับหน้าคำสั่งซื้อ</Link>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED";

  // Find timestamp for a status from history
  const getTimestamp = (status: string): string | null => {
    if (!order.statusHistory) return null;
    const entry = order.statusHistory.find((h) => h.status === status);
    return entry?.timestamp ?? null;
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile/orders" className="text-stone-400 hover:text-orange-500 transition-colors text-sm">
          ← คำสั่งซื้อของฉัน
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ติดตามคำสั่งซื้อ</h1>
          <p className="text-stone-400 text-sm mt-0.5 font-mono">#{order.id.slice(-8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-stone-400">สั่งเมื่อ</p>
          <p className="text-sm text-stone-600">{formatDate(order.createdAt)}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="card p-6 mb-6">
        {isCancelled ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-2xl">
            <span className="text-2xl">❌</span>
            <div>
              <p className="font-semibold text-red-700">คำสั่งซื้อถูกยกเลิก</p>
              {getTimestamp("CANCELLED") && (
                <p className="text-xs text-red-400">{new Date(getTimestamp("CANCELLED")!).toLocaleString("th-TH")}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-6 left-6 right-6 h-0.5 bg-stone-100" />
            <div
              className="absolute top-6 left-6 h-0.5 bg-orange-400 transition-all duration-500"
              style={{
                width: currentIdx <= 0 ? "0%" :
                  currentIdx === 1 ? "33.3%" :
                  currentIdx === 2 ? "66.6%" : "100%",
              }}
            />

            <div className="relative flex justify-between">
              {TIMELINE_STEPS.map((step, idx) => {
                const isPast = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const timestamp = getTimestamp(step.status);

                return (
                  <div key={step.status} className="flex flex-col items-center gap-2 flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 transition-all z-10 relative ${
                        isPast
                          ? "bg-orange-500 border-orange-500 shadow-md"
                          : isCurrent
                          ? "bg-white border-orange-500 shadow-lg ring-4 ring-orange-100"
                          : "bg-white border-stone-200"
                      } ${isCurrent ? "animate-pulse" : ""}`}
                    >
                      {isPast ? "✓" : step.icon}
                    </div>
                    <div className="text-center">
                      <p className={`text-xs font-medium ${
                        isPast || isCurrent ? "text-orange-600" : "text-stone-400"
                      }`}>
                        {step.label}
                      </p>
                      {timestamp && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          {new Date(timestamp).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current status note */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <div className="mt-5 pt-4 border-t border-stone-100">
            {order.statusHistory.slice().reverse().slice(0, 3).map((entry, i) => (
              <div key={i} className="flex items-start gap-2 text-sm py-1">
                <span className="text-stone-400 text-xs mt-0.5 shrink-0 w-32">
                  {new Date(entry.timestamp).toLocaleString("th-TH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-stone-600">{ORDER_STATUS_LABEL[entry.status] || entry.status}</span>
                {entry.note && <span className="text-stone-400">— {entry.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tracking Card — show when tracking number available */}
      {order.trackingNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-5">
          <h3 className="font-semibold text-blue-800 mb-3">📦 ติดตามพัสดุ</h3>
          <div className="space-y-2 text-sm">
            <div className="flex gap-2 items-center">
              <span className="text-blue-600 shrink-0">เลข Tracking</span>
              <span className="font-mono font-bold text-blue-900 text-base tracking-wide">{order.trackingNumber}</span>
            </div>
            {order.trackingCarrier && (
              <div className="flex gap-2">
                <span className="text-blue-600 shrink-0">ขนส่ง</span>
                <span className="text-blue-800">{order.trackingCarrier}</span>
              </div>
            )}
            <a
              href={`https://t.17track.net/th#nums=${order.trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              ติดตามพัสดุ →
            </a>
          </div>
        </div>
      )}

      {/* Order info */}
      <div className="card p-5 mb-5 space-y-2 text-sm">
        <h3 className="font-semibold text-stone-800 mb-3">ข้อมูลการจัดส่ง</h3>
        <div className="flex gap-2">
          <span className="text-stone-400 w-24 shrink-0">ที่อยู่</span>
          <span className="text-stone-700">{order.address}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-stone-400 w-24 shrink-0">โทร</span>
          <span className="text-stone-700">{order.phone}</span>
        </div>
        {order.payment && (
          <div className="flex gap-2">
            <span className="text-stone-400 w-24 shrink-0">วิธีชำระ</span>
            <span className="text-stone-700">{PAYMENT_METHOD_LABEL[order.payment.method] || order.payment.method}</span>
          </div>
        )}
        {order.note && (
          <div className="flex gap-2">
            <span className="text-stone-400 w-24 shrink-0">หมายเหตุ</span>
            <span className="text-stone-700">{order.note}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-stone-800 mb-1">รายการสินค้า</h3>
        {order.items.map((item) => {
          const img = item.product?.images?.[0] || `https://placehold.co/80x80/fff7ed/f97316?text=${encodeURIComponent(item.product?.name || "")}`;
          const variantLabel = item.variant
            ? [item.variant.size, item.variant.color].filter(Boolean).join(" / ")
            : null;
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-orange-50">
                <Image src={img} alt={item.product?.name || ""} fill className="object-cover" sizes="56px" />
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.productId}`} className="font-medium text-stone-700 hover:text-orange-500 text-sm truncate block">
                  {item.product?.name}
                </Link>
                {variantLabel && <p className="text-xs text-stone-400">{variantLabel}</p>}
                <p className="text-xs text-stone-400">x{item.quantity} × {formatPrice(item.price)}</p>
              </div>
              <span className="font-semibold text-orange-500 text-sm shrink-0">
                {formatPrice(item.price * item.quantity)}
              </span>
            </div>
          );
        })}

        <div className="pt-3 border-t border-stone-100 space-y-1 text-sm">
          <div className="flex justify-between text-stone-500">
            <span>ราคาสินค้า</span>
            <span>{formatPrice(order.total + order.discount - (order.total + order.discount > 500 ? 0 : 50))}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>ส่วนลด {order.couponCode && `(${order.couponCode})`}</span>
              <span>-{formatPrice(order.discount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t border-stone-100">
            <span>รวมทั้งหมด</span>
            <span className="text-orange-500">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
