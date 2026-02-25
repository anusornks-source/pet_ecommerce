"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import type { Order } from "@/types";

export default function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      fetch(`/api/orders/${orderId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setOrder(data.data);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl animate-bounce mb-4">🎉</div>
        <p className="text-stone-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="card p-8 text-center">
        <div
          style={{
            width: "5rem", height: "5rem",
            background: "#dcfce7", borderRadius: "9999px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.5rem", margin: "0 auto 1.25rem",
          }}
        >
          ✅
        </div>
        <h1 className="text-2xl font-bold text-stone-800 mb-2">สั่งซื้อสำเร็จ!</h1>
        <p className="text-stone-500 mb-6">ขอบคุณที่ไว้วางใจ PetShop ค่ะ เราจะรีบดำเนินการจัดส่งให้โดยเร็ว</p>

        {order && (
          <div
            style={{
              background: "#fff7ed", borderRadius: "1rem",
              padding: "1.25rem", textAlign: "left",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "#78716c" }}>หมายเลขคำสั่งซื้อ</span>
              <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#1c1917" }}>
                {order.id.slice(-8).toUpperCase()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              <span style={{ color: "#78716c" }}>สถานะ</span>
              <span style={{ fontWeight: "500", color: "#ea580c" }}>
                {ORDER_STATUS_LABEL[order.status] || order.status}
              </span>
            </div>
            {order.payment && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                <span style={{ color: "#78716c" }}>วิธีชำระเงิน</span>
                <span style={{ fontWeight: "500" }}>
                  {PAYMENT_METHOD_LABEL[order.payment.method] || order.payment.method}
                </span>
              </div>
            )}
            <div style={{
              display: "flex", justifyContent: "space-between",
              fontSize: "0.875rem", borderTop: "1px solid #fed7aa",
              paddingTop: "0.75rem", marginTop: "0.75rem"
            }}>
              <span style={{ fontWeight: "600", color: "#44403c" }}>ยอดรวม</span>
              <span style={{ fontWeight: "bold", color: "#f97316", fontSize: "1rem" }}>
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link href="/profile/orders" className="btn-primary"
            style={{ justifyContent: "center", padding: "0.75rem" }}>
            ดูประวัติคำสั่งซื้อ
          </Link>
          <Link href="/products" className="btn-outline"
            style={{ justifyContent: "center", padding: "0.75rem" }}>
            ช้อปต่อ
          </Link>
        </div>
      </div>
    </div>
  );
}
