"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@/types";

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const category = searchParams.get("category") || "";
  const petType = searchParams.get("petType") || "";
  const search = searchParams.get("search") || "";
  const featured = searchParams.get("featured") || "";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (petType) params.set("petType", petType);
    if (search) params.set("search", search);
    if (featured) params.set("featured", featured);
    params.set("page", String(page));
    params.set("limit", "12");

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (data.success) {
      setProducts(data.data);
      setTotal(data.pagination.total);
    }
    setLoading(false);
  }, [category, petType, search, featured, page]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => d.success && setCategories(d.data));
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    setPage(1);
    router.push(`/products?${params}`);
  };

  const clearFilters = () => {
    setPage(1);
    router.push("/products");
  };

  const petTypes = [
    { value: "DOG", label: "🐕 สุนัข" },
    { value: "CAT", label: "🐈 แมว" },
    { value: "BIRD", label: "🐦 นก" },
    { value: "FISH", label: "🐠 ปลา" },
    { value: "RABBIT", label: "🐰 กระต่าย" },
  ];

  const hasFilters = category || petType || search || featured;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-800">สินค้าทั้งหมด</h1>
        <p className="text-stone-500 mt-1">
          {loading ? "กำลังโหลด..." : `${total} รายการ`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-60 shrink-0">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-800">ตัวกรอง</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-orange-500 hover:text-orange-600">
                  ล้างทั้งหมด
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mb-5">
              <label className="text-sm font-medium text-stone-600 block mb-2">ค้นหา</label>
              <input
                type="text"
                className="input text-sm"
                style={{ padding: "0.5rem 0.75rem" }}
                placeholder="ค้นหาสินค้า..."
                defaultValue={search}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setFilter("search", (e.target as HTMLInputElement).value);
                }}
                onBlur={(e) => setFilter("search", e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="mb-5">
              <label className="text-sm font-medium text-stone-600 block mb-2">หมวดหมู่</label>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter("category", "")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                  }`}
                >
                  ทั้งหมด
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter("category", cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.slug ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Pet Type */}
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-2">ประเภทสัตว์</label>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter("petType", "")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !petType ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                  }`}
                >
                  ทั้งหมด
                </button>
                {petTypes.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => setFilter("petType", pt.value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      petType === pt.value ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                    }`}
                  >
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-52 bg-stone-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-stone-100 rounded w-1/2" />
                    <div className="h-4 bg-stone-100 rounded" />
                    <div className="h-4 bg-stone-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              {/* Pagination */}
              {total > 12 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #e7e5e4",
                      color: "#57534e",
                      opacity: page === 1 ? 0.4 : 1,
                      cursor: page === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    ← ก่อนหน้า
                  </button>
                  <span style={{ padding: "0.5rem 1rem", color: "#57534e", fontSize: "0.875rem" }}>
                    หน้า {page} / {Math.ceil(total / 12)}
                  </span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / 12)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "0.75rem",
                      border: "1px solid #e7e5e4",
                      color: "#57534e",
                      opacity: page >= Math.ceil(total / 12) ? 0.4 : 1,
                      cursor: page >= Math.ceil(total / 12) ? "not-allowed" : "pointer",
                    }}
                  >
                    ถัดไป →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-stone-600 mb-2">ไม่พบสินค้า</h3>
              <p className="text-stone-400">ลองเปลี่ยนเงื่อนไขการค้นหาดูนะ</p>
              <button onClick={clearFilters} className="mt-4 btn-outline">ดูสินค้าทั้งหมด</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
