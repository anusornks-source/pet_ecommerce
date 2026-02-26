"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

interface UserGrowthPoint {
  date: string;
  count: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface CategoryData {
  name: string;
  icon: string;
  revenue: number;
  quantity: number;
}

interface StatusData {
  status: string;
  count: number;
  revenue: number;
}

interface PaymentData {
  method: string;
  count: number;
  amount: number;
}

interface AnalyticsData {
  revenueChart: RevenuePoint[];
  userGrowthChart: UserGrowthPoint[];
  topProducts: TopProduct[];
  categoryData: CategoryData[];
  statusData: StatusData[];
  paymentData: PaymentData[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#fbbf24",
  CONFIRMED: "#60a5fa",
  SHIPPING: "#a78bfa",
  DELIVERED: "#34d399",
  CANCELLED: "#f87171",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  SHIPPING: "จัดส่งแล้ว",
  DELIVERED: "ส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const PAYMENT_LABELS: Record<string, string> = {
  CREDIT_CARD: "บัตรเครดิต",
  BANK_TRANSFER: "โอนเงิน",
  PROMPTPAY: "พร้อมเพย์",
  COD: "เก็บปลายทาง",
};

const PAYMENT_COLORS = ["#f97316", "#3b82f6", "#8b5cf6", "#10b981"];

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatCurrency(val: number) {
  return `฿${val.toLocaleString("th-TH", { maximumFractionDigits: 0 })}`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold text-stone-800 mb-4">{children}</h2>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-stone-100 p-5 ${className}`}>
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-sm">โหลดข้อมูลไม่สำเร็จ</div>
      </div>
    );
  }

  const totalRevenue = data.statusData.find((s) => s.status === "DELIVERED")?.revenue ?? 0;
  const totalOrders = data.statusData.reduce((sum, s) => sum + s.count, 0);
  const deliveredOrders = data.statusData.find((s) => s.status === "DELIVERED")?.count ?? 0;
  const cancelledOrders = data.statusData.find((s) => s.status === "CANCELLED")?.count ?? 0;
  const avgOrderValue = deliveredOrders > 0 ? totalRevenue / deliveredOrders : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Analytics</h1>
        <p className="text-stone-500 text-sm mt-1">ข้อมูล 30 วันย้อนหลัง</p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "รายได้รวม", value: formatCurrency(totalRevenue), icon: "💰", color: "text-orange-600", bg: "bg-orange-50" },
          { label: "คำสั่งซื้อทั้งหมด", value: totalOrders.toLocaleString(), icon: "🛒", color: "text-blue-600", bg: "bg-blue-50" },
          { label: "มูลค่าเฉลี่ย/ออเดอร์", value: formatCurrency(avgOrderValue), icon: "📊", color: "text-purple-600", bg: "bg-purple-50" },
          { label: "อัตราการยกเลิก", value: totalOrders > 0 ? `${((cancelledOrders / totalOrders) * 100).toFixed(1)}%` : "0%", icon: "❌", color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center text-xl mb-3`}>
              {kpi.icon}
            </div>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-stone-500 mt-0.5">{kpi.label}</p>
          </Card>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card className="mb-6">
        <SectionTitle>รายได้รายวัน (30 วันล่าสุด)</SectionTitle>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.revenueChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#a8a29e" }} />
            <YAxis tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#a8a29e" }} width={48} />
            <Tooltip
              formatter={(val) => [formatCurrency((val as number) ?? 0), "รายได้"]}
              labelFormatter={(label) => `วันที่ ${new Date(label as string).toLocaleDateString("th-TH")}`}
            />
            <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revenueGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Orders + User Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <SectionTitle>จำนวนออเดอร์รายวัน</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.revenueChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#a8a29e" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a8a29e" }} width={32} />
              <Tooltip
                formatter={(val) => [(val as number) ?? 0, "ออเดอร์"]}
                labelFormatter={(label) => `วันที่ ${new Date(label as string).toLocaleDateString("th-TH")}`}
              />
              <Bar dataKey="orders" fill="#60a5fa" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle>ผู้ใช้ใหม่รายวัน</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.userGrowthChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11, fill: "#a8a29e" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#a8a29e" }} width={32} />
              <Tooltip
                formatter={(val) => [(val as number) ?? 0, "ผู้ใช้ใหม่"]}
                labelFormatter={(label) => `วันที่ ${new Date(label as string).toLocaleDateString("th-TH")}`}
              />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#userGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Order Status + Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <SectionTitle>สถานะคำสั่งซื้อ</SectionTitle>
          {data.statusData.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-10">ยังไม่มีข้อมูล</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.statusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#e7e5e4"} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [
                    `${val} ออเดอร์`,
                    STATUS_LABELS[name as string] ?? name,
                  ]}
                />
                <Legend
                  formatter={(value) => STATUS_LABELS[value] ?? value}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionTitle>ช่องทางการชำระเงิน</SectionTitle>
          {data.paymentData.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-10">ยังไม่มีข้อมูล</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.paymentData}
                  dataKey="count"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.paymentData.map((entry, i) => (
                    <Cell key={entry.method} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [
                    `${val} รายการ`,
                    PAYMENT_LABELS[name as string] ?? name,
                  ]}
                />
                <Legend
                  formatter={(value) => PAYMENT_LABELS[value] ?? value}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Category Revenue + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionTitle>รายได้ตามหมวดหมู่</SectionTitle>
          {data.categoryData.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-10">ยังไม่มีข้อมูล</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={data.categoryData}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#a8a29e" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#57534e" }} width={80} />
                <Tooltip formatter={(val) => [formatCurrency((val as number) ?? 0), "รายได้"]} />
                <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <SectionTitle>สินค้าขายดี Top 5</SectionTitle>
          {data.topProducts.length === 0 ? (
            <div className="text-center text-stone-400 text-sm py-10">ยังไม่มีข้อมูล</div>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    i === 0 ? "bg-amber-400" : i === 1 ? "bg-stone-400" : i === 2 ? "bg-orange-400" : "bg-stone-200"
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{product.name}</p>
                    <p className="text-xs text-stone-400">{product.quantity} ชิ้น</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">{formatCurrency(product.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
