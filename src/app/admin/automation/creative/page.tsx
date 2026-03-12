"use client";

import { useLocale } from "@/context/LocaleContext";
import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

function AutoTextarea({ value, onChange, className, minHeight = 72 }: { value: string; onChange: (v: string) => void; className?: string; minHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minHeight) + "px";
  }, [minHeight]);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      className={className}
      style={{ resize: "none", overflow: "hidden", minHeight }}
      rows={1}
    />
  );
}

const AR_OPTIONS = [
  { label: "1:1 Feed", ar: "1:1" },
  { label: "4:5 Portrait", ar: "4:5" },
  { label: "9:16 Story/TikTok", ar: "9:16" },
] as const;

function VideoConceptCard({ item, onConceptChange }: { item: { angle: string; concept: string }; onConceptChange?: (concept: string) => void }) {
  const [edited, setEdited] = useState(item.concept);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(edited).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="text-[10px] text-pink-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
      <AutoTextarea
        value={edited}
        onChange={(v) => { setEdited(v); onConceptChange?.(v); }}
        className="w-full text-xs text-stone-700 leading-relaxed font-sans bg-white border border-stone-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-pink-300"
        minHeight={72}
      />
      <div className="flex justify-end">
        <button onClick={copy}
          className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "text-stone-400 hover:text-pink-500 hover:bg-pink-50"}`}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ImagePromptCard({ item, productImages, productId, onPromptChange, onSaveSuccess }: {
  item: { angle: string; prompt: string };
  productImages?: string[];
  productId?: string;
  onPromptChange?: (prompt: string) => void;
  onSaveSuccess?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAr, setSelectedAr] = useState<string>("1:1");
  const [error, setError] = useState<string | null>(null);
  const [selectedRefImages, setSelectedRefImages] = useState<string[]>([]);
  const toggleRefImage = (img: string) =>
    setSelectedRefImages((prev) => prev.includes(img) ? prev.filter((x) => x !== img) : [...prev, img]);
  const [editedPrompt, setEditedPrompt] = useState(item.prompt);

  const saveToMarketingAsset = async () => {
    if (!generatedUrl || !productId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing-assets/save-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: generatedUrl, productId, prompt: editedPrompt, angle: item.angle }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกไป Marketing Asset แล้ว");
        onSaveSuccess?.();
      } else {
        toast.error(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const copyWithAr = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const generateImage = async () => {
    setGenerating(true);
    setGeneratedUrl(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editedPrompt, aspectRatio: selectedAr, imageUrls: selectedRefImages }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedUrl(data.url);
      } else {
        setError(data.error ?? "Generation failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="text-[10px] text-purple-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
      <AutoTextarea
        value={editedPrompt}
        onChange={(v) => { setEditedPrompt(v); onPromptChange?.(v); }}
        className="w-full text-xs text-stone-700 leading-relaxed font-mono bg-white border border-stone-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-purple-300"
        minHeight={72}
      />

      {/* Reference image picker for img2img */}
      {productImages && productImages.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-stone-400 mb-1.5">
            Reference images:{" "}
            {selectedRefImages.length > 0
              ? <span className="text-teal-500 font-medium">{selectedRefImages.length} รูป selected ✓</span>
              : <span className="text-stone-300">none — click to use Kontext</span>}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {productImages.slice(0, 8).map((img, i) => (
              <button key={i} type="button"
                onClick={() => toggleRefImage(img)}
                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${selectedRefImages.includes(img) ? "border-teal-400 ring-1 ring-teal-300" : "border-stone-200 hover:border-stone-400"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
                {selectedRefImages.includes(img) && (
                  <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-stone-400 mr-1">Copy --ar:</span>
        {AR_OPTIONS.map(({ label, ar }) => (
          <button key={ar} type="button" onClick={() => copyWithAr(`${editedPrompt} --ar ${ar}`, ar)}
            className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors font-medium ${copied === ar ? "bg-green-100 text-green-600" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
            {copied === ar ? "Copied!" : label}
          </button>
        ))}
        <button type="button" onClick={() => copyWithAr(editedPrompt, "base")}
          className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${copied === "base" ? "bg-green-100 text-green-600" : "bg-stone-200 text-stone-500 hover:bg-stone-300"}`}>
          {copied === "base" ? "Copied!" : "Base"}
        </button>

        {/* Generate button */}
        <div className="ml-auto flex items-center gap-1.5">
          <select value={selectedAr} onChange={(e) => setSelectedAr(e.target.value)}
            className="text-[10px] border border-stone-200 rounded-lg px-1.5 py-1 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-purple-300">
            {AR_OPTIONS.map(({ label, ar }) => (
              <option key={ar} value={ar}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={generateImage} disabled={generating}
            className="text-[10px] px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-stone-300 text-white font-medium transition-colors flex items-center gap-1">
            {generating ? (
              <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : "Generate Image"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}

      {/* Generated image */}
      {generatedUrl && (
        <div className="mt-3 relative">
          <img src={generatedUrl} alt={item.angle} className="w-full rounded-xl object-cover" />
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <a href={generatedUrl} download target="_blank" rel="noopener noreferrer"
              className="text-[10px] bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg transition-colors">
              Download
            </a>
            {productId && (
              <button
                type="button"
                onClick={saveToMarketingAsset}
                disabled={saving}
                className="text-[10px] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                {saving ? "กำลังบันทึก..." : "Save to Marketing Asset"}
              </button>
            )}
          </div>
          <button type="button" onClick={generateImage}
            className="absolute top-2 left-2 text-[10px] bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg transition-colors">
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

interface ProductVariant {
  id: string;
  sku: string | null;
  cjVid: string | null;
  size: string | null;
  color: string | null;
  price: number;
  stock: number;
  variantImage: string | null;
}

interface Product {
  id: string;
  name: string;
  name_th?: string | null;
  price: number;
  normalPrice?: number | null;
  stock: number;
  images: string[];
  description?: string | null;
  description_th?: string | null;
  shortDescription?: string | null;
  shortDescription_th?: string | null;
  source?: string | null;
  active?: boolean;
  featured?: boolean;
  category?: { name: string } | null;
  petType?: { name: string } | null;
  tags?: { id: string; name: string }[];
  variants?: ProductVariant[];
  _count?: { marketingPacks: number };
}

interface CreativeResult {
  hooks: string[];
  captions: { facebook: string; instagram: string; line: string };
  adAngles: { angle: string; headline: string; body: string }[];
  ugcScript: string;
  thumbnailTexts: string[];
  imageAdPrompts: { angle: string; prompt: string }[];
  videoAdPrompts: { angle: string; concept: string }[];
  productName: string;
  _raw?: { hooks: string; captions: string; angles: string; ugc: string; thumbnails: string; imagePrompts: string; videoPrompts: string };
}

export default function CreativeStudioPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreativeResult | null>(null);
const [showRaw, setShowRaw] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
const [editedHooks, setEditedHooks] = useState<string[]>([]);
  const [editedCaptions, setEditedCaptions] = useState<{ facebook: string; instagram: string; line: string }>({ facebook: "", instagram: "", line: "" });
  const [editedAdAngles, setEditedAdAngles] = useState<{ angle: string; headline: string; body: string }[]>([]);
  const [editedUgcScript, setEditedUgcScript] = useState("");
  const [editedThumbnailTexts, setEditedThumbnailTexts] = useState<string[]>([]);
  const [editedImagePrompts, setEditedImagePrompts] = useState<{ angle: string; prompt: string }[]>([]);
  const [editedVideoPrompts, setEditedVideoPrompts] = useState<{ angle: string; concept: string }[]>([]);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchTotal, setSearchTotal] = useState(0);
  const SEARCH_LIMIT = 12;

  useEffect(() => {
    fetch("/api/admin/products?limit=12&sort=newest")
      .then((r) => r.json())
      .then((d) => { if (d.success) setRecentProducts(d.data ?? d.products ?? []); })
      .catch(() => {});
  }, []);

  const searchProducts = useCallback(async (q: string, page = 1) => {
    if (!q.trim()) { setProducts([]); setSearchTotal(0); return; }
    setSearching(true);
    try {
      const offset = (page - 1) * SEARCH_LIMIT;
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&nameOnly=true&limit=${SEARCH_LIMIT}&offset=${offset}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data ?? data.products ?? []);
        setSearchTotal(data.total ?? 0);
        setSearchPage(page);
      }
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  // Debounced search
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => searchProducts(val, 1), 300));
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProducts([]);
    setSearch("");
    setResult(null);
    setActiveImg(null);
  };

  const handleGenerate = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/automation/creative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.id, lang }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
        setEditedHooks(data.data.hooks ?? []);
        setEditedCaptions(data.data.captions ?? { facebook: "", instagram: "", line: "" });
        setEditedAdAngles(data.data.adAngles ?? []);
        setEditedUgcScript(data.data.ugcScript ?? "");
        setEditedThumbnailTexts(data.data.thumbnailTexts ?? []);
        setEditedImagePrompts(data.data.imageAdPrompts ?? []);
        setEditedVideoPrompts(data.data.videoAdPrompts ?? []);
      } else {
        toast.error(data.error || "Generation failed");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  const CopyBtn = ({ text }: { text: string }) => (
    <button onClick={() => copy(text)}
      className="text-[10px] text-stone-400 hover:text-orange-500 transition-colors px-2 py-0.5 rounded-lg hover:bg-orange-50">
      Copy
    </button>
  );

  const RawToggle = ({ section, raw }: { section: string; raw?: string }) => {
    if (!raw) return null;
    const open = showRaw[section];
    return (
      <div>
        <button
          onClick={() => setShowRaw((prev) => ({ ...prev, [section]: !prev[section] }))}
          className="text-[10px] text-stone-400 hover:text-blue-500 transition-colors px-2 py-0.5 rounded-lg hover:bg-blue-50">
          {open ? "Hide raw" : "Raw"}
        </button>
        {open && (
          <pre className="mt-2 text-[11px] text-stone-500 whitespace-pre-wrap font-mono bg-stone-50 border border-stone-100 rounded-xl p-3 leading-relaxed">
            {raw}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("creativeStudio", "adminPages")}</h1>
        <p className="text-sm text-stone-500 mt-1">AI-generated marketing content for your products</p>
      </div>

      {/* Product Selector + Language */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6">
        <div className="flex gap-3 items-start">
          <div className="flex-1 relative">
            <input
              type="text"
              value={selectedProduct ? (selectedProduct.name_th || selectedProduct.name) : search}
              onChange={(e) => {
                if (selectedProduct) {
                  setSelectedProduct(null);
                  setResult(null);
                }
                handleSearchChange(e.target.value);
              }}
              placeholder="ค้นหาด้วยชื่อสินค้า (ไทย/อังกฤษ)"
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />


            {searching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedProduct || loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
          >
            {loading ? "Generating..." : "Generate Marketing Pack"}
          </button>

          {/* Language Toggle */}
          <div className="flex bg-stone-100 rounded-xl p-1">
            <button onClick={() => setLang("th")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${lang === "th" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}>
              TH
            </button>
            <button onClick={() => setLang("en")}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${lang === "en" ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}>
              EN
            </button>
          </div>
        </div>

        {/* Selected Product — Full Detail Card */}
        {selectedProduct && (
          <div className="mt-5 border border-stone-200 rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between px-5 py-3 bg-stone-50 border-b border-stone-100">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Selected Product</span>
              <button onClick={() => { setSelectedProduct(null); setResult(null); setActiveImg(null); }}
                className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
            </div>

            <div className="p-5 flex gap-6">
              {/* Image gallery */}
              {selectedProduct.images?.length > 0 && (
                <div className="shrink-0 flex flex-col gap-2 w-48">
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                    <Image src={activeImg ?? selectedProduct.images[0]} alt="" fill className="object-cover" unoptimized />
                  </div>
                  {selectedProduct.images.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.images.slice(0, 8).map((img, i) => (
                        <button key={i} onClick={() => setActiveImg(img)}
                          className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${(activeImg ?? selectedProduct.images[0]) === img ? "border-orange-400" : "border-transparent"}`}>
                          <Image src={img} alt="" fill className="object-cover" unoptimized />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-3">
                {/* Names */}
                <div>
                  <h2 className="text-base font-bold text-stone-800 leading-snug">
                    {lang === "th" ? (selectedProduct.name_th || selectedProduct.name) : selectedProduct.name}
                  </h2>
                  {lang === "th"
                    ? selectedProduct.name && selectedProduct.name_th && <p className="text-sm text-stone-400 mt-0.5">{selectedProduct.name}</p>
                    : selectedProduct.name_th && <p className="text-sm text-stone-400 mt-0.5">{selectedProduct.name_th}</p>}
                </div>

                {/* Price & stock */}
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <span className="text-lg font-bold text-orange-600">฿{selectedProduct.price?.toLocaleString()}</span>
                    {selectedProduct.normalPrice && selectedProduct.normalPrice > selectedProduct.price && (
                      <span className="ml-2 text-sm text-stone-400 line-through">฿{selectedProduct.normalPrice.toLocaleString()}</span>
                    )}
                  </div>
                  <span className="text-xs text-stone-400 border border-stone-200 rounded-lg px-2 py-0.5">
                    Stock: {selectedProduct.stock ?? 0}
                  </span>
                  {selectedProduct.active === false && (
                    <span className="text-xs bg-red-100 text-red-500 rounded-lg px-2 py-0.5">Inactive</span>
                  )}
                  {selectedProduct.featured && (
                    <span className="text-xs bg-amber-100 text-amber-600 rounded-lg px-2 py-0.5">Featured</span>
                  )}
                  {selectedProduct.source === "CJ" && (
                    <span className="text-xs bg-blue-100 text-blue-600 rounded-lg px-2 py-0.5">CJ</span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap gap-2 text-xs text-stone-500">
                  {selectedProduct.category && (
                    <span className="bg-stone-100 rounded-lg px-2.5 py-1">{selectedProduct.category.name}</span>
                  )}
                  {selectedProduct.petType && (
                    <span className="bg-stone-100 rounded-lg px-2.5 py-1">{selectedProduct.petType.name}</span>
                  )}
                  {selectedProduct.tags?.map((t) => (
                    <span key={t.id} className="bg-orange-50 text-orange-500 rounded-lg px-2.5 py-1">{t.name}</span>
                  ))}
                </div>

                {/* Short desc */}
                {(() => {
                  const sd = lang === "th"
                    ? (selectedProduct.shortDescription_th || selectedProduct.shortDescription)
                    : (selectedProduct.shortDescription || selectedProduct.shortDescription_th);
                  return sd ? (
                    <div className="text-sm text-stone-600 bg-stone-50 rounded-xl px-4 py-3">{sd}</div>
                  ) : null;
                })()}

                {/* Description */}
                {(() => {
                  const desc = lang === "th"
                    ? (selectedProduct.description_th || selectedProduct.description)
                    : (selectedProduct.description || selectedProduct.description_th);
                  return desc ? (
                    <div className="text-xs text-stone-500 leading-relaxed max-h-28 overflow-y-auto bg-stone-50 rounded-xl px-4 py-3">
                      <p className="font-semibold text-stone-600 mb-1 text-[11px] uppercase tracking-wide">Description</p>
                      <p dangerouslySetInnerHTML={{ __html: desc }} />
                    </div>
                  ) : null;
                })()}

                {/* Variants */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Variants ({selectedProduct.variants.length})</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProduct.variants.slice(0, 12).map((v) => {
                        const label = [v.size, v.color].filter(Boolean).join(" / ") || v.sku || v.id.slice(0, 6);
                        const isActive = v.variantImage && activeImg === v.variantImage;
                        return v.variantImage ? (
                          <button key={v.id} onClick={() => setActiveImg(v.variantImage!)}
                            className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${isActive ? "bg-orange-100 text-orange-600 ring-1 ring-orange-400" : "bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-500"}`}>
                            {label} <span className={isActive ? "text-orange-400" : "text-stone-400"}>฿{v.price?.toLocaleString()} · {v.stock}</span>
                          </button>
                        ) : (
                          <span key={v.id} className="text-[11px] bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg">
                            {label} <span className="text-stone-400">฿{v.price?.toLocaleString()} · {v.stock}</span>
                          </span>
                        );
                      })}
                      {selectedProduct.variants.length > 12 && (
                        <span className="text-[11px] text-stone-400 px-2 py-1">+{selectedProduct.variants.length - 12} more</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Product ID */}
                <p className="text-[11px] text-stone-300 font-mono">ID: {selectedProduct.id}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 mb-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-4" />
          <p className="text-stone-600 font-medium">Generating creative content...</p>
          <p className="text-xs text-stone-400 mt-1">7 AI calls running in parallel</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">

          {/* Pack label */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-bold text-orange-500 uppercase tracking-widest">Marketing Pack</span>
            <span className="text-xs text-stone-400">— {result.productName}</span>
          </div>

          {/* 1. Marketing Hooks */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Marketing Hooks</h2>
              <div className="flex items-center gap-1">
                <RawToggle section="hooks" raw={result._raw?.hooks} />
                <CopyBtn text={editedHooks.join("\n\n")} />
              </div>
            </div>
            <div className="space-y-2">
              {editedHooks.map((hook, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs text-stone-400 mt-2.5 shrink-0">{i + 1}.</span>
                  <AutoTextarea
                    value={hook}
                    onChange={(v) => setEditedHooks((prev) => prev.map((h, idx) => idx === i ? v : h))}
                    className="flex-1 text-sm text-stone-700 bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-300"
                    minHeight={72}
                  />
                  <button onClick={() => copy(hook)} className="text-[10px] text-stone-400 hover:text-orange-500 shrink-0 mt-2.5">Copy</button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Social Media Captions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-stone-800 text-sm">Social Media Captions</h2>
              <div className="flex items-center gap-1">
                <RawToggle section="captions" raw={result._raw?.captions} />
                <CopyBtn text={[editedCaptions.facebook, editedCaptions.instagram, editedCaptions.line].filter(Boolean).join("\n\n---\n\n")} />
              </div>
            </div>
            <div className="space-y-4">
              {editedCaptions.facebook && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">Facebook</span>
                    <CopyBtn text={editedCaptions.facebook} />
                  </div>
                  <AutoTextarea value={editedCaptions.facebook} onChange={(v) => setEditedCaptions((prev) => ({ ...prev, facebook: v }))}
                    className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-300 leading-relaxed"
                    minHeight={72} />
                </div>
              )}
              {editedCaptions.instagram && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">Instagram</span>
                    <CopyBtn text={editedCaptions.instagram} />
                  </div>
                  <AutoTextarea value={editedCaptions.instagram} onChange={(v) => setEditedCaptions((prev) => ({ ...prev, instagram: v }))}
                    className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-300 leading-relaxed"
                    minHeight={72} />
                </div>
              )}
              {editedCaptions.line && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">LINE</span>
                    <CopyBtn text={editedCaptions.line} />
                  </div>
                  <AutoTextarea value={editedCaptions.line} onChange={(v) => setEditedCaptions((prev) => ({ ...prev, line: v }))}
                    className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-300 leading-relaxed"
                    minHeight={72} />
                </div>
              )}
            </div>
          </div>

          {/* 3. Ad Angles */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Ad Angles</h2>
              <div className="flex items-center gap-1">
                <RawToggle section="angles" raw={result._raw?.angles} />
                <CopyBtn text={editedAdAngles.map((a) => `[${a.angle}]\n${a.headline}\n${a.body}`).join("\n\n")} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editedAdAngles.map((angle, i) => (
                <div key={i} className="bg-stone-50 rounded-xl p-4 space-y-1.5">
                  <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">{angle.angle}</div>
                  <input
                    value={angle.headline}
                    onChange={(e) => setEditedAdAngles((prev) => prev.map((a, idx) => idx === i ? { ...a, headline: e.target.value } : a))}
                    className="w-full text-sm font-bold text-stone-800 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                  />
                  <AutoTextarea
                    value={angle.body}
                    onChange={(v) => setEditedAdAngles((prev) => prev.map((a, idx) => idx === i ? { ...a, body: v } : a))}
                    className="w-full text-xs text-stone-600 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                    minHeight={72}
                  />
                  <div className="flex justify-end">
                    <CopyBtn text={`${angle.headline}\n${angle.body}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. UGC Video Script */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">UGC Video Script</h2>
              <CopyBtn text={editedUgcScript} />
            </div>
            <AutoTextarea
              value={editedUgcScript}
              onChange={setEditedUgcScript}
              className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-300 leading-relaxed"
              minHeight={72}
            />
          </div>

          {/* 5. Thumbnail Texts */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Thumbnail Text</h2>
              <div className="flex items-center gap-1">
                <RawToggle section="thumbnails" raw={result._raw?.thumbnails} />
                <CopyBtn text={editedThumbnailTexts.join("\n")} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {editedThumbnailTexts.map((text, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={text}
                    onChange={(e) => setEditedThumbnailTexts((prev) => prev.map((t, idx) => idx === i ? e.target.value : t))}
                    className="text-sm text-stone-700 bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white px-4 py-2 rounded-xl font-medium focus:outline-none transition-colors"
                  />
                  <button onClick={() => copy(text)} className="text-[10px] text-stone-400 hover:text-orange-500 px-1.5">Copy</button>
                </div>
              ))}
            </div>
          </div>

          {/* 6. Image Ad Prompts */}
          {result.imageAdPrompts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-stone-800 text-sm">Image Ad Prompts</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">ใช้กับ Midjourney / DALL-E / Flux</p>
                </div>
                <div className="flex items-center gap-1">
                  <RawToggle section="imagePrompts" raw={result._raw?.imagePrompts} />
                  <CopyBtn text={editedImagePrompts.map((p) => `[${p.angle}]\n${p.prompt}`).join("\n\n")} />
                </div>
              </div>
              <div className="space-y-3">
                {result.imageAdPrompts.map((item, i) => (
                  <ImagePromptCard
                    key={i}
                    item={item}
                    productImages={selectedProduct?.images ?? []}
                    productId={selectedProduct?.id}
                    onPromptChange={(prompt) => setEditedImagePrompts((prev) => prev.map((p, idx) => idx === i ? { ...p, prompt } : p))}
                  />
                ))}
              </div>
              <p className="text-[11px] text-stone-400 mt-3 bg-stone-50 rounded-xl px-4 py-2.5">
                💡 Prompt เป็นภาษาอังกฤษเสมอ เนื่องจาก Midjourney / DALL-E / Flux ทำงานกับ English prompt ได้ดีกว่า Thai มาก — คุณภาพรูปที่ได้จะสูงกว่าอย่างชัดเจน
              </p>
            </div>
          )}

          {/* 7. Video Ad Prompts */}
          {result.videoAdPrompts?.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-stone-800 text-sm">Short Video Ad Concepts</h2>
                  <p className="text-[11px] text-stone-400 mt-0.5">ใช้กับ Sora / Runway / TikTok / Reels</p>
                </div>
                <div className="flex items-center gap-1">
                  <RawToggle section="videoPrompts" raw={result._raw?.videoPrompts} />
                  <CopyBtn text={editedVideoPrompts.map((p) => `[${p.angle}]\n${p.concept}`).join("\n\n")} />
                </div>
              </div>
              <div className="space-y-3">
                {result.videoAdPrompts.map((item, i) => (
                  <VideoConceptCard key={i} item={item}
                    onConceptChange={(concept) => setEditedVideoPrompts((prev) => prev.map((p, idx) => idx === i ? { ...p, concept } : p))} />
                ))}
              </div>
              <p className="text-[11px] text-stone-400 mt-3 bg-stone-50 rounded-xl px-4 py-2.5">
                💡 Concept เป็นภาษาอังกฤษเสมอ เนื่องจาก Sora / Runway / Kling ทำงานกับ English prompt ได้ดีกว่า Thai มาก — วิดีโอที่ได้จะมีคุณภาพสูงกว่าอย่างชัดเจน
              </p>
            </div>
          )}

          {/* Platform Ready */}
          <PlatformReadySection
            productName={lang === "th" ? (selectedProduct?.name_th || selectedProduct?.name || result.productName) : (selectedProduct?.name || result.productName)}
            hooks={editedHooks}
            captionFacebook={editedCaptions.facebook}
            captionInstagram={editedCaptions.instagram}
            captionLine={editedCaptions.line}
            adAngles={editedAdAngles}
          />

          {/* Copy All + Regenerate */}
          <div className="flex items-center justify-center gap-4 pb-4">
            <button
              onClick={() => {
                const p = selectedProduct;
                const productInfo = [
                  `# ${result.productName}`,
                  p?.name_th && p.name_th !== result.productName ? `(${p.name_th})` : "",
                  ``,
                  `**ราคา:** ฿${p?.price?.toLocaleString() ?? "-"}`,
                  p?.category ? `**หมวดหมู่:** ${p.category.name}` : "",
                  p?.petType ? `**ประเภทสัตว์:** ${p.petType.name}` : "",
                  p?.shortDescription ? `**Short Desc (EN):** ${p.shortDescription}` : "",
                  p?.shortDescription_th ? `**Short Desc (TH):** ${p.shortDescription_th}` : "",
                  p ? `**Product ID:** ${p.id}` : "",
                ].filter(Boolean).join("\n");

                const all = [
                  productInfo,
                  ``,
                  `---`,
                  ``,
                  `## Marketing Hooks`,
                  editedHooks.map((h, i) => `${i + 1}. ${h}`).join("\n"),
                  ``,
                  `## Social Media Captions`,
                  `### Facebook\n${editedCaptions.facebook}`,
                  ``,
                  `### Instagram\n${editedCaptions.instagram}`,
                  ``,
                  `### LINE\n${editedCaptions.line}`,
                  ``,
                  `## Ad Angles`,
                  editedAdAngles.map((a) => `### ${a.angle}\n**${a.headline}**\n${a.body}`).join("\n\n"),
                  ``,
                  `## UGC Video Script`,
                  editedUgcScript,
                  ``,
                  `## Thumbnail Text`,
                  editedThumbnailTexts.map((t, i) => `${i + 1}. ${t}`).join("\n"),
                  ``,
                  editedImagePrompts.length > 0 ? `## Image Ad Prompts\n${editedImagePrompts.map((p) => `### ${p.angle}\n${p.prompt}`).join("\n\n")}` : "",
                  ``,
                  editedVideoPrompts.length > 0 ? `## Short Video Ad Concepts\n${editedVideoPrompts.map((p) => `### ${p.angle}\n${p.concept}`).join("\n\n")}` : "",
                  ``,
                  `---`,
                  ``,
                  `## Platform Ready`,
                  `### Shopee\n${[lang === "th" ? (selectedProduct?.name_th || selectedProduct?.name || result.productName) : (selectedProduct?.name || result.productName), "", ...editedHooks.slice(0, 3).map((h) => `✅ ${h}`), "", editedCaptions.facebook || editedAdAngles[0]?.body || "", "", "📦 จัดส่งรวดเร็ว | ✅ สินค้าคุณภาพ | 💬 ติดต่อได้เลย"].join("\n").trim()}`,
                  ``,
                  `### TikTok Shop\n${[editedHooks[0] ? `${editedHooks[0]} ⬅ ดูต่อเลย!` : "", "", editedCaptions.instagram, "", "#tiktokshop #สัตว์เลี้ยง #petshop #ของดี"].join("\n").trim()}`,
                  ``,
                  `### Facebook\n${[editedCaptions.facebook, "", "👇 กดสั่งซื้อ หรือทักมาถามได้เลย!"].join("\n").trim()}`,
                  ``,
                  `### LINE\n${[editedCaptions.line, "", "📞 ทักมาสั่งได้เลยนะคะ/ครับ 😊"].join("\n").trim()}`,
                ].filter((l) => l !== undefined).join("\n");
                copy(all);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 py-2 rounded-xl font-medium transition-colors"
            >
              Copy All
            </button>
            <button
              disabled={saving}
              onClick={async () => {
                if (!selectedProduct) return;
                setSaving(true);
                try {
                  const res = await fetch("/api/admin/automation/marketing-packs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      productId: selectedProduct.id,
                      lang,
                      productName: result.productName,
                      hooks: editedHooks,
                      captionFacebook: editedCaptions.facebook,
                      captionInstagram: editedCaptions.instagram,
                      captionLine: editedCaptions.line,
                      adAngles: editedAdAngles,
                      ugcScript: editedUgcScript,
                      thumbnailTexts: editedThumbnailTexts,
                      imageAdPrompts: editedImagePrompts,
                      videoAdPrompts: editedVideoPrompts,
                      _raw: result._raw,
                    }),
                  });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("บันทึก Marketing Pack แล้ว");
                  } else {
                    toast.error(data.error ?? "บันทึกไม่สำเร็จ");
                  }
                } catch {
                  toast.error("บันทึกไม่สำเร็จ");
                } finally {
                  setSaving(false);
                }
              }}
              className="bg-teal-500 hover:bg-teal-600 disabled:bg-stone-300 text-white text-sm px-5 py-2 rounded-xl font-medium transition-colors"
            >
              {saving ? "Saving..." : "Add to Marketing Pack"}
            </button>
            <button onClick={handleGenerate}
              className="text-sm text-stone-400 hover:text-orange-500 transition-colors">
              Regenerate all
            </button>
          </div>

        </div>
      )}

      {/* Product Grid — recent or search results */}
      {!loading && !result && !selectedProduct && (
        <div>
          {searching && (
            <p className="text-xs text-stone-400 mb-3 px-1">กำลังค้นหา...</p>
          )}
          {!searching && (
            <p className="text-xs text-stone-400 font-medium mb-3 px-1">
              {search.trim() ? `ผลการค้นหา "${search}" — กดเพื่อเลือก` : "สินค้าล่าสุด — กดเพื่อเลือก"}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(search.trim() ? products : recentProducts).map((p) => (
              <button
                key={p.id}
                onClick={() => selectProduct(p)}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden text-left hover:border-orange-300 hover:shadow-md transition-all group"
              >
                <div className="relative w-full aspect-square bg-stone-100 overflow-hidden">
                  {p.images[0] ? (
                    <Image src={p.images[0]} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-stone-300">🐾</div>
                  )}
                  {p._count && p._count.marketingPacks > 0 && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      🎯 {p._count.marketingPacks}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs font-medium text-stone-800 line-clamp-2 leading-snug mb-1">{p.name_th || p.name}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-orange-500 font-semibold">฿{p.price.toLocaleString()}</p>
                    {p._count?.marketingPacks === 0 && (
                      <span className="text-[10px] text-stone-300">ยังไม่มี pack</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {!searching && search.trim() && products.length === 0 && (
            <div className="text-center py-12 text-stone-400">
              <p className="text-sm">ไม่พบสินค้า "{search}"</p>
            </div>
          )}
          {/* Pagination for search results */}
          {search.trim() && searchTotal > SEARCH_LIMIT && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => searchProducts(search, searchPage - 1)}
                disabled={searchPage <= 1}
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 disabled:opacity-30 hover:bg-stone-50 transition-colors"
              >
                ← ก่อนหน้า
              </button>
              <span className="text-xs text-stone-400">หน้า {searchPage} / {Math.ceil(searchTotal / SEARCH_LIMIT)}</span>
              <button
                onClick={() => searchProducts(search, searchPage + 1)}
                disabled={searchPage >= Math.ceil(searchTotal / SEARCH_LIMIT)}
                className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 disabled:opacity-30 hover:bg-stone-50 transition-colors"
              >
                ถัดไป →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlatformReadySection({
  productName, hooks, captionFacebook, captionInstagram, captionLine, adAngles,
}: {
  productName: string;
  hooks: string[];
  captionFacebook: string;
  captionInstagram: string;
  captionLine: string;
  adAngles: { angle: string; headline: string; body: string }[];
}) {
  const platforms = [
    { key: "shopee", label: "Shopee", icon: "🛒", content: [productName, "", ...hooks.slice(0, 3).map((h) => `✅ ${h}`), "", captionFacebook || adAngles[0]?.body || "", "", "📦 จัดส่งรวดเร็ว | ✅ สินค้าคุณภาพ | 💬 ติดต่อได้เลย"].join("\n").trim() },
    { key: "tiktok", label: "TikTok Shop", icon: "🎵", content: [hooks[0] ? `${hooks[0]} ⬅ ดูต่อเลย!` : "", "", captionInstagram, "", "#tiktokshop #สัตว์เลี้ยง #petshop #ของดี"].join("\n").trim() },
    { key: "facebook", label: "Facebook", icon: "📘", content: [captionFacebook, "", "👇 กดสั่งซื้อ หรือทักมาถามได้เลย!"].join("\n").trim() },
    { key: "line", label: "LINE", icon: "💬", content: [captionLine, "", "📞 ทักมาสั่งได้เลยนะคะ/ครับ 😊"].join("\n").trim() },
  ];
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="mb-4">
        <h2 className="font-bold text-stone-800 text-sm">Platform Ready</h2>
        <p className="text-[11px] text-stone-400 mt-0.5">Content ที่ format สำหรับแต่ละแพลตฟอร์ม — แก้ไขได้ก่อน copy</p>
      </div>
      <div className="space-y-4">{platforms.map((p) => <PlatformCard key={p.key} label={p.label} icon={p.icon} initialContent={p.content} />)}</div>
    </div>
  );
}

function PlatformCard({ label, icon, initialContent }: { label: string; icon: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => { const el = ref.current; if (!el) return; el.style.height = "auto"; el.style.height = Math.max(el.scrollHeight, 72) + "px"; }, []);
  useEffect(() => { resize(); }, [content, resize]);
  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2"><span className="text-base">{icon}</span><span className="text-xs font-semibold text-stone-700">{label}</span></div>
        <button onClick={() => { navigator.clipboard.writeText(content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
          className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "text-stone-400 hover:text-orange-500 hover:bg-orange-50"}`}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <textarea ref={ref} value={content} onChange={(e) => { setContent(e.target.value); resize(); }}
        className="w-full text-sm text-stone-700 leading-relaxed font-sans bg-white border border-stone-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-300"
        style={{ resize: "none", overflow: "hidden", minHeight: 72 }} rows={1} />
    </div>
  );
}
