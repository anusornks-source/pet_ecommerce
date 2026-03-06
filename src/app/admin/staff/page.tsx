"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
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

  // Selected shop for viewing members
  const [selectedShopId, setSelectedShopId] = useState(activeShop?.id ?? "");
  useEffect(() => {
    if (activeShop?.id && !selectedShopId) setSelectedShopId(activeShop.id);
  }, [activeShop?.id]);
  const selectedShop = shops.find((s) => s.id === selectedShopId) ?? activeShop;

  // Add member form
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("STAFF");
  const [addShopIds, setAddShopIds] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [preview, setPreview] = useState<{ name: string; email: string; shopMemberships: { shopId: string; shopName: string; role: string }[] } | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: string; name: string; email: string }[]>([]);

  // Pre-select current shop when selectedShopId changes
  useEffect(() => {
    if (selectedShopId) setAddShopIds([selectedShopId]);
  }, [selectedShopId]);

  const lookupUser = useCallback(async (q: string) => {
    if (!q.trim()) { setPreview(null); setSuggestions([]); return; }
    const res = await fetch(`/api/admin/shops/assign-member?email=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    if (data.success) { setPreview(data.data); setSuggestions([]); }
    else { setPreview(null); setSuggestions(data.suggestions ?? []); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => lookupUser(addEmail), 400);
    return () => clearTimeout(t);
  }, [addEmail, lookupUser]);

  const fetchMembers = useCallback(() => {
    if (!selectedShopId) return;
    fetch(`/api/admin/shops/${selectedShopId}/members`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setMembers(data.data);
        setLoading(false);
      });
  }, [selectedShopId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAdd = async () => {
    if (!addEmail.trim()) return;
    const targetShops = isAdmin ? addShopIds : [selectedShopId];
    if (targetShops.length === 0) return;
    setAdding(true);
    setAddError("");

    if (isAdmin) {
      // Use assign-member endpoint (supports multi-shop)
      const res = await fetch("/api/admin/shops/assign-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole, shopIds: targetShops }),
      });
      const data = await res.json();
      if (data.success) {
        const shopNames = data.data.assignments.map((a: { shopName: string }) => a.shopName).join(", ");
        toast.success(`เพิ่ม ${data.data.user.name} เข้า: ${shopNames}`);
        setAddEmail(""); setPreview(null);
        const firstAssigned = data.data.assignments[0]?.shopId;
        if (firstAssigned && shops.some((s) => s.id === firstAssigned)) {
          setSelectedShopId(firstAssigned);
        } else {
          fetchMembers();
        }
      } else {
        setAddError(data.error || "Failed");
      }
    } else {
      // Use shop members endpoint
      const res = await fetch(`/api/admin/shops/${selectedShopId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), role: addRole }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("เพิ่มสมาชิกสำเร็จ");
        setAddEmail(""); setPreview(null);
        fetchMembers();
      } else {
        setAddError(data.error || "Failed to add member");
      }
    }
    setAdding(false);
  };

  const toggleShop = (sid: string) => {
    setAddShopIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    if (!selectedShopId) return;
    await fetch(`/api/admin/shops/${selectedShopId}/members/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    fetchMembers();
  };

  const handleRemove = async (memberId: string) => {
    if (!selectedShopId || !confirm("Remove this member?")) return;
    await fetch(`/api/admin/shops/${selectedShopId}/members/${memberId}`, { method: "DELETE" });
    fetchMembers();
  };

  if (!activeShop && shops.length === 0) return <p className="text-stone-500">Please select a shop first.</p>;
  if (loading) return <div className="animate-pulse"><div className="h-8 bg-stone-100 rounded w-48 mb-4" /><div className="h-40 bg-stone-100 rounded-2xl" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-stone-800">Staff Management</h1>
        {(isAdmin || shops.length > 1) && (
          <select
            value={selectedShopId}
            onChange={(e) => { setSelectedShopId(e.target.value); setLoading(true); }}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white text-stone-600"
          >
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {!isAdmin && shops.length <= 1 && selectedShop && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">{selectedShop.name}</span>
        )}
      </div>

      {/* Add Member */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 mb-6">
        <h2 className="font-semibold text-stone-800 mb-3">Add Member</h2>
        <div className="space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-sm text-stone-600 block mb-1">ชื่อหรืออีเมล</label>
              <div className="relative">
                <input
                  className="input w-full"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="พิมชื่อหรืออีเมล..."
                />
                {suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors"
                        onClick={() => { setAddEmail(u.email); setSuggestions([]); }}
                      >
                        <span className="font-medium text-stone-800 text-sm">{u.name}</span>
                        <span className="text-xs text-stone-400 ml-2">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm text-stone-600 block mb-1">Role</label>
              <select className="input" value={addRole} onChange={(e) => setAddRole(e.target.value)}>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !addEmail.trim() || (isAdmin && addShopIds.length === 0)}
              className="btn-primary px-4 py-2 text-sm"
            >
              {adding ? "กำลังเพิ่ม..." : "Add"}
            </button>
          </div>

          {preview && (
            <div className="text-xs bg-orange-50 rounded-xl px-3 py-2 text-orange-700">
              พบ: <strong>{preview.name}</strong> ({preview.email})
              {preview.shopMemberships.length > 0 && (
                <span className="ml-2 text-stone-500">— ดูแลอยู่: {preview.shopMemberships.map((m) => m.shopName).join(", ")}</span>
              )}
            </div>
          )}

          {/* Multi-shop selector — admin only */}
          {isAdmin && shops.length > 1 && (
            <div>
              <label className="text-sm text-stone-600 block mb-2">เพิ่มเข้าร้าน</label>
              <div className="flex flex-wrap gap-2">
                {shops.map((s) => (
                  <label key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer text-sm transition-colors ${addShopIds.includes(s.id) ? "border-orange-300 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
                    <input
                      type="checkbox"
                      checked={addShopIds.includes(s.id)}
                      onChange={() => toggleShop(s.id)}
                      className="accent-orange-500"
                    />
                    {s.logoUrl ? (
                      <Image src={s.logoUrl} alt={s.name} width={18} height={18} className="rounded-full object-cover shrink-0" />
                    ) : (
                      <span className="w-[18px] h-[18px] rounded-full bg-stone-200 text-stone-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {addError && <p className="text-xs text-red-500">{addError}</p>}
        </div>
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
                  {m.user.role === "ADMIN" ? (
                    <span className="text-xs text-stone-400">—</span>
                  ) : (
                    <select
                      value={m.role}
                      onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                      className="text-xs border border-stone-200 rounded-lg px-2 py-1"
                    >
                      <option value="STAFF">Staff</option>
                      <option value="MANAGER">Manager</option>
                      <option value="OWNER">Owner</option>
                    </select>
                  )}
                </td>
                <td className="px-5 py-3 text-stone-400 text-xs">
                  {new Date(m.createdAt).toLocaleDateString()}
                </td>
                <td className="px-5 py-3 text-right">
                  {m.user.role !== "ADMIN" && (
                    <button
                      onClick={() => handleRemove(m.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
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
