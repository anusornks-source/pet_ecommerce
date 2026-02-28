"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import generatePayload from "promptpay-qr";
import { formatPrice, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/utils";
import type { Order } from "@/types";

interface Settings {
  promptpayId?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountName?: string;
}

export default function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const [orderRes, settingsRes] = await Promise.all([
        orderId ? fetch(`/api/orders/${orderId}`).then((r) => r.json()) : Promise.resolve({ success: false }),
        fetch("/api/admin/settings").then((r) => r.json()),
      ]);
      if (orderRes.success) setOrder(orderRes.data);
      if (settingsRes.success) setSettings(settingsRes.data);
      setLoading(false);
    };
    loadData();
  }, [orderId]);

  const isPromptPay = order?.payment?.method === "PROMPTPAY";
  const isBankTransfer = order?.payment?.method === "BANK_TRANSFER";

  // Generate PromptPay EMV QR payload
  const promptPayQR =
    isPromptPay && settings.promptpayId && order?.total
      ? generatePayload(settings.promptpayId, { amount: order.total })
      : null;

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl animate-bounce mb-4">🎉</div>
        <p className="text-stone-500">กำลังโหลด...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-5">
      {/* Success Card */}
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
                #{order.id.slice(-8).toUpperCase()}
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
          <Link href="/profile/orders" className="btn-primary" style={{ justifyContent: "center", padding: "0.75rem" }}>
            ดูประวัติคำสั่งซื้อ
          </Link>
          <Link href="/products" className="btn-outline" style={{ justifyContent: "center", padding: "0.75rem" }}>
            ช้อปต่อ
          </Link>
        </div>
      </div>

      {/* PromptPay QR */}
      {isPromptPay && (
        <div className="card p-6 text-center space-y-4">
          <h2 className="font-bold text-stone-800 text-lg">📱 สแกน QR พร้อมเพย์</h2>
          {promptPayQR ? (
            <>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-2xl border-2 border-green-200 inline-block">
                  <QRCode value={promptPayQR} size={200} />
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 space-y-1">
                <p className="font-semibold">ยอดที่ต้องชำระ: <span className="text-lg text-orange-500 font-bold">{order && formatPrice(order.total)}</span></p>
                <p>หมายเลขพร้อมเพย์: <strong>{settings.promptpayId}</strong></p>
                <p className="text-xs text-green-600 mt-2">เปิดแอปธนาคาร → สแกน QR → ยืนยันยอด → โอน</p>
              </div>
              <p className="text-xs text-stone-400">หลังชำระแล้ว admin จะยืนยัน order ภายใน 1 ชั่วโมง (เวลาทำการ)</p>
            </>
          ) : (
            <div className="text-sm text-stone-500">
              <p>กรุณาโอนเงินมาที่พร้อมเพย์</p>
              {settings.promptpayId && <p className="font-semibold mt-1">{settings.promptpayId}</p>}
              <p className="text-orange-500 font-bold mt-1">{order && formatPrice(order.total)}</p>
            </div>
          )}
        </div>
      )}

      {/* Bank Transfer */}
      {isBankTransfer && (settings.bankName || settings.bankAccount) && (
        <div className="card p-6 space-y-3">
          <h2 className="font-bold text-stone-800 text-lg">🏦 โอนเงินผ่านธนาคาร</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 space-y-1">
            {settings.bankName && <p className="font-semibold">{settings.bankName}</p>}
            {settings.bankAccount && <p>เลขที่บัญชี: <strong>{settings.bankAccount}</strong></p>}
            {settings.bankAccountName && <p>ชื่อบัญชี: {settings.bankAccountName}</p>}
            <p className="font-bold text-orange-500 text-base mt-2">ยอดโอน: {order && formatPrice(order.total)}</p>
          </div>
          <p className="text-xs text-stone-400">หลังโอนแล้วส่งหลักฐานให้ admin เพื่อยืนยัน order</p>
        </div>
      )}
    </div>
  );
}
