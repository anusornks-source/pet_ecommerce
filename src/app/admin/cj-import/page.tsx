"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface CJItem {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
  inventoryNum?: number;
  productSales?: number;
  productRating?: number;
  productVideoSet?: string[];
  productImageSet?: string[];
}

interface ShippingOption {
  logisticName: string;
  priceUSD: number;
  deliveryTime: string;
  deliveryDays: { min: number; max: number } | null;
  warehouseType: "CN" | "US" | "LOCAL";
  hasTracking: boolean;
}

interface InsightData {
  totalStock: number;
  variantCount: number;
  shippingOptions: ShippingOption[];
  badges: { hasStock: boolean; hasFastShipping: boolean; hasTracking: boolean };
  isRecommended: boolean;
}

interface Category { id: string; name: string; icon: string | null }
interface PetType { id: string; name: string; slug: string; icon: string | null }

export default function CJImportPage() {
  const [keyword, setKeyword] = useState("");
  const [searchMode, setSearchMode] = useState<"name" | "pid" | "sku">("name");
  const [searching, setSearching] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [insightProgress, setInsightProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState<CJItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importForm, setImportForm] = useState<Record<string, { categoryId: string; petTypeId: string }>>({});
  const [importedIds, setImportedIds] = useState<Record<string, string>>({});
  const [insights, setInsights] = useState<Record<string, InsightData | "loading" | "error">>({});

  const [priceFactor, setPriceFactor] = useState(3);
  const [usdToThb, setUsdToThb] = useState(36);
  const [estShippingUSD, setEstShippingUSD] = useState(2.0);
  const [showPriceSettings, setShowPriceSettings] = useState(false);

  // Load insights sequentially to avoid CJ rate limiting (20 parallel calls = rate limit errors)
  const loadAllInsights = async (items: CJItem[]) => {
    const pending = items.filter((item) => !insights[item.pid]);
    if (pending.length === 0) return;
    setLoadingInsights(true);
    setInsightProgress({ done: 0, total: pending.length });
    setInsights((prev) => {
      const next = { ...prev };
      pending.forEach((item) => { next[item.pid] = "loading"; });
      return next;
    });
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      try {
        const res = await fetch(`/api/admin/cj-products/insight?pid=${item.pid}`);
        const d = await res.json();
        setInsights((prev) => ({ ...prev, [item.pid]: d.success ? d.data : "error" }));
      } catch {
        setInsights((prev) => ({ ...prev, [item.pid]: "error" }));
      }
      setInsightProgress({ done: i + 1, total: pending.length });
      // Small delay between calls to avoid CJ rate limiting
      if (i < pending.length - 1) await new Promise((r) => setTimeout(r, 300));
    }
    setLoadingInsights(false);
  };

  const [filterStock, setFilterStock] = useState(false);
  const [filterOrders, setFilterOrders] = useState(false);
  const [filterRating, setFilterRating] = useState(false);
  const [filterImage, setFilterImage] = useState(false);
  const [filterVideo, setFilterVideo] = useState(false);
  const [filterFastShipping, setFilterFastShipping] = useState(false);
  const [maxDeliveryDays, setMaxDeliveryDays] = useState(15);
  const [minStock, setMinStock] = useState(500);
  const [minOrders, setMinOrders] = useState(1000);
  const [minRating, setMinRating] = useState(4.5);

  const applyFilters = (items: CJItem[]) => items.filter((item) => {
    // Only filter out if field is present AND fails threshold (undefined = unknown → keep)
    if (filterStock && item.inventoryNum != null && item.inventoryNum < minStock) return false;
    if (filterOrders && item.productSales != null && item.productSales < minOrders) return false;
    if (filterRating && item.productRating != null && item.productRating < minRating) return false;
    if (filterImage && item.productImageSet != null && !(item.productImageSet.length || item.productImage)) return false;
    if (filterVideo && item.productVideoSet != null && !item.productVideoSet.length) return false;
    if (filterFastShipping) {
      const insight = insights[item.pid];
      if (!insight || insight === "loading" || insight === "error") return false; // ยังไม่มีข้อมูล → ซ่อน
      const hasFast = insight.shippingOptions.some(
        (o) => o.deliveryDays !== null && o.deliveryDays.min <= maxDeliveryDays
      );
      if (!hasFast) return false;
    }
    return true;
  });

  const filteredResults = applyFilters(results);
  const activeFilterCount = [filterStock, filterOrders, filterRating, filterImage, filterVideo, filterFastShipping].filter(Boolean).length;
  // Detect if CJ list API returned these optional fields (not all versions do)
  const hasInventoryData = results.some((r) => r.inventoryNum != null);
  const hasSalesData = results.some((r) => r.productSales != null);
  const hasRatingData = results.some((r) => r.productRating != null);
  const noDataFiltersActive = (filterStock && !hasInventoryData) || (filterOrders && !hasSalesData) || (filterRating && !hasRatingData);

  const calcSellPrice = (usd: number) => Math.ceil(Number(usd) * usdToThb * priceFactor);
  const calcMargin = (costUSD: number) => {
    const sell = calcSellPrice(costUSD);
    const cost = Math.ceil(costUSD * usdToThb);
    const ship = Math.ceil(estShippingUSD * usdToThb);
    const margin = sell - cost - ship;
    const pct = sell > 0 ? Math.round((margin / sell) * 100) : 0;
    return { sell, cost, ship, margin, pct };
  };

  const handleSearch = async (p = 1) => {
    if (!keyword.trim()) return;
    setSearching(true);
    setResults([]);
    // Fetch categories/pet types once
    if (categories.length === 0) {
      fetch("/api/admin/categories").then((r) => r.json()).then((d) => { if (d.success) setCategories(d.data); });
      fetch("/api/admin/pet-types").then((r) => r.json()).then((d) => { if (d.success) setPetTypes(d.data); });
    }
    try {
      const url = searchMode === "pid"
        ? `/api/admin/cj-products?pid=${encodeURIComponent(keyword.trim())}`
        : searchMode === "sku"
        ? `/api/admin/cj-products?sku=${encodeURIComponent(keyword.trim())}`
        : `/api/admin/cj-products?keyword=${encodeURIComponent(keyword)}&page=${p}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setResults(data.data.list);
        setTotal(data.data.total);
        setPage(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        toast.error(data.error || "ค้นหาไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการค้นหา");
    }
    setSearching(false);
  };

  const toggleImportPanel = (pid: string) => {
    if (importingPid === pid) { setImportingPid(null); return; }
    setImportingPid(pid);
    if (!importForm[pid]) {
      setImportForm((f) => ({ ...f, [pid]: { categoryId: categories[0]?.id ?? "", petTypeId: "" } }));
    }
    if (!insights[pid]) {
      setInsights((prev) => ({ ...prev, [pid]: "loading" }));
      fetch(`/api/admin/cj-products/insight?pid=${pid}`)
        .then((r) => r.json())
        .then((d) => setInsights((prev) => ({ ...prev, [pid]: d.success ? d.data : "error" })))
        .catch(() => setInsights((prev) => ({ ...prev, [pid]: "error" })));
    }
  };

  const handleImport = async (item: CJItem) => {
    const form = importForm[item.pid];
    if (!form?.categoryId) { toast.error("กรุณาเลือกหมวดหมู่"); return; }
    const toastId = toast.loading("กำลัง import...");

    // Extract delivery info from insight
    let deliveryDays: number | undefined;
    let warehouseCountry: string | undefined;
    const insight = insights[item.pid];
    if (insight && insight !== "loading" && insight !== "error") {
      const withDays = insight.shippingOptions.filter((o) => o.deliveryDays !== null);
      const tracked = withDays.filter((o) => o.hasTracking);
      const pool = tracked.length > 0 ? tracked : withDays;
      if (pool.length > 0) {
        const fastest = pool.reduce((a, b) => (a.deliveryDays!.min <= b.deliveryDays!.min ? a : b));
        deliveryDays = fastest.deliveryDays!.min;
        warehouseCountry = fastest.warehouseType === "LOCAL" ? "CN" : fastest.warehouseType;
      }
    }

    try {
      const res = await fetch("/api/admin/cj-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pid: item.pid,
          categoryId: form.categoryId,
          petTypeId: form.petTypeId || null,
          priceFactor,
          usdToThb,
          fallbackCostUSD: Number(item.sellPrice),
          ...(deliveryDays !== undefined && { deliveryDays }),
          ...(warehouseCountry && { warehouseCountry }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`นำเข้า "${data.data.name}" แล้ว`, { id: toastId });
        setImportedIds((prev) => ({ ...prev, [item.pid]: data.data.id }));
        setImportingPid(null);
      } else {
        toast.error(data.error || "Import ไม่สำเร็จ", { id: toastId });
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด", { id: toastId });
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">นำเข้าสินค้าจาก CJ</h1>
        </div>

        {/* Price settings — compact popover */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowPriceSettings((v) => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
          >
            ⚙️ ราคา: ×{priceFactor} · {usdToThb}฿/$
          </button>
          {showPriceSettings && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-2xl shadow-lg p-4 w-64 text-sm space-y-3">
              <p className="font-medium text-stone-700 text-xs">⚙️ การคำนวณราคา</p>
              <div className="flex items-center justify-between gap-2">
                <label className="text-stone-500 text-xs">ตัวคูณราคาขาย</label>
                <input type="number" min="1" step="0.1" value={priceFactor}
                  onChange={(e) => setPriceFactor(Number(e.target.value))}
                  className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-stone-500 text-xs">USD/THB</label>
                <input type="number" min="1" step="0.5" value={usdToThb}
                  onChange={(e) => setUsdToThb(Number(e.target.value))}
                  className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="text-stone-500 text-xs">ค่าส่ง CJ ($)</label>
                <input type="number" min="0" step="0.5" value={estShippingUSD}
                  onChange={(e) => setEstShippingUSD(Number(e.target.value))}
                  className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-200" />
              </div>
              <p className="text-stone-400 text-[10px]">ราคาขาย = ต้นทุน × {usdToThb} × {priceFactor}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <div className="flex rounded-xl border border-stone-200 overflow-hidden shrink-0 text-sm">
          <button onClick={() => { setSearchMode("name"); setResults([]); setKeyword(""); }}
            className={`px-3 py-2 font-medium transition-colors ${searchMode === "name" ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}>
            ชื่อสินค้า
          </button>
          <button onClick={() => { setSearchMode("pid"); setResults([]); setKeyword(""); }}
            className={`px-3 py-2 font-medium transition-colors ${searchMode === "pid" ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}>
            PID
          </button>
          <button onClick={() => { setSearchMode("sku"); setResults([]); setKeyword(""); }}
            className={`px-3 py-2 font-medium transition-colors ${searchMode === "sku" ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}>
            SKU
          </button>
        </div>
        <input type="text" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
          placeholder={searchMode === "pid" ? "วาง CJ Product ID เช่น 17392847591..." : searchMode === "sku" ? "วาง variant SKU เช่น CJFT277141401AZ..." : "ค้นหาสินค้า เช่น dog collar, cat food..."}
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 font-mono placeholder:font-sans"
        />
        <button onClick={() => handleSearch(1)} disabled={searching || !keyword.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60">
          {searching ? "กำลังค้นหา..." : "🔍 ค้นหา"}
        </button>
      </div>

      {/* Filters — hidden until CJ API data is confirmed reliable */}
      {false && <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm">
        <span className="text-stone-500 font-medium shrink-0">
          🎯 Filter:
          {activeFilterCount > 0 && (
            <span className="ml-1.5 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
        </span>

        {/* Stock */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterStock} onChange={(e) => setFilterStock(e.target.checked)} className="accent-orange-500" />
          <span className="text-stone-600">📦 stock &gt;</span>
          <input type="number" min="0" step="100" value={minStock}
            onChange={(e) => setMinStock(Number(e.target.value))}
            disabled={!filterStock}
            className="w-16 border border-stone-300 rounded-lg px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-300 disabled:opacity-40" />
        </label>

        <div className="w-px h-4 bg-stone-300 shrink-0" />

        {/* Orders */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterOrders} onChange={(e) => setFilterOrders(e.target.checked)} className="accent-orange-500" />
          <span className="text-stone-600">🛒 orders &gt;</span>
          <input type="number" min="0" step="100" value={minOrders}
            onChange={(e) => setMinOrders(Number(e.target.value))}
            disabled={!filterOrders}
            className="w-16 border border-stone-300 rounded-lg px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-300 disabled:opacity-40" />
        </label>

        <div className="w-px h-4 bg-stone-300 shrink-0" />

        {/* Rating */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterRating} onChange={(e) => setFilterRating(e.target.checked)} className="accent-orange-500" />
          <span className="text-stone-600">⭐ rating &gt;</span>
          <input type="number" min="0" max="5" step="0.1" value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            disabled={!filterRating}
            className="w-14 border border-stone-300 rounded-lg px-2 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-300 disabled:opacity-40" />
        </label>

        <div className="w-px h-4 bg-stone-300 shrink-0" />

        {/* Has Image */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterImage} onChange={(e) => setFilterImage(e.target.checked)} className="accent-orange-500" />
          <span className="text-stone-600">🖼️ มีรูป</span>
        </label>

        {/* Has Video */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={filterVideo} onChange={(e) => setFilterVideo(e.target.checked)} className="accent-orange-500" />
          <span className="text-stone-600">🎬 มีวิดีโอ</span>
        </label>

        {/* Fast Shipping */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filterFastShipping}
            onChange={(e) => {
              setFilterFastShipping(e.target.checked);
              if (e.target.checked && results.length > 0) loadAllInsights(results);
            }}
            className="accent-orange-500"
          />
          <span className="text-stone-600">🚀 ส่งเร็ว ≤</span>
        </label>
        {filterFastShipping && (
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={60}
              value={maxDeliveryDays}
              onChange={(e) => setMaxDeliveryDays(Number(e.target.value))}
              className="w-14 border border-stone-300 rounded-lg px-2 py-0.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
            />
            <span className="text-stone-500 text-xs">วัน</span>
          </div>
        )}
        {filterFastShipping && loadingInsights && (
          <span className="text-[10px] text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full animate-pulse">
            ⏳ {insightProgress.done}/{insightProgress.total}
          </span>
        )}
      </div>}

      {/* Results */}
      {results.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <p className="text-sm text-stone-500">
              พบ {total.toLocaleString()} รายการ
              {activeFilterCount > 0 && (
                filterFastShipping && loadingInsights
                  ? <span className="ml-2 text-blue-600 font-medium animate-pulse">⏳ กำลังโหลดค่าส่ง {insightProgress.done}/{insightProgress.total}...</span>
                  : <span className="ml-2 text-orange-600 font-medium">แสดง {filteredResults.length} รายการ (หลัง filter)</span>
              )}
              {noDataFiltersActive && (
                <span className="ml-2 text-amber-600 text-xs">⚠️ CJ ไม่ส่ง stock/orders/rating ใน search results — filter อาจไม่มีผล</span>
              )}
            </p>
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <button onClick={() => handleSearch(page - 1)} disabled={page <= 1 || searching}
                className="px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40 transition-colors text-xs">←</button>
              <span className="text-xs text-stone-400">หน้า</span>
              <input
                type="number"
                min={1}
                max={Math.ceil(total / 100)}
                defaultValue={page}
                key={page}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = parseInt((e.target as HTMLInputElement).value);
                    const totalPages = Math.ceil(total / 100);
                    if (v >= 1 && v <= totalPages && v !== page) handleSearch(v);
                  }
                }}
                className="w-14 border border-stone-200 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
              />
              <span className="text-xs text-stone-400">/ {Math.ceil(total / 100)}</span>
              <button onClick={() => handleSearch(page + 1)} disabled={page >= Math.ceil(total / 100) || searching}
                className="px-2 py-1 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 disabled:opacity-40 transition-colors text-xs">→</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredResults.map((item) => {
              const imported = importedIds[item.pid];
              const isOpen = importingPid === item.pid;
              const form = importForm[item.pid] ?? { categoryId: categories[0]?.id ?? "", petType: "" };
              const costUSD = Number(item.sellPrice);
              const { sell: sellTHB, cost: costTHB, ship: shipTHB, margin, pct } = calcMargin(costUSD);

              return (
                <div key={item.pid} className={`bg-white rounded-2xl border transition-all overflow-hidden ${isOpen ? "border-orange-300 shadow-md" : "border-stone-100 hover:border-stone-200"}`}>
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-stone-50">
                    {item.productImage ? (
                      <Image src={item.productImage} alt={item.productNameEn} fill sizes="(max-width: 768px) 50vw, 20vw" className="object-contain p-2" unoptimized />
                    ) : (
                      <div className="flex items-center justify-center h-full text-3xl text-stone-300">📦</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-medium text-stone-800 leading-tight line-clamp-2 mb-1">{item.productNameEn}</p>
                    <p className="text-xs text-stone-400 mb-1">{item.categoryName}</p>
                    {/* Stats badges */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {item.inventoryNum != null && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">📦 {item.inventoryNum.toLocaleString()}</span>
                      )}
                      {item.productSales != null && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">🛒 {item.productSales.toLocaleString()}</span>
                      )}
                      {item.productRating != null && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">⭐ {item.productRating.toFixed(1)}</span>
                      )}
                      {item.productVideoSet && item.productVideoSet.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">🎬</span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-300 font-mono mb-1 select-all break-all">{item.pid}</p>
                    <div className="text-[11px] text-stone-400 space-y-0.5 mb-2">
                      {isNaN(costUSD) || costUSD === 0 ? (
                        <p className="text-amber-500 text-[10px]">⚠️ CJ ไม่มีราคา (sellPrice null)</p>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>ต้นทุน</span>
                            <span>${costUSD.toFixed(2)} (฿{costTHB.toLocaleString()})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>ค่าส่ง (ประมาณ)</span>
                            <span>${estShippingUSD.toFixed(2)} (฿{shipTHB.toLocaleString()})</span>
                          </div>
                          <div className="flex justify-between font-medium text-orange-600">
                            <span>ราคาขาย</span>
                            <span>฿{sellTHB.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between font-semibold border-t border-stone-100 pt-0.5 ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                            <span>กำไรประมาณ</span>
                            <span>฿{margin.toLocaleString()} ({pct}%)</span>
                          </div>
                        </>
                      )}
                    </div>

                    {imported ? (
                      <Link href={`/admin/products/${imported}`} className="block text-center text-xs px-3 py-1.5 bg-green-50 text-green-600 border border-green-200 rounded-lg">
                        ✅ นำเข้าแล้ว → แก้ไข
                      </Link>
                    ) : (
                      <div className="flex gap-1.5">
                        <Link
                          href={`/admin/cj-import/${item.pid}`}
                          className="flex-1 text-center text-xs px-2 py-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-stone-700 transition-colors"
                        >
                          🔍 รายละเอียด
                        </Link>
                        <button
                          onClick={() => toggleImportPanel(item.pid)}
                          className={`flex-1 text-xs px-2 py-1.5 rounded-lg border transition-colors ${isOpen ? "bg-orange-500 text-white border-orange-500" : "border-stone-200 text-stone-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"}`}
                        >
                          {isOpen ? "ยกเลิก" : "นำเข้า"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline import panel */}
                  {isOpen && !imported && (
                    <div className="px-3 pb-3 border-t border-orange-100 pt-3 space-y-2">
                      {/* Insight panel */}
                      {(() => {
                        const insight = insights[item.pid];
                        if (insight === "loading") return (
                          <div className="bg-stone-50 rounded-xl p-2 text-[10px] text-stone-400 animate-pulse">กำลังโหลดข้อมูลคลัง + ค่าส่ง...</div>
                        );
                        if (!insight || insight === "error") return null;

                        // Best shipping summary
                        const withDays = insight.shippingOptions.filter((o) => o.deliveryDays !== null);
                        const tracked = withDays.filter((o) => o.hasTracking);
                        const pool = tracked.length > 0 ? tracked : withDays;
                        const best = pool.length > 0
                          ? pool.reduce((a, b) => (a.deliveryDays!.min <= b.deliveryDays!.min ? a : b))
                          : null;

                        return (
                          <div className="bg-stone-50 rounded-xl p-2 space-y-1.5">
                            {insight.isRecommended && (
                              <div className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ✅ น่าเอามาขาย
                                <span className="font-normal text-green-600">
                                  (stock {insight.totalStock.toLocaleString()} · ส่งเร็ว · มี tracking)
                                </span>
                              </div>
                            )}
                            {best && (() => {
                              const flag = best.warehouseType === "US" ? "🇺🇸" : "🇨🇳";
                              const days = best.deliveryDays!.min === best.deliveryDays!.max
                                ? `${best.deliveryDays!.min} วัน`
                                : `${best.deliveryDays!.min}–${best.deliveryDays!.max} วัน`;
                              return (
                                <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1">
                                  <span>{flag}</span>
                                  <span>🚚 {days}</span>
                                  <span className="text-stone-400 font-normal truncate">({best.logisticName})</span>
                                  {best.hasTracking && <span className="text-green-500 text-[10px] shrink-0">📍</span>}
                                </div>
                              );
                            })()}
                            <div className="flex flex-wrap gap-1">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${insight.badges.hasStock ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                                📦 {insight.totalStock.toLocaleString()} ชิ้น
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${insight.badges.hasTracking ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                                📍 tracking
                              </span>
                            </div>
                            {insight.shippingOptions.length > 0 && (
                              <div className="space-y-0.5 pt-0.5 border-t border-stone-200">
                                {insight.shippingOptions.slice(0, 5).map((opt, i) => (
                                  <div key={i} className="flex items-center justify-between text-[10px]">
                                    <div className="flex items-center gap-1 min-w-0">
                                      <span>{opt.warehouseType === "US" ? "🇺🇸" : "🇨🇳"}</span>
                                      <span className="text-stone-600 truncate max-w-25">{opt.logisticName}</span>
                                      {opt.hasTracking && <span className="text-green-500 shrink-0">✓</span>}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0 text-stone-400">
                                      <span>${opt.priceUSD.toFixed(2)}</span>
                                      {opt.deliveryDays && (
                                        <span>{opt.deliveryDays.min === opt.deliveryDays.max ? opt.deliveryDays.min : `${opt.deliveryDays.min}–${opt.deliveryDays.max}`} วัน</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      <div>
                        <label className="block text-xs text-stone-500 mb-1">หมวดหมู่</label>
                        <select value={form.categoryId}
                          onChange={(e) => setImportForm((f) => ({ ...f, [item.pid]: { ...form, categoryId: e.target.value } }))}
                          className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300">
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">ประเภทสัตว์</label>
                        <select value={form.petTypeId}
                          onChange={(e) => setImportForm((f) => ({ ...f, [item.pid]: { ...form, petTypeId: e.target.value } }))}
                          className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300">
                          <option value="">ไม่ระบุ</option>
                          {petTypes.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                        </select>
                      </div>
                      <button onClick={() => handleImport(item)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">
                        ยืนยันนำเข้า (฿{sellTHB.toLocaleString("th-TH")})
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > 20 && (() => {
            const totalPages = Math.ceil(total / 100);
            const delta = 2;
            const pages: (number | "...")[] = [];
            for (let i = 1; i <= totalPages; i++) {
              if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                pages.push(i);
              } else if (pages[pages.length - 1] !== "...") {
                pages.push("...");
              }
            }
            return (
              <div className="flex items-center justify-center gap-1 mt-8">
                <button onClick={() => handleSearch(page - 1)} disabled={page <= 1 || searching}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">←</button>
                {pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-stone-400 text-sm">…</span>
                  ) : (
                    <button key={p} onClick={() => p !== page && handleSearch(p)} disabled={searching}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${p === page ? "bg-orange-500 text-white" : "border border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => handleSearch(page + 1)} disabled={page >= totalPages || searching}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors">→</button>
              </div>
            );
          })()}
        </>
      )}

      {!searching && results.length === 0 && keyword && (
        <div className="text-center py-16 text-stone-400 text-sm">ไม่พบสินค้า ลองค้นหาคำอื่น</div>
      )}
      {!keyword && (
        <div className="text-center py-16 text-stone-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">พิมพ์ชื่อสินค้าแล้วกด Enter หรือ ค้นหา</p>
        </div>
      )}
    </div>
  );
}
