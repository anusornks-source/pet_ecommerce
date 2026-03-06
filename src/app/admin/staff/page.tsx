"use client";

import { useState, useEffect } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar: string | null; role: string };
}

export default function StaffPage() {
  const { activeShop, isAdmin } = useShopAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const shopId = activeShop?.id;

  const fetchMembers = () => {
    if (!shopId) return;
    fetch(`/api/admin/shops/${shopId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMembers(data.data);
        setLoading(false);
      });
  };

  useEffect(() => { fetchMembers(); }, [shopId]);

  const handleAdd = async () => {
    if (!email.trim() || !shopId) return;
    setAdding(true);
    setError("");
    const res = await fetch(`/api/admin/shops/${shopId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    const data = await res.json();
    if (data.success) {
      setEmail("");
      fetchMembers();
    } else {
      setError(data.error || "Failed to add member");
    }
    setAdding(false);
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!shopId) return;
    await fetch(`/api/admin/shops/${shopId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchMembers();
  };

  const handleRemove = async (memberId: string) => {
    if (!shopId || !confirm("Remove this member?")) return;
    await fetch(`/api/admin/shops/${shopId}/members/${memberId}`, { method: "DELETE" });
    fetchMembers();
  };

  if (!shopId) return <p className="text-stone-500">Please select a shop first.</p>;
  if (loading) return <div className="animate-pulse"><div className="h-8 bg-stone-100 rounded w-48 mb-4" /><div className="h-40 bg-stone-100 rounded-2xl" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">
        Staff Management — {activeShop?.name}
      </h1>

      {/* Add Member */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-6">
        <h2 className="font-semibold text-stone-800 mb-3">Add Member</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-stone-600 block mb-1">Email</label>
            <input className="input w-full" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@email.com" />
          </div>
          <div>
            <label className="text-sm text-stone-600 block mb-1">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="STAFF">Staff</option>
              <option value="MANAGER">Manager</option>
              <option value="OWNER">Owner</option>
            </select>
          </div>
          <button onClick={handleAdd} disabled={adding} className="btn-primary px-4 py-2 text-sm">
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* Members List */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-500 text-xs uppercase">
            <tr>
              <th className="text-left px-5 py-3">User</th>
              <th className="text-left px-5 py-3">Role</th>
              <th className="text-left px-5 py-3">Since</th>
              <th className="text-right px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-stone-50/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-600">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">{m.user.name}</p>
                      <p className="text-xs text-stone-400">{m.user.email}</p>
                    </div>
                    {m.user.role === "ADMIN" && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Super Admin</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <select
                    value={m.role}
                    onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                    className="text-xs border border-stone-200 rounded-lg px-2 py-1"
                  >
                    <option value="STAFF">Staff</option>
                    <option value="MANAGER">Manager</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </td>
                <td className="px-5 py-3 text-stone-400 text-xs">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleRemove(m.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {members.length === 0 && (
          <p className="text-center py-8 text-stone-400 text-sm">No staff members yet.</p>
        )}
      </div>
    </div>
  );
}
