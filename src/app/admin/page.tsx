"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PAYMENT_METHOD_LABEL } from "@/lib/utils";

interface RecentOrder {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  statusHistory?: { status: string; timestamp: string }[];
  user: { name: string; email: string };
  items: {
    id: string;
    quantity: number;
    product: { name: string; cjProductId: string | null };
    variant: { cjVid: string | null } | null;
  }[];
  payment: { method: string; status: string } | null;
}

interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
  recentOrders: RecentOrder[];
}

const statusConfig: Record<string, { label: string; icon: string; color: string }> = {
  PENDING:   { label: "รอดำเนินการ", icon: "⏳", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "ยืนยันแล้ว",  icon: "✅", color: "bg-blue-100 text-blue-700" },
  SHIPPING:  { label: "กำลังจัดส่ง", icon: "🚚", color: "bg-purple-100 text-purple-700" },
  DELIVERED: { label: "ส่งแล้ว",     icon: "📦", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "ยกเลิก",      icon: "✕",  color: "bg-red-100 text-red-700" },
};

const paymentStatusConfig: Record<string, { label: string; icon: string; color: string }> = {
  PENDING:  { label: "รอชำระ",      icon: "⏳", color: "bg-yellow-50 text-yellow-600" },
  PAID:     { label: "ชำระแล้ว",    icon: "✓",  color: "bg-green-50 text-green-600" },
  REFUNDED: { label: "คืนเงินแล้ว", icon: "↩",  color: "bg-purple-50 text-purple-600" },
  FAILED:   { label: "ล้มเหลว",     icon: "✕",  color: "bg-red-50 text-red-600" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setStats(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    {
      label: "สินค้าทั้งหมด",
      value: stats?.totalProducts ?? 0,
      icon: "📦",
      href: "/admin/products",
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "หมวดหมู่",
      value: stats?.totalCategories ?? 0,
      icon: "🏷️",
      href: "/admin/categories",
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "คำสั่งซื้อ",
      value: stats?.totalOrders ?? 0,
      icon: "🛒",
      href: "/admin/orders",
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
    {
      label: "ผู้ใช้งาน",
      value: stats?.totalUsers ?? 0,
      icon: "👥",
      href: "/admin/users",
      color: "text-green-600",
      bg: "bg-green-50",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
      </div>

      {/* Revenue Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white mb-6">
        <p className="text-orange-100 text-sm">รายได้รวม (คำสั่งซื้อที่ส่งแล้ว)</p>
        <p className="text-3xl font-bold mt-1">
          ฿{(stats?.revenue ?? 0).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-2xl p-5 border border-stone-100 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>
              {card.icon}
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
            <p className="text-xs text-stone-500 mt-0.5">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">คำสั่งซื้อล่าสุด</h2>
          <Link href="/admin/orders" className="text-orange-500 text-sm hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        {stats?.recentOrders.length === 0 ? (
          <div className="text-center py-10 text-stone-400 text-sm">ยังไม่มีคำสั่งซื้อ</div>
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
              {stats?.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-800">{order.user.name}</p>
                    <p className="text-xs text-stone-400">{order.user.email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell max-w-50">
                    {order.items.map((item) => {
                      const isCJ = !!(item.variant?.cjVid || item.product.cjProductId);
                      return (
                        <p key={item.id} className="text-xs text-stone-600 truncate flex items-center gap-1">
                          {item.quantity > 1 && <span className="text-stone-400 shrink-0">{item.quantity}×</span>}
                          {isCJ && <span className="shrink-0 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 rounded">CJ</span>}
                          <span className="truncate">{item.product.name}</span>
                        </p>
                      );
                    })}
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
    </div>
  );
}
