"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface Variant {
  id: string;
  sku: string | null;
  cjVid: string | null;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  cjStock: number | null;
  active: boolean;
  fulfillmentMethod: string | null;
  variantImage: string | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    fulfillmentMethod: string | null;
    images: string[];
  };
}

const FULFILLMENT_LABELS: Record<string, { label: string; className: string }> = {
  SELF:     { label: "ส่งเอง",   className: "bg-green-100 text-green-700" },
  CJ:       { label: "CJ",       className: "bg-blue-100 text-blue-700" },
  SUPPLIER: { label: "Supplier", className: "bg-purple-100 text-purple-700" },
};

function FulfillmentBadge({ variantMethod, productMethod }: { variantMethod: string | null; productMethod: string | null }) {
  if (variantMethod) {
    const f = FULFILLMENT_LABELS[variantMethod];
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f?.className ?? "bg-stone-100 text-stone-600"}`}>{f?.label ?? variantMethod}</span>;
  }
  const inherited = productMethod ?? "SELF";
  const f = FULFILLMENT_LABELS[inherited];
  return (
    <span className="flex flex-col gap-0.5">
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f?.className ?? "bg-stone-100 text-stone-600"}`}>{f?.label ?? inherited}</span>
      <span className="text-xs text-stone-400">ตามสินค้า</span>
    </span>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminVariantsPage() {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterFulfillment, setFilterFulfillment] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  const fetchVariants = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set("search", search);
    if (filterFulfillment) params.set("fulfillmentMethod", filterFulfillment);
    if (filterActive) params.set("active", filterActive);
    if (filterOutOfStock) params.set("outOfStock", "true");
    const res = await fetch(`/api/admin/variants?${params.toString()}`);
    const data = await res.json();
    if (data.success) { setVariants(data.data); setTotal(data.total); }
    setLoading(false);
  }, [search, filterFulfillment, filterActive, filterOutOfStock]);

  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => fetchVariants(1), 300);
    return () => clearTimeout(timer);
  }, [fetchVariants]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchVariants(newPage);
  };

  const handleToggleActive = async (v: Variant) => {
    setTogglingId(v.id);
    const res = await fetch("/api/admin/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: v.id, active: !v.active }),
    });
    const data = await res.json();
    if (data.success) {
      setVariants((prev) => prev.map((x) => x.id === v.id ? { ...x, active: !x.active } : x));
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setTogglingId(null);
  };

  const activeFilterCount = [filterFulfillment, filterActive, filterOutOfStock ? "1" : ""].filter(Boolean).length;

  const resetFilters = () => {
    setSearch("");
    setFilterFulfillment("");
    setFilterActive("");
    setFilterOutOfStock(false);
  };

  // Pagination buttons
  const getPageButtons = () => {
    const buttons: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) buttons.push(i);
    } else {
      buttons.push(1);
      if (page > 3) buttons.push("...");
      for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) buttons.push(i);
      if (page < totalPages - 2) buttons.push("...");
      buttons.push(totalPages);
    }
    return buttons;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Variants</h1>
          <p className="text-sm text-stone-500 mt-0.5">รายการ variant ทั้งหมด {total > 0 && `(${total.toLocaleString()} รายการ)`}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-52">
            <label className="block text-xs font-medium text-stone-500 mb-1">ค้นหา</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SKU / ชื่อสินค้า / CJ VID..."
              className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Fulfillment Method */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Fulfillment</label>
            <select
              value={filterFulfillment}
              onChange={(e) => setFilterFulfillment(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">ทั้งหมด</option>
              <option value="SELF">ส่งเอง</option>
              <option value="CJ">CJ</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="INHERIT">ตามสินค้า (inherit)</option>
            </select>
          </div>

          {/* Active */}
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">สถานะ</label>
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">ทั้งหมด</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Out of stock */}
          <div className="flex items-center gap-2 pb-2">
            <input
              id="outOfStock"
              type="checkbox"
              checked={filterOutOfStock}
              onChange={(e) => setFilterOutOfStock(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="outOfStock" className="text-sm text-stone-600 cursor-pointer">สินค้าหมด</label>
          </div>

          {/* Reset */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="pb-2 text-sm text-stone-500 hover:text-stone-700 underline"
            >
              ล้าง ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-stone-400 text-sm">กำลังโหลด...</div>
        ) : variants.length === 0 ? (
          <div className="py-20 text-center text-stone-400 text-sm">ไม่พบ variant</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-stone-500 font-medium">
                  <th className="px-4 py-3 text-left w-12">รูป</th>
                  <th className="px-4 py-3 text-left">สินค้า</th>
                  <th className="px-4 py-3 text-left">SKU</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Size / Color</th>
                  <th className="px-4 py-3 text-right">ราคา</th>
                  <th className="px-4 py-3 text-right">Stock</th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">Fulfillment</th>
                  <th className="px-4 py-3 text-center">Active</th>
                  <th className="px-4 py-3 text-center hidden xl:table-cell">วันที่</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {variants.map((v) => {
                  const img = v.variantImage || v.product.images?.[0] || null;
                  const sizeColor = [v.size, v.color].filter(Boolean).join(" / ");
                  return (
                    <tr key={v.id} className="hover:bg-stone-50 transition-colors">
                      {/* Image */}
                      <td className="px-4 py-3">
                        {img ? (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 relative">
                            <Image src={img} alt="" fill className="object-cover" sizes="40px" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-300 text-lg">📦</div>
                        )}
                      </td>

                      {/* Product name */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/products/${v.product.id}`}
                          className="font-medium text-stone-700 hover:text-orange-600 transition-colors line-clamp-2"
                        >
                          {v.product.name}
                        </Link>
                        {v.cjVid && <p className="text-xs text-stone-400 mt-0.5">CJ: {v.cjVid}</p>}
                      </td>

                      {/* SKU */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-stone-600">{v.sku || <span className="text-stone-300">—</span>}</span>
                      </td>

                      {/* Size / Color */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-stone-600">{sizeColor || <span className="text-stone-300">—</span>}</span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-medium text-stone-700">
                        ฿{v.price.toLocaleString()}
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${v.stock <= 0 ? "text-red-500" : "text-stone-700"}`}>
                          {v.stock.toLocaleString()}
                        </span>
                        {v.cjStock != null && (
                          <p className="text-xs text-stone-400">CJ: {v.cjStock}</p>
                        )}
                      </td>

                      {/* Fulfillment */}
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <FulfillmentBadge variantMethod={v.fulfillmentMethod} productMethod={v.product.fulfillmentMethod} />
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleActive(v)}
                          disabled={togglingId === v.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            v.active ? "bg-orange-400" : "bg-stone-200"
                          } ${togglingId === v.id ? "opacity-50" : ""}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              v.active ? "translate-x-4" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-center text-xs text-stone-400 hidden xl:table-cell">
                        {formatDate(v.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/admin/products/${v.product.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium transition-colors"
                        >
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            หน้า {page} จาก {totalPages} ({total.toLocaleString()} รายการ)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
            >
              ‹
            </button>
            {getPageButtons().map((btn, i) =>
              btn === "..." ? (
                <span key={`ellipsis-${i}`} className="px-3 py-1.5 text-sm text-stone-400">…</span>
              ) : (
                <button
                  key={btn}
                  onClick={() => handlePageChange(btn)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                    btn === page
                      ? "bg-orange-500 text-white border-orange-500"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {btn}
                </button>
              )
            )}
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 disabled:opacity-40 hover:bg-stone-50"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
