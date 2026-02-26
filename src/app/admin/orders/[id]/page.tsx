"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface Order {
  id: string;
  status: string;
  total: number;
  address: string;
  phone: string;
  note: string | null;
  createdAt: string;
  user: { name: string; email: string; phone: string | null };
  items: {
    id: string;
    quantity: number;
    price: number;
    product: { name: string; images: string[] };
  }[];
  payment: {
    method: string;
    status: string;
    amount: number;
  } | null;
}

const statusLabel: Record<string, string> = {
  PENDING: "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  SHIPPING: "จัดส่งแล้ว",
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

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/orders/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setOrder(d.data);
          setNewStatus(d.data.status);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdateStatus = async () => {
    if (!order || newStatus === order.status) return;
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("อัปเดตสถานะแล้ว");
      setOrder((o) => (o ? { ...o, status: newStatus } : o));
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      </div>
    );
  }

  if (!order) {
    return <div className="text-center py-16 text-stone-400">ไม่พบคำสั่งซื้อ</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">
            คำสั่งซื้อ #{order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100">
              <h2 className="font-semibold text-stone-800">รายการสินค้า</h2>
            </div>
            <div className="divide-y divide-stone-50">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-100 shrink-0">
                    {item.product.images[0] ? (
                      <Image
                        src={item.product.images[0]}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-stone-300 text-xl">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{item.product.name}</p>
                    <p className="text-sm text-stone-400">
                      {item.quantity} x ฿{item.price.toLocaleString("th-TH")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-stone-800">
                      ฿{(item.quantity * item.price).toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex justify-between">
              <span className="font-semibold text-stone-800">รวมทั้งสิ้น</span>
              <span className="font-bold text-lg text-orange-500">
                ฿{order.total.toLocaleString("th-TH")}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Status Update */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-3">สถานะคำสั่งซื้อ</h2>
            <span
              className={`inline-block text-xs px-3 py-1 rounded-full font-medium mb-3 ${statusColor[order.status]}`}
            >
              {statusLabel[order.status]}
            </span>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white mb-3"
            >
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={handleUpdateStatus}
              disabled={saving || newStatus === order.status}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "อัปเดตสถานะ"}
            </button>
          </div>

          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <h2 className="font-semibold text-stone-800 mb-3">ข้อมูลลูกค้า</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-400">ชื่อ: </span>
                <span className="text-stone-700">{order.user.name}</span>
              </div>
              <div>
                <span className="text-stone-400">อีเมล: </span>
                <span className="text-stone-700">{order.user.email}</span>
              </div>
              <div>
                <span className="text-stone-400">โทร: </span>
                <span className="text-stone-700">{order.phone}</span>
              </div>
              <div>
                <span className="text-stone-400">ที่อยู่: </span>
                <span className="text-stone-700">{order.address}</span>
              </div>
              {order.note && (
                <div>
                  <span className="text-stone-400">หมายเหตุ: </span>
                  <span className="text-stone-700">{order.note}</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment */}
          {order.payment && (
            <div className="bg-white rounded-2xl border border-stone-100 p-5">
              <h2 className="font-semibold text-stone-800 mb-3">การชำระเงิน</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-stone-400">วิธีชำระ: </span>
                  <span className="text-stone-700">{order.payment.method}</span>
                </div>
                <div>
                  <span className="text-stone-400">สถานะ: </span>
                  <span className="text-stone-700">{order.payment.status}</span>
                </div>
                <div>
                  <span className="text-stone-400">จำนวน: </span>
                  <span className="font-semibold text-stone-800">
                    ฿{order.payment.amount.toLocaleString("th-TH")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
