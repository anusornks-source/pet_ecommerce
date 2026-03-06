"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
  _count: { orders: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "USER" });
  const [saving, setSaving] = useState(false);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchUsers = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?page=${p}`);
    const d = await res.json();
    if (d.success) { setUsers(d.data); setTotal(d.total); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(1); }, [fetchUsers]);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return toast.error("กรุณากรอกข้อมูลให้ครบ");
    setSaving(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("สร้างผู้ใช้งานสำเร็จ");
      setForm({ name: "", email: "", password: "", phone: "", role: "USER" });
      setShowForm(false);
      fetchUsers(1);
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ผู้ใช้งาน</h1>
          <p className="text-stone-500 text-sm mt-1">{total.toLocaleString()} คน</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary px-4 py-2 text-sm">
          + เพิ่มผู้ใช้
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">สร้างผู้ใช้งานใหม่</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">ชื่อ *</label>
              <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="ชื่อผู้ใช้" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">อีเมล *</label>
              <input className="input w-full" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">รหัสผ่าน * (อย่างน้อย 6 ตัว)</label>
              <input className="input w-full" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">เบอร์โทร</label>
              <input className="input w-full" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0812345678" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">สิทธิ์</label>
              <select className="input w-full" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? "กำลังสร้าง..." : "สร้างผู้ใช้"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-outline px-4 py-2 text-sm">ยกเลิก</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">ไม่มีผู้ใช้งาน</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">อีเมล</th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">สิทธิ์</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden md:table-cell">คำสั่งซื้อ</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">สมัครเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-sm shrink-0">
                        {user.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">{user.name}</p>
                        {user.phone && (
                          <p className="text-xs text-stone-400">{user.phone}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        user.role === "ADMIN"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {user.role === "ADMIN" ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-500 hidden md:table-cell">
                    {user._count.orders}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-400 text-xs hidden lg:table-cell">
                    {new Date(user.createdAt).toLocaleDateString("th-TH")}
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
          <button disabled={page === 1} onClick={() => { setPage(page - 1); fetchUsers(page - 1); }} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">←</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | "...")[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) => p === "..." ? (
              <span key={`e-${i}`} className="px-2 text-stone-300">…</span>
            ) : (
              <button key={p} onClick={() => { setPage(p as number); fetchUsers(p as number); }} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages} onClick={() => { setPage(page + 1); fetchUsers(page + 1); }} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">→</button>
        </div>
      )}
    </div>
  );
}
