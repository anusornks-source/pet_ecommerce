"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, phone: (user as { phone?: string }).phone || "", address: (user as { address?: string }).address || "" });
    }
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold text-stone-700 mb-2">กรุณาเข้าสู่ระบบ</h2>
        <Link href="/login" className="btn-primary px-8 py-3">เข้าสู่ระบบ</Link>
      </div>
    );
  }

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await refreshUser();
      setEditing(false);
      toast.success("อัปเดตข้อมูลสำเร็จ!");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-stone-800 mb-6">โปรไฟล์ของฉัน</h1>

      <div className="card p-6 mb-6">
        {/* Avatar + Name */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-2xl font-bold">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800">{user.name}</h2>
            <p className="text-stone-500 text-sm">{user.email}</p>
            <span className={`inline-block mt-1 badge text-xs ${
              user.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-orange-700"
            }`}>
              {user.role === "ADMIN" ? "👑 Admin" : "🐾 สมาชิก"}
            </span>
          </div>
        </div>

        {/* Info */}
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อ</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">เบอร์โทร</label>
              <input className="input" placeholder="081-234-5678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">ที่อยู่</label>
              <textarea className="input resize-none" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSave} disabled={loading} className="btn-primary py-2 px-6">
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button onClick={() => setEditing(false)} className="btn-outline py-2 px-6">ยกเลิก</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { label: "อีเมล", value: user.email, icon: "📧" },
              { label: "เบอร์โทร", value: (user as { phone?: string }).phone || "—", icon: "📞" },
              { label: "ที่อยู่", value: (user as { address?: string }).address || "—", icon: "📍" },
              { label: "สมาชิกตั้งแต่", value: formatDate((user as { createdAt: string }).createdAt), icon: "📅" },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 p-3 bg-stone-50 rounded-xl">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <p className="text-xs text-stone-400">{item.label}</p>
                  <p className="text-stone-700 font-medium">{item.value}</p>
                </div>
              </div>
            ))}
            <button onClick={() => setEditing(true)} className="btn-outline py-2 px-6 mt-2">
              ✏️ แก้ไขข้อมูล
            </button>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/profile/orders" className="card p-5 hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all">
          <div className="text-3xl mb-2">📦</div>
          <h3 className="font-semibold text-stone-800">ประวัติคำสั่งซื้อ</h3>
          <p className="text-sm text-stone-400">ดูรายการสั่งซื้อทั้งหมด</p>
        </Link>
        <Link href="/profile/wishlist" className="card p-5 hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all">
          <div className="text-3xl mb-2">❤️</div>
          <h3 className="font-semibold text-stone-800">รายการโปรด</h3>
          <p className="text-sm text-stone-400">สินค้าที่คุณบันทึกไว้</p>
        </Link>
        <Link href="/profile/addresses" className="card p-5 hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all">
          <div className="text-3xl mb-2">📍</div>
          <h3 className="font-semibold text-stone-800">ที่อยู่จัดส่ง</h3>
          <p className="text-sm text-stone-400">บันทึกและจัดการที่อยู่</p>
        </Link>
        <Link href="/cart" className="card p-5 hover:bg-orange-50 hover:border-orange-200 border-2 border-transparent transition-all">
          <div className="text-3xl mb-2">🛒</div>
          <h3 className="font-semibold text-stone-800">ตะกร้าสินค้า</h3>
          <p className="text-sm text-stone-400">ดูรายการในตะกร้า</p>
        </Link>
      </div>
    </div>
  );
}
