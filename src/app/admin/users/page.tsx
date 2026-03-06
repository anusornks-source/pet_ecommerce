"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
  _count: { orders: number };
  shopMemberships: { role: string; shop: { id: string; name: string } }[];
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "USER" });
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "USER", password: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"" | "ADMIN" | "USER">("");
  const [filterActive, setFilterActive] = useState<"" | "true" | "false">("");
  const [filterShopStaff, setFilterShopStaff] = useState<"" | "true" | "false">("");

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.phone ?? "").includes(q)) return false;
    if (filterRole && u.role !== filterRole) return false;
    if (filterActive && String(u.active) !== filterActive) return false;
    if (filterShopStaff === "true" && !(u.shopMemberships?.length > 0)) return false;
    if (filterShopStaff === "false" && u.shopMemberships?.length > 0) return false;
    return true;
  });

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

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name, phone: user.phone ?? "", role: user.role, password: "" });
    setShowForm(false);
  };

  const handleUpdate = async () => {
    if (!editingUser || !editForm.name) return toast.error("กรุณากรอกชื่อ");
    setEditSaving(true);
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("อัปเดตผู้ใช้สำเร็จ");
      setEditingUser(null);
      fetchUsers(page);
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setEditSaving(false);
  };

  const handleToggleActive = async (user: User) => {
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(user.active ? "ปิดใช้งานแล้ว" : "เปิดใช้งานแล้ว");
      fetchUsers(page);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`ลบผู้ใช้ "${user.name}" ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบผู้ใช้สำเร็จ");
      fetchUsers(page);
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ผู้ใช้งาน</h1>
          <p className="text-stone-500 text-sm mt-1">{total.toLocaleString()} คน</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingUser(null); }} className="btn-primary px-4 py-2 text-sm">
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

      {editingUser && (
        <div className="bg-white rounded-2xl border border-orange-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">แก้ไขผู้ใช้: <span className="text-orange-600">{editingUser.email}</span></h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">ชื่อ *</label>
              <input className="input w-full" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">เบอร์โทร</label>
              <input className="input w-full" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="0812345678" />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">สิทธิ์</label>
              <select className="input w-full" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-1">รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
              <input className="input w-full" type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="••••••" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={handleUpdate} disabled={editSaving} className="btn-primary px-4 py-2 text-sm">
              {editSaving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
            <button onClick={() => setEditingUser(null)} className="btn-outline px-4 py-2 text-sm">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อ, อีเมล, เบอร์โทร..."
          className="flex-1 min-w-48 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as "" | "ADMIN" | "USER")}
          className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
          <option value="">สิทธิ์: ทั้งหมด</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">User</option>
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value as "" | "true" | "false")}
          className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
          <option value="">สถานะ: ทั้งหมด</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select value={filterShopStaff} onChange={(e) => setFilterShopStaff(e.target.value as "" | "true" | "false")}
          className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white">
          <option value="">Shop Staff: ทั้งหมด</option>
          <option value="true">เป็น Staff ร้าน</option>
          <option value="false">ไม่ใช่ Staff ร้าน</option>
        </select>
        {(search || filterRole || filterActive || filterShopStaff) && (
          <button onClick={() => { setSearch(""); setFilterRole(""); setFilterActive(""); setFilterShopStaff(""); }}
            className="text-xs px-3 py-2 rounded-xl border border-stone-200 text-stone-500 hover:bg-stone-50">
            ล้าง
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">{users.length === 0 ? "ไม่มีผู้ใช้งาน" : "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข"}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ชื่อ</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">อีเมล</th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">สิทธิ์</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden md:table-cell">คำสั่งซื้อ</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">สมัครเมื่อ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-stone-50 transition-colors ${!user.active ? "opacity-50" : ""}`}>
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
                        {user.shopMemberships?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {user.shopMemberships.map((m) => (
                              <span key={m.shop.id} className="text-xs px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                                {m.shop.name} · {m.role}
                              </span>
                            ))}
                          </div>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleToggleActive(user)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          user.active
                            ? "border-stone-200 text-stone-500 hover:bg-stone-50"
                            : "border-green-200 text-green-600 hover:bg-green-50"
                        }`}
                      >
                        {user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                      >
                        ลบ
                      </button>
                    </div>
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
