"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import { useLocale } from "@/context/LocaleContext";
import type { Product, Category, PetType } from "@/types";

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { lang, t, pick } = useLocale();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypeList, setPetTypeList] = useState<PetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const category = searchParams.get("category") || "";
  const petType = searchParams.get("petType") || "";
  const search = searchParams.get("search") || "";
  const featured = searchParams.get("featured") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "newest";

  const [priceRange, setPriceRange] = useState<[string, string]>([minPrice, maxPrice]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (petType) params.set("petType", petType);
    if (search) params.set("search", search);
    if (featured) params.set("featured", featured);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    if (sort !== "newest") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", "12");

    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (data.success) {
      setProducts(data.data);
      setTotal(data.pagination.total);
    }
    setLoading(false);
  }, [category, petType, search, featured, minPrice, maxPrice, sort, page]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => d.success && setCategories(d.data));
    fetch("/api/pet-types")
      .then((r) => r.json())
      .then((d) => d.success && setPetTypeList(d.data));
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
    setPriceRange(["", ""]);
    router.push("/products");
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (priceRange[0]) params.set("minPrice", priceRange[0]);
    else params.delete("minPrice");
    if (priceRange[1]) params.set("maxPrice", priceRange[1]);
    else params.delete("maxPrice");
    params.delete("page");
    setPage(1);
    router.push(`/products?${params}`);
  };

  const hasFilters = category || petType || search || featured || minPrice || maxPrice || sort !== "newest";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-800">{t("allProducts", "product")}</h1>
        <p className="text-stone-500 mt-1">
          {loading ? t("loading") : `${total} ${lang === "th" ? "รายการ" : "items"}`}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <aside className="lg:w-60 shrink-0">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100 sticky top-20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-800">{lang === "th" ? "ตัวกรอง" : "Filters"}</h3>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-orange-500 hover:text-orange-600">
                  {lang === "th" ? "ล้างทั้งหมด" : "Clear all"}
                </button>
              )}
            </div>

            {/* Search */}
            <div className="mb-5">
              <label className="text-sm font-medium text-stone-600 block mb-2">{lang === "th" ? "ค้นหา" : "Search"}</label>
              <input
                type="text"
                className="input text-sm"
                style={{ padding: "0.5rem 0.75rem" }}
                placeholder={t("search", "product")}
                defaultValue={search}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setFilter("search", (e.target as HTMLInputElement).value);
                }}
                onBlur={(e) => setFilter("search", e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="mb-5">
              <label className="text-sm font-medium text-stone-600 block mb-2">{lang === "th" ? "หมวดหมู่" : "Category"}</label>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter("category", "")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !category ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                  }`}
                >
                  {lang === "th" ? "ทั้งหมด" : "All"}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilter("category", cat.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      category === cat.slug ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                    }`}
                  >
                    {cat.icon} {pick(cat.name_th, cat.name)}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-5">
              <label className="text-sm font-medium text-stone-600 block mb-2">{lang === "th" ? "ช่วงราคา (บาท)" : "Price Range (฿)"}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  placeholder={lang === "th" ? "ต่ำสุด" : "Min"}
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([e.target.value, priceRange[1]])}
                  onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
                  className="input text-sm w-full"
                  style={{ padding: "0.5rem 0.75rem" }}
                />
                <span className="text-stone-400 shrink-0">—</span>
                <input
                  type="number"
                  min={0}
                  placeholder={lang === "th" ? "สูงสุด" : "Max"}
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], e.target.value])}
                  onKeyDown={(e) => e.key === "Enter" && applyPriceFilter()}
                  className="input text-sm w-full"
                  style={{ padding: "0.5rem 0.75rem" }}
                />
              </div>
              <button
                onClick={applyPriceFilter}
                className="mt-2 w-full text-sm py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
              >
                {lang === "th" ? "กรองราคา" : "Apply"}
              </button>
              {(minPrice || maxPrice) && (
                <p className="mt-1 text-xs text-stone-400 text-center">
                  {minPrice ? `฿${Number(minPrice).toLocaleString()}` : "0"} — {maxPrice ? `฿${Number(maxPrice).toLocaleString()}` : "∞"}
                </p>
              )}
            </div>

            {/* Pet Type */}
            <div>
              <label className="text-sm font-medium text-stone-600 block mb-2">{lang === "th" ? "ประเภทสัตว์" : "Pet Type"}</label>
              <div className="space-y-1">
                <button
                  onClick={() => setFilter("petType", "")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !petType ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                  }`}
                >
                  {lang === "th" ? "ทั้งหมด" : "All"}
                </button>
                {petTypeList.map((pt) => (
                  <button
                    key={pt.slug}
                    onClick={() => setFilter("petType", pt.slug)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      petType === pt.slug ? "bg-orange-500 text-white" : "text-stone-600 hover:bg-orange-50"
                    }`}
                  >
                    {pt.icon} {pick(pt.name_th, pt.name)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Sort Bar */}
          <div className="flex items-center justify-end mb-4 gap-2">
            <span className="text-sm text-stone-500">{t("sortBy", "product")}</span>
            <select
              value={sort}
              onChange={(e) => setFilter("sort", e.target.value === "newest" ? "" : e.target.value)}
              className="input text-sm"
              style={{ padding: "0.4rem 0.75rem", width: "auto" }}
            >
              <option value="newest">{lang === "th" ? "ใหม่ล่าสุด" : "Newest"}</option>
              <option value="oldest">{lang === "th" ? "เก่าสุด" : "Oldest"}</option>
              <option value="price_asc">{lang === "th" ? "ราคา: ต่ำ → สูง" : "Price: Low → High"}</option>
              <option value="price_desc">{lang === "th" ? "ราคา: สูง → ต่ำ" : "Price: High → Low"}</option>
              <option value="name_asc">{lang === "th" ? "ชื่อ ก → ฮ" : "Name A → Z"}</option>
            </select>
          </div>
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
              <h3 className="text-xl font-semibold text-stone-600 mb-2">{lang === "th" ? "ไม่พบสินค้า" : "No products found"}</h3>
              <p className="text-stone-400">{lang === "th" ? "ลองเปลี่ยนเงื่อนไขการค้นหาดูนะ" : "Try changing your search filters"}</p>
              <button onClick={clearFilters} className="mt-4 btn-outline">{t("allProducts", "product")}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
