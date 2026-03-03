"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PAYMENT_METHOD_LABEL } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  statusHistory: { status: string; timestamp: string }[] | null;
  user: { name: string; email: string };
  items: { id: string; quantity: number; product: { name: string; cjProductId: string | null }; variant: { cjVid: string | null } | null }[];
  payment: { method: string; status: string } | null;
}

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  PENDING:   { label: "รอดำเนินการ", icon: "⏳", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "ยืนยันแล้ว",  icon: "✅", color: "bg-blue-100 text-blue-700" },
  SHIPPING:  { label: "กำลังจัดส่ง", icon: "🚚", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "ส่งแล้ว",     icon: "📦", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "ยกเลิก",      icon: "✕",  color: "bg-red-100 text-red-700" },
};

const paymentStatusConfig: Record<string, { label: string; icon: string; color: string }> = {
  PENDING:  { label: "รอชำระ",     icon: "⏳", color: "bg-yellow-50 text-yellow-600" },
  PAID:     { label: "ชำระแล้ว",   icon: "✓",  color: "bg-green-50 text-green-600" },
  REFUNDED: { label: "คืนเงินแล้ว", icon: "↩",  color: "bg-purple-50 text-purple-600" },
  FAILED:   { label: "ล้มเหลว",    icon: "✕",  color: "bg-red-50 text-red-600" },
};

const orderStatusTabs = ["ทั้งหมด", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
const paymentStatusTabs = ["ทั้งหมด", "PENDING", "PAID", "REFUNDED", "FAILED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [paymentTab, setPaymentTab] = useState("ทั้งหมด");
  const [sourceTab, setSourceTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchOrders = useCallback(async (status: string, paymentStatus: string, source: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status !== "ทั้งหมด") params.set("status", status);
    if (paymentStatus !== "ทั้งหมด") params.set("paymentStatus", paymentStatus);
    if (source !== "ทั้งหมด") params.set("source", source);
    const res = await fetch(`/api/admin/orders?${params}`);
    const d = await res.json();
    if (d.success) {
      setOrders(d.data);
      setTotal(d.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders(activeTab, paymentTab, sourceTab, page);
  }, [activeTab, paymentTab, sourceTab, page, fetchOrders]);

  const handleTabChange = (tab: string) => { setActiveTab(tab); setPage(1); };
  const handlePaymentTabChange = (tab: string) => { setPaymentTab(tab); setPage(1); };
  const handleSourceTabChange = (tab: string) => { setSourceTab(tab); setPage(1); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">คำสั่งซื้อ</h1>
        <p className="text-stone-500 text-sm mt-1">{total.toLocaleString()} รายการ</p>
      </div>

      {/* Filters — single row */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 items-center overflow-x-auto pb-1">
        {/* Order status */}
        <div className="flex gap-1 items-center shrink-0">
          <span className="text-xs text-stone-400 mr-1 shrink-0">สถานะ:</span>
          {orderStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {tab === "ทั้งหมด" ? tab : `${statusConfig[tab].icon} ${statusConfig[tab].label}`}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-stone-200 shrink-0 hidden sm:block" />

        {/* Source */}
        <div className="flex gap-1 items-center shrink-0">
          <span className="text-xs text-stone-400 mr-1 shrink-0">แหล่งที่มา:</span>
          {(["ทั้งหมด", "CJ", "MANUAL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleSourceTabChange(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                sourceTab === tab
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {tab === "ทั้งหมด" ? "ทั้งหมด" : tab === "CJ" ? "🏭 CJ" : "✋ ส่งเอง"}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-stone-200 shrink-0 hidden sm:block" />

        {/* Payment status */}
        <div className="flex gap-1 items-center shrink-0">
          <span className="text-xs text-stone-400 mr-1 shrink-0">ชำระเงิน:</span>
          {paymentStatusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handlePaymentTabChange(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                paymentTab === tab
                  ? "bg-stone-700 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {tab === "ทั้งหมด" ? tab : `${paymentStatusConfig[tab].icon} ${paymentStatusConfig[tab].label}`}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">ไม่มีคำสั่งซื้อ</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">สินค้า</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">ยอดรวม</th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">สถานะ</th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden md:table-cell">ชำระเงิน</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">วันที่สั่งซื้อ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{order.user.name}</p>
                    <p className="text-xs text-stone-400">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell max-w-50">
                    {order.items.slice(0, 2).map((item) => {
                      const isCJ = !!(item.variant?.cjVid || item.product.cjProductId);
                      return (
                        <p key={item.id} className="text-xs text-stone-600 truncate flex items-center gap-1">
                          {item.quantity > 1 && <span className="text-stone-400 shrink-0">{item.quantity}×</span>}
                          {isCJ && <span className="shrink-0 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 rounded">CJ</span>}
                          <span className="truncate">{item.product.name}</span>
                        </p>
                      );
                    })}
                    {order.items.length > 2 && (
                      <p className="text-xs text-stone-400">+{order.items.length - 2} รายการ</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-800">
                    ฿{order.total.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusConfig[order.status]?.color}`}>
                      {statusConfig[order.status]?.icon} {statusConfig[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {order.payment ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatusConfig[order.payment.status]?.color}`}>
                          {paymentStatusConfig[order.payment.status]?.icon} {paymentStatusConfig[order.payment.status]?.label ?? order.payment.status}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs hidden lg:table-cell">
                    <p className="text-stone-400">{new Date(order.createdAt).toLocaleDateString("th-TH")}</p>
                    {order.status === "DELIVERED" ? (() => {
                      const deliveredEntry = order.statusHistory?.find((h) => h.status === "DELIVERED");
                      if (!deliveredEntry) return null;
                      const days = Math.floor((new Date(deliveredEntry.timestamp).getTime() - new Date(order.createdAt).getTime()) / 86400000);
                      return <p className="font-semibold mt-0.5 text-green-600">📦 ได้ของใน {days} วัน</p>;
                    })() : order.status !== "CANCELLED" && (() => {
                      const days = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000);
                      const label = days === 0 ? "วันนี้" : `รอมา ${days} วัน`;
                      const color = days >= 7 ? "text-red-600" : days >= 3 ? "text-orange-500" : "text-stone-600";
                      return <p className={`font-semibold mt-0.5 ${color}`}>⏳ {label}</p>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      ดูรายละเอียด
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ←
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <span key={`e-${i}`} className="px-2 text-stone-300">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
