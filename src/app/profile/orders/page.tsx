"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDate, ORDER_STATUS_LABEL, ORDER_STATUS_COLOR, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderHistoryPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetch("/api/orders")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setOrders(data.data);
          setLoading(false);
        });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">กรุณาเข้าสู่ระบบ</h2>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/profile" className="text-stone-400 hover:text-orange-500 transition-colors">
          ← โปรไฟล์
        </Link>
        <h1 className="text-3xl font-bold text-stone-800">ประวัติคำสั่งซื้อ</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-5 bg-stone-100 rounded w-48 mb-3" />
              <div className="h-4 bg-stone-100 rounded w-32" />
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-semibold text-stone-600 mb-2">ยังไม่มีคำสั่งซื้อ</h3>
          <p className="text-stone-400 mb-6">เริ่มช้อปสินค้าที่คุณชอบได้เลย</p>
          <Link href="/products" className="btn-primary px-8 py-3">เลือกซื้อสินค้า</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card overflow-visible">
              {/* Order header */}
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="w-full p-5 flex items-center justify-between hover:bg-stone-50 transition-colors rounded-2xl"
              >
                <div className="text-left">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-bold text-stone-500">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                    <span className={`badge ${ORDER_STATUS_COLOR[order.status] || "bg-stone-100 text-stone-600"}`}>
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span>{formatDate(order.createdAt)}</span>
                    <span>{order.items.length} รายการ</span>
                    {order.payment && (
                      <span>{PAYMENT_METHOD_LABEL[order.payment.method] || order.payment.method}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-orange-500">{formatPrice(order.total)}</span>
                  <svg
                    className={`w-5 h-5 text-stone-400 transition-transform ${expanded === order.id ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded items */}
              {expanded === order.id && (
                <div className="border-t border-stone-100 p-5 space-y-3">
                  {order.items.map((item) => {
                    const img = item.product?.images?.[0] || `https://placehold.co/80x80/fff7ed/f97316?text=${item.product?.name || ""}`;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-orange-50">
                          <Image src={img} alt={item.product?.name || ""} fill className="object-cover" sizes="56px" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.productId}`}
                            className="font-medium text-stone-700 hover:text-orange-500 transition-colors text-sm truncate block"
                          >
                            {item.product?.name}
                          </Link>
                          <p className="text-xs text-stone-400">x{item.quantity} × {formatPrice(item.price)}</p>
                        </div>
                        <span className="font-semibold text-orange-500 text-sm shrink-0">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-stone-100">
                    <div className="flex justify-between text-sm text-stone-500 mb-1">
                      <span>ที่อยู่</span>
                      <span className="text-right max-w-xs">{order.address}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base mt-2">
                      <span>รวมทั้งหมด</span>
                      <span className="text-orange-500">{formatPrice(order.total)}</span>
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
