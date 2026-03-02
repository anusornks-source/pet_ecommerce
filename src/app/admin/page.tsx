"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Stats {
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalUsers: number;
  revenue: number;
  recentOrders: {
    id: string;
    status: string;
    total: number;
    createdAt: string;
    user: { name: string; email: string };
  }[];
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
        <p className="text-stone-500 text-sm mt-1">ภาพรวมระบบ</p>
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
          <div className="divide-y divide-stone-50">
            {stats?.recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-stone-800">{order.user.name}</p>
                  <p className="text-xs text-stone-400">
                    {new Date(order.createdAt).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[order.status]}`}>
                    {statusLabel[order.status]}
                  </span>
                  <span className="text-sm font-semibold text-stone-700">
                    ฿{order.total.toLocaleString("th-TH")}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
