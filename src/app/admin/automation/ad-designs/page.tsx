"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import toast from "react-hot-toast";

type AdDesignRow = {
  id: string;
  productId: string;
  name: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  productName: string;
  productNameTh: string | null;
};

export default function AdDesignsPage() {
  const { t } = useLocale();
  const [list, setList] = useState<AdDesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productOptions, setProductOptions] = useState<{ id: string; name: string; name_th: string | null }[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `/api/admin/ad-designs?search=${encodeURIComponent(search.trim())}`
        : "/api/admin/ad-designs";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setList(data.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    if (!showAddModal) return;
    if (!productSearch.trim()) {
      setProductOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(
        `/api/admin/products?search=${encodeURIComponent(productSearch)}&nameOnly=true&limit=20`
      );
      const data = await res.json();
      const arr = data.products ?? data.data ?? [];
      setProductOptions(Array.isArray(arr) ? arr : []);
    }, 300);
    return () => clearTimeout(t);
  }, [showAddModal, productSearch]);

  const handleDelete = async (id: string) => {
    if (!confirm("ลบ Ad Design นี้?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/ad-designs/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setList((prev) => prev.filter((d) => d.id !== id));
        toast.success("ลบแล้ว");
      } else {
        toast.error(data.error ?? "ลบไม่สำเร็จ");
      }
    } finally {
      setDeleting(null);
    }
  };

  const startEdit = (row: AdDesignRow) => {
    setEditingId(row.id);
    setEditName(row.name);
    setEditNote(row.note ?? "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditNote("");
  };

  const handleSaveMeta = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/ad-designs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), note: editNote.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setList((prev) =>
          prev.map((d) =>
            d.id === editingId
              ? { ...d, name: editName.trim(), note: editNote.trim() || null }
              : d
          )
        );
        toast.success("บันทึกแล้ว");
        cancelEdit();
      } else {
        toast.error(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddSelectProduct = (productId: string) => {
    setShowAddModal(false);
    setProductSearch("");
    setProductOptions([]);
    window.location.href = `/admin/ad-designer?productId=${productId}&returnUrl=${encodeURIComponent("/admin/automation/ad-designs")}`;
  };

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return s;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[90rem] mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-800">
          {t("adDesign", "adminPages")}
        </h1>
        <div className="flex items-center gap-3">
          <input
            type="search"
            placeholder="ค้นหาชื่อ, หมายเหตุ หรือชื่อสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400"
          />
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
          >
            + เพิ่ม Ad Design
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">กำลังโหลด...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-stone-500">
            {search.trim() ? "ไม่พบรายการที่ตรงกับคำค้น" : "ยังไม่มี Ad Design — กดเพิ่มแล้วไปสร้างจาก Ad Designer"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-xs font-semibold text-stone-600 uppercase tracking-wider">
                  <th className="px-4 py-3">ชื่อ</th>
                  <th className="px-4 py-3">หมายเหตุ</th>
                  <th className="px-4 py-3">สินค้า</th>
                  <th className="px-4 py-3">อัปเดตเมื่อ</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-stone-100 hover:bg-stone-50/50"
                  >
                    <td className="px-4 py-3">
                      {editingId === row.id ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full max-w-xs px-2 py-1.5 text-sm rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300"
                          placeholder="ชื่อ"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-left w-full font-medium text-stone-800 hover:text-violet-600 hover:underline"
                        >
                          {row.name}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === row.id ? (
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          rows={2}
                          className="w-full max-w-md px-2 py-1.5 text-sm rounded border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300 resize-y"
                          placeholder="หมายเหตุ"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="text-left w-full text-stone-600 text-sm whitespace-pre-wrap line-clamp-2 hover:text-violet-600 hover:underline"
                        >
                          {row.note || "—"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${row.productId}/view`}
                        className="text-sm text-violet-600 hover:underline"
                      >
                        {row.productNameTh || row.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-500">
                      {formatDate(row.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {editingId === row.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="text-xs px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-100"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveMeta}
                            disabled={saving || !editName.trim()}
                            className="text-xs px-2 py-1 rounded bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
                          >
                            {saving ? "..." : "บันทึก"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/ad-designer?adDesignId=${row.id}&returnUrl=${encodeURIComponent("/admin/automation/ad-designs")}`}
                            className="text-xs px-2 py-1 rounded border border-violet-300 text-violet-600 hover:bg-violet-50"
                          >
                            เปิดแก้
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(row.id)}
                            disabled={deleting === row.id}
                            className="text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            {deleting === row.id ? "..." : "ลบ"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-stone-800 mb-3">
              เลือกสินค้าเพื่อสร้าง Ad Design
            </h3>
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="ค้นชื่อสินค้า..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-violet-300 mb-3"
            />
            <ul className="max-h-60 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-100">
              {productOptions.length === 0 && !productSearch.trim() && (
                <li className="px-3 py-4 text-sm text-stone-400">พิมพ์ค้นหาสินค้า</li>
              )}
              {productOptions.length === 0 && productSearch.trim() && (
                <li className="px-3 py-4 text-sm text-stone-400">ไม่พบสินค้า</li>
              )}
              {productOptions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleAddSelectProduct(p.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 text-stone-800"
                  >
                    {p.name_th || p.name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
