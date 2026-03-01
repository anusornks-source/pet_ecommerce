"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

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
  petTypeId: string | null;
  petType: { id: string; name: string; slug: string; icon: string | null } | null;
  category: { id: string; name: string };
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

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterActive, setFilterActive] = useState("true");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPetType, setFilterPetType] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/pet-types")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPetTypes(d.data); });
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterSource) params.set("source", filterSource);
    if (filterActive) params.set("active", filterActive);
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterPetType) params.set("petType", filterPetType);
    const res = await fetch(`/api/admin/products?${params.toString()}`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  }, [search, filterSource, filterActive, filterCategory, filterPetType]);

  const activeFilterCount = [filterSource, filterActive, filterCategory, filterPetType].filter(Boolean).length;

  useEffect(() => {
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

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
            {products.length} รายการ
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
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterSource(""); setFilterActive(""); setFilterCategory(""); setFilterPetType(""); }}
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
                      <span className="font-medium text-stone-800 line-clamp-1">
                        {product.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell">
                    {product.category.name}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">
                    {product.petType ? (
                      <span>{product.petType.icon} {product.petType.name}</span>
                    ) : (
                      <span className="text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-800">
                    ฿{product.price.toLocaleString("th-TH")}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">
                    {product.stock}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {product.featured ? (
                      <span className="text-orange-500">⭐</span>
                    ) : (
                      <span className="text-stone-200">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden lg:table-cell">
                    {product.source === "CJ" ? (
                      <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">CJ</span>
                    ) : (
                      <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">Our Product</span>
                    )}
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
    </div>
  );
}
