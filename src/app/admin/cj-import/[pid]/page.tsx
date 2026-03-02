"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showDesc, setShowDesc] = useState(false);

  // Freight loaded separately after delay
  const [freight, setFreight] = useState<FreightData | null>(null);
  const [freightLoading, setFreightLoading] = useState(true);

  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [petTypeId, setPetTypeId] = useState("");
  const [priceFactor, setPriceFactor] = useState(3);
  const [usdToThb, setUsdToThb] = useState(36);
  const [estShippingUSD, setEstShippingUSD] = useState(2);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    // 1. Fetch product detail immediately
    fetch(`/api/admin/cj-products/detail?pid=${pid}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setDetail(d.data); else setError(d.error); })
      .catch(() => setError("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));

    // 2. Fetch freight after 3s delay (avoids CJ rate limit from prior calls)
    const freightTimer = setTimeout(() => {
      fetch(`/api/admin/cj-products/freight?pid=${pid}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setFreight(d.data); })
        .catch(() => { /* swallow — freight is optional */ })
        .finally(() => setFreightLoading(false));
    }, 3000);

    fetch("/api/admin/categories").then((r) => r.json()).then((d) => { if (d.success) setCategories(d.data); });
    fetch("/api/admin/pet-types").then((r) => r.json()).then((d) => { if (d.success) setPetTypes(d.data); });
    fetch("/api/admin/settings").then((r) => r.json()).then((d) => {
      if (d.success) {
        setPriceFactor(d.data.cjPriceFactor ?? 3);
        setUsdToThb(d.data.usdToThb ?? 36);
      }
    });

    return () => clearTimeout(freightTimer);
  }, [pid]);

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

      const res = await fetch("/api/admin/cj-products", {
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
  const isRecommended = (freight?.badges.hasFastShipping && freight?.badges.hasTracking && detail.totalStock > 100) ?? false;

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <Link href="/admin/cj-import" className="text-stone-400 hover:text-stone-600 transition-colors text-sm">
          ← กลับ
        </Link>
        <span className="text-stone-200">/</span>
        <h1 className="text-lg font-bold text-stone-800 truncate">{detail.productNameEn}</h1>
        {isRecommended && (
          <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full">
            ✅ น่าเอามาขาย
          </span>
        )}
      </div>

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
                  className="p-4 text-sm text-stone-600 leading-relaxed max-h-64 overflow-y-auto [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_p]:mb-2"
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

            {/* Shipping insight — loads after 3s */}
            {freightLoading ? (
              <div className="px-3 py-2 rounded-xl text-sm bg-stone-50 text-stone-400 animate-pulse">
                กำลังโหลดข้อมูลการจัดส่ง...
              </div>
            ) : best ? (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border ${
                isRecommended
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-stone-50 border-stone-200 text-stone-700"
              }`}>
                <span>{best.warehouseFlag}</span>
                <span className="text-stone-500 font-normal text-xs">{best.warehouseName}</span>
                <span>🚚 {daysLabel(best)}</span>
                <span className="text-stone-400 font-normal text-xs truncate">({best.logisticName})</span>
                {best.hasTracking && <span className="text-green-500 text-xs shrink-0">📍</span>}
              </div>
            ) : (
              <div className="px-3 py-2 rounded-xl text-sm bg-stone-50 text-stone-400">ไม่มีข้อมูลการจัดส่ง CN→TH</div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${detail.totalStock > 100 ? "bg-green-50 text-green-700 border-green-200" : "bg-stone-50 text-stone-400 border-stone-200"}`}>
                📦 สต็อก {detail.totalStock.toLocaleString()} ชิ้น
              </span>
              {!freightLoading && (
                <>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${freight?.badges.hasFastShipping ? "bg-green-50 text-green-700 border-green-200" : "bg-stone-50 text-stone-400 border-stone-200"}`}>
                    🚢 ส่งเร็ว &lt;10 วัน
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${freight?.badges.hasTracking ? "bg-green-50 text-green-700 border-green-200" : "bg-stone-50 text-stone-400 border-stone-200"}`}>
                    📍 มี tracking
                  </span>
                </>
              )}
            </div>

            {/* All shipping options */}
            {!freightLoading && freight && freight.shippingOptions.length > 0 && (
              <div className="border border-stone-100 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[20px_1fr_60px_80px] gap-2 px-3 py-1.5 bg-stone-50 text-[10px] text-stone-400 font-medium">
                  <span></span><span>ขนส่ง</span><span className="text-right">ค่าส่ง</span><span className="text-right">ระยะเวลา</span>
                </div>
                {freight.shippingOptions.map((opt, i) => (
                  <div key={i} className="grid grid-cols-[20px_1fr_60px_80px] gap-2 px-3 py-1.5 border-t border-stone-50 text-xs items-center">
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
          </div>

          {/* Variants */}
          {detail.variants.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <p className="text-sm font-medium text-stone-700 mb-2">Variants ({detail.variants.length})</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {detail.variants.map((v) => (
                  <div key={v.vid} className="flex items-center gap-2 text-xs">
                    {v.variantImage && (
                      <div className="relative w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-stone-100">
                        <Image src={v.variantImage} alt={v.label} fill className="object-cover" sizes="32px" unoptimized />
                      </div>
                    )}
                    <span className="flex-1 text-stone-700 font-medium">{v.label}</span>
                    <span className="text-orange-500 font-medium">${v.priceUSD.toFixed(2)}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${v.stock > 0 ? "bg-green-50 text-green-600" : "bg-stone-50 text-stone-400"}`}>
                      {v.stock.toLocaleString()} ชิ้น
                    </span>
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

            {/* Category */}
            <div>
              <label className="block text-xs text-stone-500 mb-1">หมวดหมู่ *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200 bg-white"
              >
                <option value="">— เลือกหมวดหมู่ —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            {/* Pet type */}
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
