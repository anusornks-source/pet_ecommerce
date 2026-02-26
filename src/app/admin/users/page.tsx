"use client";

import { useEffect, useState } from "react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setUsers(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">ผู้ใช้งาน</h1>
        <p className="text-stone-500 text-sm mt-1">{users.length} คน</p>
      </div>

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
    </div>
  );
}
