"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface CJItem {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName: string;
}

interface Category {
  id: string;
  name: string;
  icon: string | null;
}

interface PetType {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export default function CJImportPage() {
  const [keyword, setKeyword] = useState("");
  const [searchMode, setSearchMode] = useState<"name" | "pid">("name");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CJItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importForm, setImportForm] = useState<Record<string, { categoryId: string; petTypeId: string }>>({});
  const [importedIds, setImportedIds] = useState<Record<string, string>>({});

  // Price factor settings
  const [priceFactor, setPriceFactor] = useState(3);
  const [usdToThb, setUsdToThb] = useState(36);
  const [estShippingUSD, setEstShippingUSD] = useState(2.0);

useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((d) => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/pet-types")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPetTypes(d.data); });
  }, []);

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
    try {
      const url = searchMode === "pid"
        ? `/api/admin/cj-products?pid=${encodeURIComponent(keyword.trim())}`
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
  };

  const handleImport = async (item: CJItem) => {
    const form = importForm[item.pid];
    if (!form?.categoryId) { toast.error("กรุณาเลือกหมวดหมู่"); return; }
    const toastId = toast.loading("กำลัง import...");
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">นำเข้าสินค้าจาก CJ</h1>
        <p className="text-stone-500 text-sm mt-1">ค้นหาสินค้าจาก CJDropshipping แล้วนำเข้าสู่ร้านได้เลย</p>
      </div>

      {/* Price factor settings */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-stone-50 border border-stone-200 rounded-2xl text-sm">
        <span className="text-stone-500 font-medium">⚙️ การคำนวณราคา:</span>
        <div className="flex items-center gap-2">
          <label className="text-stone-500">ตัวคูณราคาขาย</label>
          <input
            type="number" min="1" step="0.1" value={priceFactor}
            onChange={(e) => setPriceFactor(Number(e.target.value))}
            className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <span className="text-stone-400">x</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-stone-500">USD/THB</label>
          <input
            type="number" min="1" step="0.5" value={usdToThb}
            onChange={(e) => setUsdToThb(Number(e.target.value))}
            className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-stone-500">ค่าส่ง CJ (ประมาณ)</label>
          <span className="text-stone-400">$</span>
          <input
            type="number" min="0" step="0.5" value={estShippingUSD}
            onChange={(e) => setEstShippingUSD(Number(e.target.value))}
            className="w-16 border border-stone-300 rounded-lg px-2 py-1 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
        </div>
        <span className="text-stone-400 text-xs">ราคาขาย = ต้นทุน × {usdToThb} × {priceFactor} | กำไร = ราคาขาย − ต้นทุน − ค่าส่ง</span>
      </div>

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        {/* Mode toggle */}
        <div className="flex rounded-xl border border-stone-200 overflow-hidden shrink-0 text-sm">
          <button
            onClick={() => { setSearchMode("name"); setResults([]); setKeyword(""); }}
            className={`px-3 py-2 font-medium transition-colors ${searchMode === "name" ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}
          >
            ชื่อสินค้า
          </button>
          <button
            onClick={() => { setSearchMode("pid"); setResults([]); setKeyword(""); }}
            className={`px-3 py-2 font-medium transition-colors ${searchMode === "pid" ? "bg-stone-800 text-white" : "bg-white text-stone-500 hover:bg-stone-50"}`}
          >
            PID
          </button>
        </div>

        <input
          type="text" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(1)}
          placeholder={searchMode === "pid" ? "วาง CJ Product ID เช่น 17392847591..." : "ค้นหาสินค้า เช่น dog collar, cat food..."}
          className="flex-1 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 font-mono placeholder:font-sans"
        />
        <button
          onClick={() => handleSearch(1)}
          disabled={searching || !keyword.trim()}
          className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {searching ? "กำลังค้นหา..." : "🔍 ค้นหา"}
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <>
          <p className="text-sm text-stone-500 mb-3">พบ {total.toLocaleString()} รายการ — หน้า {page}/{Math.ceil(total / 20)}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {results.map((item) => {
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
                      <button
                        onClick={() => toggleImportPanel(item.pid)}
                        className={`w-full text-xs px-3 py-1.5 rounded-lg border transition-colors ${isOpen ? "bg-orange-500 text-white border-orange-500" : "border-stone-200 text-stone-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"}`}
                      >
                        {isOpen ? "ยกเลิก" : "นำเข้า"}
                      </button>
                    )}
                  </div>

                  {/* Import form */}
                  {isOpen && !imported && (
                    <div className="px-3 pb-3 border-t border-orange-100 pt-3 space-y-2">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">หมวดหมู่</label>
                        <select
                          value={form.categoryId}
                          onChange={(e) => setImportForm((f) => ({ ...f, [item.pid]: { ...form, categoryId: e.target.value } }))}
                          className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">ประเภทสัตว์</label>
                        <select
                          value={form.petTypeId}
                          onChange={(e) => setImportForm((f) => ({ ...f, [item.pid]: { ...form, petTypeId: e.target.value } }))}
                          className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                        >
                          <option value="">ไม่ระบุ</option>
                          {petTypes.map((p) => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
                        </select>
                      </div>
                      <button
                        onClick={() => handleImport(item)}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors"
                      >
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
            const totalPages = Math.ceil(total / 20);
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
                <button
                  onClick={() => handleSearch(page - 1)}
                  disabled={page <= 1 || searching}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                >
                  ←
                </button>
                {pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-stone-400 text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => p !== page && handleSearch(p)}
                      disabled={searching}
                      className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                        p === page
                          ? "bg-orange-500 text-white"
                          : "border border-stone-200 text-stone-600 hover:bg-stone-50"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => handleSearch(page + 1)}
                  disabled={page >= totalPages || searching}
                  className="px-3 py-2 rounded-xl border border-stone-200 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 transition-colors"
                >
                  →
                </button>
                <span className="ml-3 text-xs text-stone-400">หน้า {page}/{totalPages} ({total.toLocaleString()} รายการ)</span>
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
