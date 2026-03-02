"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PAYMENT_METHOD_LABEL } from "@/lib/utils";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string; email: string };
  items: { id: string }[];
  payment: { method: string; status: string } | null;
}

const statusLabel: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  SHIPPING: "กำลังจัดส่ง",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const statusColor: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  SHIPPING: "bg-purple-100 text-purple-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const paymentStatusLabel: Record<string, string> = {
  PENDING: "รอชำระ",
  PAID: "ชำระแล้ว",
  REFUNDED: "คืนเงินแล้ว",
  FAILED: "ล้มเหลว",
};

const paymentStatusColor: Record<string, string> = {
  PENDING: "bg-yellow-50 text-yellow-600",
  PAID: "bg-green-50 text-green-600",
  REFUNDED: "bg-purple-50 text-purple-600",
  FAILED: "bg-red-50 text-red-600",
};

const orderStatusTabs = ["ทั้งหมด", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
const paymentStatusTabs = ["ทั้งหมด", "PENDING", "PAID", "REFUNDED", "FAILED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [paymentTab, setPaymentTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchOrders = useCallback(async (status: string, paymentStatus: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status !== "ทั้งหมด") params.set("status", status);
    if (paymentStatus !== "ทั้งหมด") params.set("paymentStatus", paymentStatus);
    const res = await fetch(`/api/admin/orders?${params}`);
    const d = await res.json();
    if (d.success) {
      setOrders(d.data);
      setTotal(d.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders(activeTab, paymentTab, page);
  }, [activeTab, paymentTab, page, fetchOrders]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handlePaymentTabChange = (tab: string) => {
    setPaymentTab(tab);
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">คำสั่งซื้อ</h1>
        <p className="text-stone-500 text-sm mt-1">{total.toLocaleString()} รายการ</p>
      </div>

      {/* Order Status Tabs */}
      <div className="flex gap-1 mb-2 overflow-x-auto pb-1">
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
            {tab === "ทั้งหมด" ? tab : statusLabel[tab]}
          </button>
        ))}
      </div>

      {/* Payment Status Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        <span className="text-xs text-stone-400 self-center mr-1 shrink-0">ชำระเงิน:</span>
        {paymentStatusTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => handlePaymentTabChange(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              paymentTab === tab
                ? "bg-stone-700 text-white"
                : "bg-white border border-stone-200 text-stone-500 hover:bg-stone-50"
            }`}
          >
            {tab === "ทั้งหมด" ? tab : paymentStatusLabel[tab]}
          </button>
        ))}
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
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">วันที่</th>
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
                  <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">
                    {order.items.length} รายการ
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-stone-800">
                    ฿{order.total.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[order.status]}`}>
                      {statusLabel[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {order.payment ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${paymentStatusColor[order.payment.status]}`}>
                          {paymentStatusLabel[order.payment.status] ?? order.payment.status}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {PAYMENT_METHOD_LABEL[order.payment.method] ?? order.payment.method}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 text-xs hidden lg:table-cell">
                    {new Date(order.createdAt).toLocaleDateString("th-TH")}
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
