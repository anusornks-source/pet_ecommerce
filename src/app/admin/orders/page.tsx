"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PAYMENT_METHOD_LABEL } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  phone: string;
  address: string;
  city: string | null;
  province: string | null;
  zipCode: string | null;
  note: string | null;
  statusHistory: { status: string; timestamp: string }[] | null;
  cjOrderId: string | null;
  cjStatus: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  selfTrackingNumber: string | null;
  selfTrackingCarrier: string | null;
  user: { name: string; email: string };
  items: { id: string; quantity: number; productName: string | null; source: string | null; fulfillmentMethod: string | null; product: { name: string; cjProductId: string | null }; variant: { cjVid: string | null; fulfillmentMethod: string | null } | null }[];
  payment: { method: string; status: string } | null;
  cjApiLogs: { id: string; action: string; success: boolean; error: string | null; createdAt: string }[];
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
  const { t } = useLocale();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ทั้งหมด");
  const [paymentTab, setPaymentTab] = useState("ทั้งหมด");
  const [sourceTab, setSourceTab] = useState("ทั้งหมด");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"simple" | "grouped">("simple");

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = useCallback(async (status: string, paymentStatus: string, source: string, s: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (status !== "ทั้งหมด") params.set("status", status);
    if (paymentStatus !== "ทั้งหมด") params.set("paymentStatus", paymentStatus);
    if (source !== "ทั้งหมด") params.set("source", source);
    if (s) params.set("search", s);
    const res = await fetch(`/api/admin/orders?${params}`);
    const d = await res.json();
    if (d.success) {
      setOrders(d.data);
      setTotal(d.total);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders(activeTab, paymentTab, sourceTab, search, page);
  }, [activeTab, paymentTab, sourceTab, search, page, fetchOrders]);

  const handleTabChange = (tab: string) => { setActiveTab(tab); setPage(1); };
  const handlePaymentTabChange = (tab: string) => { setPaymentTab(tab); setPage(1); };
  const handleSourceTabChange = (tab: string) => { setSourceTab(tab); setPage(1); };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("orders", "adminPages")}</h1>
        <p className="text-stone-500 text-sm mt-1">{total.toLocaleString()} รายการ</p>
      </div>

      {/* Row 1: Search + Source */}
      <div className="flex flex-wrap gap-x-3 gap-y-2 mb-2 items-center">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="🔍 ชื่อ, อีเมล, Order ID"
            className="border border-stone-200 rounded-xl px-3 py-1.5 text-sm text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 w-52"
          />
          {search && (
            <button onClick={() => setSearchInput("")} className="text-xs text-stone-400 hover:text-stone-600">✕</button>
          )}
        </div>

        <div className="w-px h-6 bg-stone-200 shrink-0" />

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

        <div className="w-px h-6 bg-stone-200 shrink-0" />

        {/* View mode */}
        <div className="flex gap-0.5 items-center shrink-0 bg-stone-100 rounded-lg p-0.5">
          {([
            { key: "simple",  label: "🛒 รายการ" },
            { key: "grouped", label: "📋 จัดกลุ่ม Tracking" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setViewMode(key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                viewMode === key
                  ? "bg-white text-stone-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Status + Payment */}
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

      <div className="bg-white rounded-2xl border border-stone-100 overflow-x-auto overflow-y-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">ไม่มีคำสั่งซื้อ</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ลูกค้า</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ที่อยู่</th>
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
                  <td className="px-4 py-3 min-w-32">
                    <p className="font-medium text-stone-800 text-sm">{order.user.name}</p>
                    <p className="text-xs text-stone-400">{order.user.email}</p>
                    <p className="text-[10px] font-mono text-stone-300 select-all mt-0.5">#{order.id.slice(-8)}</p>
                  </td>
                  <td className="px-4 py-3 min-w-44 max-w-64 align-top">
                    <div className="text-[11px] leading-snug text-stone-600 space-y-0.5">
                      {(order.zipCode || order.address) ? (
                        <a
                          href={
                            order.zipCode
                              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`รหัสไปรษณีย์ ${order.zipCode} ประเทศไทย`)}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([order.address, order.city, order.province].filter(Boolean).join(" "))}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block hover:bg-stone-50 rounded px-1 -mx-1 py-0.5 -my-0.5 transition-colors cursor-pointer group"
                          title="ดูแผนที่"
                        >
                          <p className="whitespace-pre-wrap break-words group-hover:text-orange-600">{order.address}</p>
                          <p className="text-stone-500 group-hover:text-orange-500">
                            {[order.city, order.province].filter(Boolean).join(" ")}
                            {order.zipCode && ` ${order.zipCode}`}
                          </p>
                        </a>
                      ) : (
                        <>
                          <p className="whitespace-pre-wrap break-words">{order.address}</p>
                          <p className="text-stone-500">{[order.city, order.province].filter(Boolean).join(" ")}</p>
                        </>
                      )}
                      <p>📞 {order.phone}</p>
                      {order.note && <p className="text-amber-600">📝 {order.note}</p>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell max-w-xs">
                    {(() => {
                      const classify = (item: Order["items"][0]) => {
                        // Prefer snapshotted fulfillmentMethod, fallback to live variant, then source
                        const fm = item.fulfillmentMethod ?? item.variant?.fulfillmentMethod ?? item.source;
                        if (fm === "SUPPLIER") return "supplier" as const;
                        if (fm === "CJ") return "cj" as const;
                        // Legacy fallback: check CJ IDs if no explicit fm
                        if (!item.fulfillmentMethod && fm !== "SELF" && !!(item.variant?.cjVid || item.product.cjProductId)) return "cj" as const;
                        return "self" as const;
                      };

                      // --- SIMPLE MODE ---
                      if (viewMode === "simple") {
                        return (
                          <div className="space-y-1">
                            {order.items.slice(0, 4).map(item => {
                              const type = classify(item);
                              return (
                                <div key={item.id} className="min-w-0">
                                  <p className="text-xs text-stone-600 flex items-center gap-1 min-w-0">
                                    <span className="text-stone-400 shrink-0">{item.quantity}×</span>
                                    {type === "cj" && <span className="shrink-0 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 rounded">CJ</span>}
                                    {type === "self" && <span className="shrink-0 text-[9px] font-bold bg-orange-100 text-orange-600 px-1 rounded">✋</span>}
                                    {type === "supplier" && <span className="shrink-0 text-[9px] font-bold bg-purple-100 text-purple-600 px-1 rounded">SUP</span>}
                                    <span className="truncate min-w-0">{item.productName ?? item.product.name}</span>
                                  </p>
                                  <div className="flex gap-1.5 flex-wrap mt-0.5 pl-0.5">
                                    {item.product.cjProductId && <span className="text-[9px] font-mono text-stone-400 select-all">P:{item.product.cjProductId.slice(-10)}</span>}
                                    {item.variant?.cjVid && <span className="text-[9px] font-mono text-stone-400 select-all">V:{item.variant.cjVid.slice(-10)}</span>}
                                  </div>
                                </div>
                              );
                            })}
                            {order.items.length > 4 && <p className="text-xs text-stone-400">+{order.items.length - 4} รายการ</p>}
                          </div>
                        );
                      }

                      const cjItems = order.items.filter(i => classify(i) === "cj");
                      const selfItems = order.items.filter(i => classify(i) === "self");
                      const supplierItems = order.items.filter(i => classify(i) === "supplier");
                      const needsStatus = ["CONFIRMED", "SHIPPING", "DELIVERED"].includes(order.status);

                      const showIds = viewMode === "grouped";
                      const showTracking = viewMode === "grouped";

                      const renderItem = (item: Order["items"][0], type: "cj" | "self" | "supplier") => (
                        <div key={item.id} className="min-w-0">
                          <p className="text-xs text-stone-600 flex items-center gap-1 min-w-0">
                            <span className="text-stone-400 shrink-0">{item.quantity}×</span>
                            {type === "cj" && <span className="shrink-0 text-[9px] font-bold bg-blue-100 text-blue-600 px-1 rounded">CJ</span>}
                            {type === "self" && <span className="shrink-0 text-[9px] font-bold bg-orange-100 text-orange-600 px-1 rounded">✋</span>}
                            {type === "supplier" && <span className="shrink-0 text-[9px] font-bold bg-purple-100 text-purple-600 px-1 rounded">SUP</span>}
                            <span className="truncate min-w-0">{item.productName ?? item.product.name}</span>
                          </p>
                          {showIds && (
                            <div className="flex gap-1.5 flex-wrap mt-0.5 pl-0.5">
                              {item.product.cjProductId && <span className="text-[9px] font-mono text-stone-400 select-all">P:{item.product.cjProductId.slice(-10)}</span>}
                              {item.variant?.cjVid && <span className="text-[9px] font-mono text-stone-400 select-all">V:{item.variant.cjVid.slice(-10)}</span>}
                            </div>
                          )}
                        </div>
                      );

                      return (
                        <div className="space-y-1.5">
                          {/* CJ group */}
                          {cjItems.length > 0 && (
                            <div className="bg-blue-50/60 rounded-lg px-2 py-1.5 space-y-0.5">
                              {cjItems.slice(0, 3).map(i => renderItem(i, "cj"))}
                              {cjItems.length > 3 && <p className="text-[10px] text-stone-400">+{cjItems.length - 3} รายการ</p>}
                              {/* tracking footer — only in tracking mode */}
                              {showTracking && (order.cjOrderId ? (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5 border-t border-blue-100 mt-1">
                                  <span className="text-[9px] font-mono text-blue-400 select-all">{order.cjOrderId.slice(-12)}</span>
                                  {order.cjStatus && <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">{order.cjStatus}</span>}
                                  {order.trackingNumber && <span className="text-[9px] font-mono text-blue-600">📦 {order.trackingCarrier ? `${order.trackingCarrier}: ` : ""}{order.trackingNumber}</span>}
                                </div>
                              ) : needsStatus && (
                                <p className="text-[9px] text-amber-600 pt-0.5 border-t border-blue-100 mt-1">⚠ ยังไม่มี CJ order</p>
                              ))}
                              {showTracking && order.cjApiLogs.some(l => !l.success) && (
                                <p className="text-[9px] text-red-500">⚠ {order.cjApiLogs.find(l => !l.success)?.error?.slice(0, 45)}</p>
                              )}
                            </div>
                          )}
                          {/* Self group */}
                          {selfItems.length > 0 && (
                            <div className="bg-orange-50/60 rounded-lg px-2 py-1.5 space-y-0.5">
                              {selfItems.slice(0, 3).map(i => renderItem(i, "self"))}
                              {selfItems.length > 3 && <p className="text-[10px] text-stone-400">+{selfItems.length - 3} รายการ</p>}
                              {showTracking && (order.selfTrackingNumber || (!order.cjOrderId && order.trackingNumber)) && (
                                <div className="pt-0.5 border-t border-orange-100 mt-1">
                                  <p className="text-[9px] font-mono text-orange-600">
                                    📦 {(() => { const trk = order.selfTrackingNumber ?? order.trackingNumber; const cr = order.selfTrackingCarrier ?? order.trackingCarrier; return cr ? `${cr}: ${trk}` : trk; })()}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                          {/* Supplier group */}
                          {supplierItems.length > 0 && (
                            <div className="bg-purple-50/60 rounded-lg px-2 py-1.5 space-y-0.5">
                              {supplierItems.slice(0, 3).map(i => renderItem(i, "supplier"))}
                              {supplierItems.length > 3 && <p className="text-[10px] text-stone-400">+{supplierItems.length - 3} รายการ</p>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
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
