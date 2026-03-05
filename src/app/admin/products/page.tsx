"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  images: string[];
  featured: boolean;
  active: boolean;
  createdAt: string;
  source: string | null;
  sourceData: object | null;
  fulfillmentMethod: string;
  petTypeId: string | null;
  petType: { id: string; name: string; slug: string; icon: string | null } | null;
  category: { id: string; name: string };
  tags: Tag[];
}

interface Category {
  id: string;
  name: string;
}

interface PetType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

const TAG_COLORS: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700",
  red:    "bg-red-100 text-red-700",
  green:  "bg-green-100 text-green-700",
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  yellow: "bg-yellow-100 text-yellow-800",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterActive, setFilterActive] = useState("true");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPetType, setFilterPetType] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [editingCell, setEditingCell] = useState<{ productId: string; field: "category" | "petType" | "tags" } | null>(null);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const handleInlineEdit = async (productId: string, field: "category" | "petType", value: string) => {
    setSavingCell(productId + field);
    const body = field === "category" ? { categoryId: value } : { petTypeId: value || null };
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => {
          if (p.id !== productId) return p;
          if (field === "category") {
            const cat = categories.find((c) => c.id === value);
            return cat ? { ...p, category: cat } : p;
          } else {
            const pt = petTypes.find((t) => t.id === value) ?? null;
            return { ...p, petType: pt, petTypeId: value || null };
          }
        }));
      } else {
        toast.error(data.error || "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSavingCell(null);
      setEditingCell(null);
    }
  };

  const pageSize = 50;
  const totalPages = Math.ceil(total / pageSize);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/pet-types")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPetTypes(d.data); });
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTags(d.data); });
  }, []);

  const fetchProducts = useCallback(async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (search) params.set("search", search);
    if (filterSource) params.set("source", filterSource);
    if (filterActive) params.set("active", filterActive);
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterPetType) params.set("petType", filterPetType);
    if (filterTag) params.set("tagId", filterTag);
    const res = await fetch(`/api/admin/products?${params.toString()}`);
    const data = await res.json();
    if (data.success) { setProducts(data.data); setTotal(data.total); }
    setLoading(false);
  }, [search, filterSource, filterActive, filterCategory, filterPetType, filterTag]);

  const activeFilterCount = [filterSource, filterActive, filterCategory, filterPetType, filterTag].filter(Boolean).length;

  // When filters change: reset page to 1 and debounce fetch
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts(newPage);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบสินค้า "${name}" ใช่หรือไม่?`)) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบสินค้าแล้ว");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setDeleting(null);
  };

  const handleToggleFeatured = async (product: Product) => {
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: !product.featured }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, featured: !product.featured } : p))
      );
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleToggleTag = async (product: Product, tagId: string) => {
    const currentIds = product.tags.map((t) => t.id);
    const newIds = currentIds.includes(tagId)
      ? currentIds.filter((id) => id !== tagId)
      : [...currentIds, tagId];
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagIds: newIds }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id !== product.id) return p;
          const newTags = newIds.map((id) => tags.find((t) => t.id === id)!).filter(Boolean);
          return { ...p, tags: newTags };
        })
      );
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
  };

  const handleToggleActive = async (product: Product) => {
    setTogglingId(product.id);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    const data = await res.json();
    if (data.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, active: !product.active } : p))
      );
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setTogglingId(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">สินค้า</h1>
          <p className="text-stone-500 text-sm mt-1">
            {total.toLocaleString()} รายการ
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          + เพิ่มสินค้า
        </Link>
      </div>

      {/* Search + Filters */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 border border-stone-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">แหล่งที่มา: ทั้งหมด</option>
            <option value="CJ">CJ Dropshipping</option>
            <option value="own">สินค้าเรา</option>
            <option value="exCJ">เคย CJ (unlinked)</option>
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">สถานะ: ทั้งหมด</option>
            <option value="true">เผยแพร่แล้ว</option>
            <option value="false">ซ่อนอยู่</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">หมวดหมู่: ทั้งหมด</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={filterPetType}
            onChange={(e) => setFilterPetType(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-600 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
          >
            <option value="">ประเภทสัตว์: ทั้งหมด</option>
            {petTypes.map((p) => (
              <option key={p.slug} value={p.slug}>{p.icon} {p.name}</option>
            ))}
          </select>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setFilterTag(filterTag === tag.id ? "" : tag.id)}
                  className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filterTag === tag.id
                      ? TAG_COLORS[tag.color] + " border-current font-medium"
                      : "border-stone-200 text-stone-500 hover:border-stone-300"
                  }`}
                >
                  {tag.icon && <span>{tag.icon}</span>}
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterSource(""); setFilterActive(""); setFilterCategory(""); setFilterPetType(""); setFilterTag(""); }}
              className="flex items-center gap-1.5 border border-stone-200 rounded-xl px-3 py-2 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
            >
              ล้าง
              <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            กำลังโหลด...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-stone-400 text-sm">
            ไม่พบสินค้า
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">
                  สินค้า
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden md:table-cell">
                  หมวดหมู่
                </th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">
                  ประเภทสัตว์
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">
                  ราคา
                </th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium hidden sm:table-cell">
                  สต็อก
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">
                  แนะนำ
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden lg:table-cell">
                  แหล่งที่มา
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium hidden xl:table-cell">
                  วันที่สร้าง
                </th>
                <th className="text-center px-4 py-3 text-stone-500 font-medium">
                  เผยแพร่
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {products.map((product) => (
                <tr key={product.id} className={`hover:bg-stone-50 transition-colors ${!product.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-300 text-lg">
                            📦
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-stone-800 line-clamp-1">
                          {product.name}
                        </span>
                        <div className="relative mt-0.5">
                          <div
                            className="flex flex-wrap gap-1 cursor-pointer"
                            onClick={() => setEditingCell({ productId: product.id, field: "tags" })}
                          >
                            {product.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${TAG_COLORS[tag.color]}`}
                              >
                                {tag.icon && <span>{tag.icon}</span>}
                                {tag.name}
                              </span>
                            ))}
                            <span className="inline-flex items-center text-[10px] px-1 py-0.5 rounded-full text-stone-300 hover:text-orange-400 hover:bg-orange-50">
                              + tag
                            </span>
                          </div>
                          {editingCell?.productId === product.id && editingCell.field === "tags" && (
                            <div
                              className="absolute left-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-xl shadow-lg p-2 min-w-40"
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              {tags.length === 0 ? (
                                <p className="text-xs text-stone-400 px-1">ไม่มี tag</p>
                              ) : tags.map((tag) => {
                                const active = product.tags.some((t) => t.id === tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleToggleTag(product, tag.id)}
                                    className={`flex items-center gap-1.5 w-full text-left px-2 py-1 rounded-lg text-xs transition-colors ${active ? "bg-orange-50 text-orange-700 font-medium" : "hover:bg-stone-50 text-stone-600"}`}
                                  >
                                    <span className={`w-2 h-2 rounded-full ${active ? "bg-orange-400" : "bg-stone-200"}`} />
                                    {tag.icon && <span>{tag.icon}</span>}
                                    {tag.name}
                                  </button>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                className="mt-1 w-full text-center text-[10px] text-stone-400 hover:text-stone-600"
                              >
                                ปิด
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {editingCell?.productId === product.id && editingCell.field === "category" ? (
                      <select
                        autoFocus
                        defaultValue={product.category.id}
                        disabled={savingCell === product.id + "category"}
                        onChange={(e) => handleInlineEdit(product.id, "category", e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="text-xs border border-orange-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                      >
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingCell({ productId: product.id, field: "category" })}
                        className="text-sm text-stone-500 hover:text-orange-500 hover:underline text-left"
                      >
                        {product.category.name}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {editingCell?.productId === product.id && editingCell.field === "petType" ? (
                      <select
                        autoFocus
                        defaultValue={product.petTypeId ?? ""}
                        disabled={savingCell === product.id + "petType"}
                        onChange={(e) => handleInlineEdit(product.id, "petType", e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        className="text-xs border border-orange-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                      >
                        <option value="">— ไม่ระบุ —</option>
                        {petTypes.map((t) => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => setEditingCell({ productId: product.id, field: "petType" })}
                        className="text-sm text-stone-500 hover:text-orange-500 hover:underline text-left"
                      >
                        {product.petType ? `${product.petType.icon} ${product.petType.name}` : <span className="text-stone-300">—</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-800">
                    ฿{product.price.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <button
                      onClick={() => handleToggleFeatured(product)}
                      title={product.featured ? "ยกเลิกแนะนำ" : "ตั้งเป็นแนะนำ"}
                      className="hover:scale-125 transition-transform"
                    >
                      {product.featured ? (
                        <span className="text-orange-400 text-base leading-none">★</span>
                      ) : (
                        <span className="text-stone-300 hover:text-orange-300 text-base leading-none">☆</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    <div className="flex flex-col items-center gap-0.5">
                      {product.fulfillmentMethod === "CJ" ? (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">CJ</span>
                      ) : product.fulfillmentMethod === "SUPPLIER" ? (
                        <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">Supplier</span>
                      ) : (
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">ส่งเอง</span>
                      )}
                      {product.sourceData && product.fulfillmentMethod !== "CJ" && (
                        <span className="text-[9px] text-blue-400">เคย CJ</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-stone-400 text-xs hidden xl:table-cell whitespace-nowrap">
                    {formatDate(product.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id}
                      title={product.active ? "คลิกเพื่อซ่อน" : "คลิกเพื่อเผยแพร่"}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
                        product.active ? "bg-green-500" : "bg-stone-200"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          product.active ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
                      >
                        แก้ไข
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
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
          <button disabled={page === 1} onClick={() => handlePageChange(page - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">←</button>
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
              <button key={p} onClick={() => handlePageChange(p as number)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${page === p ? "bg-stone-800 text-white border-stone-800" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>{p}</button>
            ))}
          <button disabled={page === totalPages} onClick={() => handlePageChange(page + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed">→</button>
        </div>
      )}
    </div>
  );
}
