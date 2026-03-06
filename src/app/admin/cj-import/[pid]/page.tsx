"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useShopAdmin } from "@/context/ShopAdminContext";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

interface ShippingOption {
  logisticName: string;
  priceUSD: number;
  deliveryTime: string;
  deliveryDays: { min: number; max: number } | null;
  warehouseCode: string;
  warehouseFlag: string;
  warehouseName: string;
  hasTracking: boolean;
}

interface VariantRow {
  vid: string;
  label: string;
  priceUSD: number;
  stock: number;
  variantImage: string | null;
}

interface ProductDetail {
  pid: string;
  productNameEn: string;
  description: string;
  categoryName: string;
  images: string[];
  variants: VariantRow[];
  totalStock: number;
}

interface FreightData {
  shippingOptions: ShippingOption[];
  bestShipping: ShippingOption | null;
  badges: { hasFastShipping: boolean; hasTracking: boolean };
}

interface Category { id: string; name: string; icon: string | null }
interface PetType { id: string; name: string; icon: string | null }

function daysLabel(opt: ShippingOption) {
  if (!opt.deliveryDays) return opt.deliveryTime || "—";
  const { min, max } = opt.deliveryDays;
  return min === max ? `${min} วัน` : `${min}–${max} วัน`;
}

export default function CJImportDetailPage({ params }: { params: Promise<{ pid: string }> }) {
  const { pid } = use(params);
  const router = useRouter();
  const { activeShop, shops } = useShopAdmin();

  // Selected shop for import
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const selectedShop = shops.find((s) => s.id === selectedShopId) ?? activeShop;

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showDesc, setShowDesc] = useState(false);

  // Freight loaded separately after delay
  const [freight, setFreight] = useState<FreightData | null>(null);
  const [freightLoading, setFreightLoading] = useState(true);
  const [freightError, setFreightError] = useState<string | null>(null);
  const freightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inventory loaded separately (CJ inventory API is slow — 150ms/vid)
  const [stockLoading, setStockLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);

  // Recent CJ logs
  const [logs, setLogs] = useState<{ id: string; action: string; success: boolean; error: string | null; createdAt: string }[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [petTypeId, setPetTypeId] = useState("");
  const [priceFactor, setPriceFactor] = useState(3);
  const [usdToThb, setUsdToThb] = useState(36);
  const [estShippingUSD, setEstShippingUSD] = useState(2);
  const [importing, setImporting] = useState(false);

  const fetchInventory = useCallback((variants: VariantRow[]) => {
    const vids = variants.map((v) => v.vid).filter(Boolean);
    if (vids.length === 0) { setStockLoading(false); return; }
    setStockLoading(true);
    fetch(`/api/admin/cj-products/inventory?vids=${vids.join(",")}`)
      .then((r) => r.json())
      .then((inv) => {
        if (inv.success) {
          setDetail((prev) => {
            if (!prev) return prev;
            const updated = prev.variants.map((v) => ({ ...v, stock: inv.data[v.vid] ?? v.stock }));
            return { ...prev, variants: updated, totalStock: updated.reduce((s, v) => s + v.stock, 0) };
          });
        }
      })
      .finally(() => setStockLoading(false));
  }, []);

  const handleResync = useCallback(async () => {
    if (!detail) return;
    setResyncing(true);
    fetchFreight(detail.variants?.[0]?.vid);
    fetchInventory(detail.variants);
    setResyncing(false);
  }, [detail, fetchFreight, fetchInventory]);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    const res = await fetch("/api/admin/cj-logs?page=1");
    const data = await res.json();
    if (data.success) setLogs(data.data.slice(0, 10));
    setLogsLoading(false);
  }, []);

  const fetchFreight = useCallback((firstVid?: string) => {
    setFreightLoading(true);
    setFreightError(null);
    setFreight(null);
    const params = new URLSearchParams({ pid });
    if (firstVid) params.set("vid", firstVid);
    fetch(`/api/admin/cj-products/freight?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFreight(d.data);
        else setFreightError(d.error || "โหลดข้อมูลการจัดส่งไม่สำเร็จ");
      })
      .catch(() => setFreightError("เชื่อมต่อ API ไม่สำเร็จ"))
      .finally(() => setFreightLoading(false));
  }, [pid]);

  useEffect(() => {
    // 1. Fetch product detail, then freight 1.5s after detail loads (guarantees vid is available)
    fetch(`/api/admin/cj-products/detail?pid=${pid}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setDetail(d.data);
          const firstVid: string | undefined = d.data.variants?.[0]?.vid;
          freightTimerRef.current = setTimeout(() => fetchFreight(firstVid), 1500);

          // Fetch real inventory async (slow: 150ms per vid from CJ)
          const vids: string[] = (d.data.variants ?? []).map((v: VariantRow) => v.vid).filter(Boolean);
          if (vids.length > 0) {
            fetch(`/api/admin/cj-products/inventory?vids=${vids.join(",")}`)
              .then((r) => r.json())
              .then((inv) => {
                if (inv.success) {
                  setDetail((prev) => {
                    if (!prev) return prev;
                    const updated = prev.variants.map((v) => ({
                      ...v,
                      stock: inv.data[v.vid] ?? v.stock,
                    }));
                    const totalStock = updated.reduce((s, v) => s + v.stock, 0);
                    return { ...prev, variants: updated, totalStock };
                  });
                }
              })
              .finally(() => setStockLoading(false));
          } else {
            setStockLoading(false);
          }
        } else {
          setError(d.error);
          setFreightLoading(false);
          setStockLoading(false);
        }
      })
      .catch(() => {
        setError("โหลดข้อมูลไม่สำเร็จ");
        setFreightLoading(false);
        setStockLoading(false);
      })
      .finally(() => setLoading(false));

    fetch("/api/admin/pet-types").then((r) => r.json()).then((d) => { if (d.success) setPetTypes(d.data); });
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      if (d.success) {
        setPriceFactor(d.data.cjPriceFactor ?? 3);
        setUsdToThb(d.data.usdToThb ?? 36);
      }
    });

    return () => {
      if (freightTimerRef.current) clearTimeout(freightTimerRef.current);
    };
  }, [pid, fetchFreight]);

  // Set default shop once activeShop loads
  useEffect(() => {
    if (activeShop && !selectedShopId) setSelectedShopId(activeShop.id);
  }, [activeShop, selectedShopId]);

  // Fetch categories for the selected shop
  useEffect(() => {
    if (!selectedShopId) return;
    setCategoryId("");
    setCategories([]);
    fetch(`/api/admin/shops/${selectedShopId}/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const enabled = d.data.filter((c: { enabled: boolean }) => c.enabled);
          setCategories(enabled.length > 0 ? enabled : d.data);
        }
      });
  }, [selectedShopId]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const handleImport = async () => {
    if (!categoryId) { toast.error("กรุณาเลือกหมวดหมู่"); return; }
    setImporting(true);
    try {
      const best = freight?.bestShipping ?? null;
      const deliveryDays = best?.deliveryDays?.min;
      const warehouseCountry = best?.warehouseCode ?? undefined;
      const fallbackCostUSD = detail?.variants?.[0]?.priceUSD ?? 0;

      const importShopId = selectedShopId || activeShop?.id;
      const res = await fetch(`/api/admin/cj-products${importShopId ? `?shopId=${importShopId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pid,
          categoryId,
          petTypeId: petTypeId || null,
          priceFactor,
          usdToThb,
          fallbackCostUSD,
          ...(deliveryDays !== undefined && { deliveryDays }),
          ...(warehouseCountry && { warehouseCountry }),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`นำเข้า "${data.data.name}" สำเร็จ`);
        router.push(`/admin/products/${data.data.id}`);
      } else {
        toast.error(data.error || "Import ไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-400 text-sm animate-pulse">กำลังโหลดข้อมูลจาก CJ...</div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-16">
        <p className="text-red-500 text-sm">{error || "ไม่พบสินค้า"}</p>
        <Link href="/admin/cj-import" className="mt-4 inline-block text-sm text-orange-500 hover:underline">← กลับ</Link>
      </div>
    );
  }

  const best = freight?.bestShipping ?? null;
  const basePrice = detail.variants[0]?.priceUSD ?? 0;
  const sellPrice = Math.ceil(basePrice * usdToThb * priceFactor);
  const costTHB = Math.ceil(basePrice * usdToThb);
  const shipTHB = Math.ceil(estShippingUSD * usdToThb);
  const margin = sellPrice - costTHB - shipTHB;
  const marginPct = sellPrice > 0 ? Math.round((margin / sellPrice) * 100) : 0;
  const isRecommended = !!(freight?.badges.hasFastShipping && freight?.badges.hasTracking && detail.totalStock > 100);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        <Link href="/admin/cj-import" className="text-stone-400 hover:text-stone-600 transition-colors text-sm">
          ← กลับ
        </Link>
        <span className="text-stone-200">/</span>
        <h1 className="text-lg font-bold text-stone-800 truncate flex-1">{detail.productNameEn}</h1>
        {isRecommended && (
          <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
            ✅ น่าเอามาขาย
            <span className="font-normal ml-1 text-green-600">
              (stock {detail.totalStock.toLocaleString()} · ส่งเร็ว · มี tracking)
            </span>
          </span>
        )}
        {/* Resync + Logs buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResync}
            disabled={resyncing || freightLoading || stockLoading}
            className="text-xs px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            title="ดึงข้อมูล freight + stock ใหม่จาก CJ"
          >
            <span className={resyncing || freightLoading ? "animate-spin inline-block" : ""}>↻</span>
            Resync
          </button>
          <button
            onClick={() => { setShowLogs((v) => !v); if (!showLogs) fetchLogs(); }}
            className="text-xs px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            title="ดู CJ API logs ล่าสุด"
          >
            Logs
          </button>
        </div>
      </div>

      {/* CJ Logs Panel */}
      {showLogs && (
        <div className="mb-5 bg-stone-900 rounded-2xl p-4 text-xs font-mono">
          <div className="flex items-center justify-between mb-3">
            <span className="text-stone-400 font-sans">CJ API Logs (ล่าสุด 10 รายการ)</span>
            <div className="flex gap-2">
              <button onClick={fetchLogs} className="text-stone-400 hover:text-white text-[10px]">↻ Refresh</button>
              <Link href="/admin/cj-logs" className="text-blue-400 hover:text-blue-300 text-[10px]">ดูทั้งหมด →</Link>
            </div>
          </div>
          {logsLoading ? (
            <div className="text-stone-500 animate-pulse">กำลังโหลด...</div>
          ) : logs.length === 0 ? (
            <div className="text-stone-500">ไม่มี log</div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className={`flex items-start gap-2 px-2 py-1.5 rounded-lg ${log.success ? "bg-stone-800" : "bg-red-950"}`}>
                  <span className={`shrink-0 ${log.success ? "text-green-400" : "text-red-400"}`}>{log.success ? "✓" : "✗"}</span>
                  <span className="text-stone-300 flex-1 truncate">{log.action}</span>
                  {log.error && <span className="text-red-400 text-[10px] truncate max-w-48" title={log.error}>{log.error}</span>}
                  <span className="text-stone-600 shrink-0 text-[10px]">{new Date(log.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-50 border border-stone-100">
            {detail.images[selectedImage] ? (
              <Image
                src={detail.images[selectedImage]}
                alt={detail.productNameEn}
                fill
                className="object-contain p-4"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
            ) : (
              <div className="flex items-center justify-center h-full text-5xl text-stone-200">📦</div>
            )}
          </div>

          {detail.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {detail.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`relative w-16 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                    idx === selectedImage ? "border-orange-500 scale-105" : "border-stone-100 hover:border-stone-300"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-contain p-1" sizes="64px" unoptimized />
                </button>
              ))}
            </div>
          )}

          {/* Description collapsible */}
          {detail.description && (
            <div className="border border-stone-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowDesc((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-sm font-medium text-stone-600"
              >
                <span>📄 รายละเอียดจาก CJ (ต้นฉบับ)</span>
                <span className="text-stone-400 text-xs">{showDesc ? "ซ่อน ▲" : "ดู ▼"}</span>
              </button>
              {showDesc && (
                <div
                  className="p-4 text-sm text-stone-600 leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: detail.description }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right: Info + Import */}
        <div className="space-y-4">
          {/* Product info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
            <div>
              <p className="text-xs text-stone-400 font-mono select-all">{detail.pid}</p>
              <p className="text-xs text-stone-500">{detail.categoryName}</p>
            </div>

            {/* ── Key stats grid ── */}
            <div className="grid grid-cols-2 gap-2">
              {/* Stock */}
              <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mb-0.5">📦 สต็อกรวม</p>
                {stockLoading ? (
                  <div className="h-5 w-20 bg-stone-200 rounded animate-pulse" />
                ) : (
                  <p className={`text-sm font-bold ${detail.totalStock > 0 ? "text-stone-800" : "text-stone-400"}`}>
                    {detail.totalStock.toLocaleString()} ชิ้น
                  </p>
                )}
              </div>

              {/* Warehouse */}
              <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mb-0.5">🌍 Warehouse</p>
                {freightLoading ? (
                  <div className="h-5 w-20 bg-stone-200 rounded animate-pulse" />
                ) : freightError ? (
                  <p className="text-xs text-red-400">API Error</p>
                ) : best ? (
                  <p className="text-sm font-bold text-stone-800">{best.warehouseFlag} {best.warehouseName}</p>
                ) : (
                  <p className="text-xs text-stone-400">ไม่มีข้อมูล</p>
                )}
              </div>

              {/* Delivery days */}
              <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mb-0.5">🚚 ระยะเวลาจัดส่ง</p>
                {freightLoading ? (
                  <div className="h-5 w-16 bg-stone-200 rounded animate-pulse" />
                ) : freightError ? (
                  <p className="text-xs text-red-400">API Error</p>
                ) : best ? (
                  <p className="text-sm font-bold text-stone-800">{daysLabel(best)}</p>
                ) : (
                  <p className="text-xs text-stone-400">ไม่มีข้อมูล</p>
                )}
              </div>

              {/* Tracking */}
              <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mb-0.5">📍 Tracking</p>
                {freightLoading ? (
                  <div className="h-5 w-12 bg-stone-200 rounded animate-pulse" />
                ) : freightError ? (
                  <p className="text-xs text-red-400">API Error</p>
                ) : freight ? (
                  <p className={`text-sm font-bold ${freight.badges.hasTracking ? "text-green-600" : "text-stone-400"}`}>
                    {freight.badges.hasTracking ? "✓ มี" : "✗ ไม่มี"}
                  </p>
                ) : (
                  <p className="text-xs text-stone-400">ไม่มีข้อมูล</p>
                )}
              </div>
            </div>

            {/* Freight error + retry */}
            {!freightLoading && freightError && (
              <div className="flex items-center justify-between gap-3 px-3 py-2 bg-red-50 border border-red-100 rounded-xl text-xs text-red-500">
                <span>⚠️ {freightError}</span>
                <button
                  onClick={() => fetchFreight(detail?.variants?.[0]?.vid)}
                  className="shrink-0 px-2 py-1 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors font-medium"
                >
                  ลองใหม่
                </button>
              </div>
            )}

            {/* All shipping options table */}
            {!freightLoading && !freightError && freight && freight.shippingOptions.length > 0 && (
              <div className="border border-stone-100 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[20px_1fr_60px_80px] gap-2 px-3 py-1.5 bg-stone-50 text-[10px] text-stone-400 font-medium">
                  <span></span><span>ขนส่ง</span><span className="text-right">ค่าส่ง</span><span className="text-right">ระยะเวลา</span>
                </div>
                {freight.shippingOptions.map((opt, i) => (
                  <div key={i} className={`grid grid-cols-[20px_1fr_60px_80px] gap-2 px-3 py-1.5 border-t border-stone-50 text-xs items-center ${opt === best ? "bg-green-50" : ""}`}>
                    <span title={opt.warehouseName}>{opt.warehouseFlag}</span>
                    <div className="min-w-0">
                      <span className="text-stone-600 truncate block">{opt.logisticName}</span>
                      {opt.hasTracking && <span className="text-green-500 text-[10px]">📍 tracking</span>}
                    </div>
                    <span className="text-right text-stone-500">${opt.priceUSD.toFixed(2)}</span>
                    <span className="text-right text-stone-500">{daysLabel(opt)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* No shipping options (genuine, not error) */}
            {!freightLoading && !freightError && freight && freight.shippingOptions.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-1">ไม่พบ shipping option CN→TH สำหรับสินค้านี้</p>
            )}
          </div>

          {/* Variants with stock */}
          {detail.variants.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-stone-700">Variants ({detail.variants.length})</p>
                {stockLoading ? (
                  <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
                ) : (
                  <p className="text-xs text-stone-400">
                    {detail.variants.filter((v) => v.stock > 0).length} / {detail.variants.length} มีสต็อก
                  </p>
                )}
              </div>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {detail.variants.map((v) => (
                  <div key={v.vid} className="flex items-center gap-2 text-xs">
                    {v.variantImage && (
                      <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-stone-100">
                        <Image src={v.variantImage} alt={v.label} fill className="object-cover" sizes="32px" unoptimized />
                      </div>
                    )}
                    <span className="flex-1 text-stone-700 font-medium truncate">{v.label}</span>
                    <span className="text-orange-500 font-medium shrink-0">${v.priceUSD.toFixed(2)}</span>
                    {stockLoading ? (
                      <div className="shrink-0 h-4 w-12 bg-stone-200 rounded-full animate-pulse" />
                    ) : (
                      <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${v.stock > 0 ? "bg-green-50 text-green-600 border border-green-100" : "bg-stone-50 text-stone-400 border border-stone-100"}`}>
                        {v.stock > 0 ? `${v.stock.toLocaleString()} ชิ้น` : "หมด"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Import form */}
          <div className="bg-white rounded-2xl border border-orange-100 p-4 space-y-3">
            <p className="text-sm font-bold text-stone-800">นำเข้าสินค้า</p>

            {/* Price settings */}
            <div className="flex flex-wrap gap-3 text-xs text-stone-500 p-3 bg-stone-50 rounded-xl">
              <div className="flex items-center gap-1.5">
                <span>ตัวคูณ</span>
                <input type="number" min="1" step="0.1" value={priceFactor}
                  onChange={(e) => setPriceFactor(Number(e.target.value))}
                  className="w-14 border border-stone-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-orange-200" />
              </div>
              <div className="flex items-center gap-1.5">
                <span>USD/THB</span>
                <input type="number" min="1" step="0.5" value={usdToThb}
                  onChange={(e) => setUsdToThb(Number(e.target.value))}
                  className="w-14 border border-stone-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-orange-200" />
              </div>
              <div className="flex items-center gap-1.5">
                <span>ค่าส่ง $</span>
                <input type="number" min="0" step="0.5" value={estShippingUSD}
                  onChange={(e) => setEstShippingUSD(Number(e.target.value))}
                  className="w-14 border border-stone-200 rounded-lg px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-orange-200" />
              </div>
            </div>

            {/* Price summary */}
            {basePrice > 0 && (
              <div className="text-xs space-y-0.5 text-stone-500">
                <div className="flex justify-between">
                  <span>ต้นทุน</span>
                  <span>${basePrice.toFixed(2)} (฿{costTHB.toLocaleString()})</span>
                </div>
                <div className="flex justify-between">
                  <span>ค่าส่ง (ประมาณ)</span>
                  <span>${estShippingUSD.toFixed(2)} (฿{shipTHB.toLocaleString()})</span>
                </div>
                <div className="flex justify-between font-medium text-orange-600">
                  <span>ราคาขาย</span>
                  <span>฿{sellPrice.toLocaleString()}</span>
                </div>
                <div className={`flex justify-between font-semibold border-t border-stone-100 pt-1 ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                  <span>กำไรประมาณ</span>
                  <span>฿{margin.toLocaleString()} ({marginPct}%)</span>
                </div>
              </div>
            )}

            {/* Shop selector */}
            {shops.length > 1 && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">นำเข้าไปยังร้าน *</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Category */}
            <div>
              <label className="block text-xs text-stone-500 mb-1">หมวดหมู่ * {selectedShop?.name && <span className="text-orange-500">({selectedShop.name})</span>}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{(c as { icon?: string | null }).icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Pet type — only if shop uses petType */}
            {selectedShop?.usePetType !== false && (
              <div>
                <label className="block text-xs text-stone-500 mb-1">ประเภทสัตว์</label>
                <select
                  value={petTypeId}
                  onChange={(e) => setPetTypeId(e.target.value)}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                >
                  <option value="">ไม่ระบุ</option>
                  {petTypes.map((p) => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={importing || !categoryId}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
            >
              {importing ? "กำลัง Import..." : `ยืนยันนำเข้า${basePrice > 0 ? ` (฿${sellPrice.toLocaleString()})` : ""}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
