"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  user: { name: string; email: string };
  items: { id: string }[];
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

const tabs = ["ทั้งหมด", "PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");

  useEffect(() => {
    setLoading(true);
    const status = activeTab === "ทั้งหมด" ? "" : `?status=${activeTab}`;
    fetch(`/api/admin/orders${status}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrders(d.data);
      })
      .finally(() => setLoading(false));
  }, [activeTab]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">คำสั่งซื้อ</h1>
        <p className="text-stone-500 text-sm mt-1">{orders.length} รายการ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
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

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">ไม่มีคำสั่งซื้อ</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">
                  ลูกค้า
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">
                  สินค้า
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">
                  ยอดรวม
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">
                  สถานะ
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden md:table-cell">
                  วันที่
                </th>
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
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[order.status]}`}
                    >
                      {statusLabel[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 text-xs hidden md:table-cell">
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
    </div>
  );
}
