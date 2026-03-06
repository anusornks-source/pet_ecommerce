"use client";

import { useState, useEffect, useCallback } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";
import toast from "react-hot-toast";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; name: string; email: string; avatar: string | null; role: string };
}

export default function StaffPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("STAFF");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Multi-shop assignment (admin only)
  const [assignEmail, setAssignEmail] = useState("");
  const [assignRole, setAssignRole] = useState("STAFF");
  const [assignShopIds, setAssignShopIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignPreview, setAssignPreview] = useState<{ name: string; email: string; shopMemberships: { shopId: string; shopName: string; role: string }[] } | null>(null);
  const [assignError, setAssignError] = useState("");

  const lookupUser = useCallback(async (emailVal: string) => {
    if (!emailVal.trim()) { setAssignPreview(null); return; }
    const res = await fetch(`/api/admin/shops/assign-member?email=${encodeURIComponent(emailVal.trim())}`);
    const data = await res.json();
    if (data.success) setAssignPreview(data.data);
    else setAssignPreview(null);
  }, []);

  const handleAssign = async () => {
    if (!assignEmail.trim() || assignShopIds.length === 0) return;
    setAssigning(true);
    setAssignError("");
    const res = await fetch("/api/admin/shops/assign-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: assignEmail.trim(), role: assignRole, shopIds: assignShopIds }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`Assigned ${data.data.user.name} to ${data.data.assignments.length} shop(s)`);
      setAssignEmail("");
      setAssignShopIds([]);
      setAssignPreview(null);
      fetchMembers();
    } else {
      setAssignError(data.error || "Failed");
    }
    setAssigning(false);
  };

  const toggleShop = (shopId: string) => {
    setAssignShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId]
    );
  };

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

      {/* Multi-shop Assignment — Admin Only */}
      {isAdmin && shops.length > 0 && (
        <div className="bg-white rounded-2xl border border-violet-100 p-5 mb-6">
          <h2 className="font-semibold text-stone-800 mb-1">Assign to Multiple Shops</h2>
          <p className="text-xs text-stone-400 mb-4">เพิ่ม user ให้ดูแลหลายร้านพร้อมกัน — เฉพาะ Super Admin</p>
          <div className="space-y-3">
            <div className="flex gap-3 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <label className="text-sm text-stone-600 block mb-1">Email</label>
                <input
                  className="input w-full"
                  value={assignEmail}
                  onChange={(e) => setAssignEmail(e.target.value)}
                  onBlur={(e) => lookupUser(e.target.value)}
                  placeholder="user@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-stone-600 block mb-1">Role</label>
                <select className="input" value={assignRole} onChange={(e) => setAssignRole(e.target.value)}>
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
            </div>

            {assignPreview && (
              <div className="text-xs bg-violet-50 rounded-xl px-3 py-2 text-violet-700">
                พบ: <strong>{assignPreview.name}</strong> ({assignPreview.email})
                {assignPreview.shopMemberships.length > 0 && (
                  <span className="ml-2 text-violet-500">
                    — ปัจจุบันดูแล: {assignPreview.shopMemberships.map((m) => m.shopName).join(", ")}
                  </span>
                )}
              </div>
            )}

            <div>
              <label className="text-sm text-stone-600 block mb-2">เลือกร้านที่จะให้ดูแล</label>
              <div className="flex flex-wrap gap-2">
                {shops.map((s) => (
                  <label key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer text-sm transition-colors ${assignShopIds.includes(s.id) ? "border-violet-300 bg-violet-50 text-violet-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
                    <input
                      type="checkbox"
                      checked={assignShopIds.includes(s.id)}
                      onChange={() => toggleShop(s.id)}
                      className="accent-violet-500"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>

            {assignError && <p className="text-xs text-red-500">{assignError}</p>}

            <button
              onClick={handleAssign}
              disabled={assigning || !assignEmail.trim() || assignShopIds.length === 0}
              className="bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {assigning ? "กำลัง Assign..." : `Assign (${assignShopIds.length} ร้าน)`}
            </button>
          </div>
        </div>
      )}

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
