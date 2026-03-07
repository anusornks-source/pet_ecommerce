"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

interface Product {
  id: string;
  name: string;
  name_th?: string | null;
  price: number;
  images: string[];
  category?: { name: string } | null;
  petType?: { name: string } | null;
}

interface CreativeResult {
  hooks: string[];
  captions: { facebook: string; instagram: string; line: string };
  adAngles: { angle: string; headline: string; body: string }[];
  ugcScript: string;
  thumbnailTexts: string[];
  productName: string;
}

export default function CreativeStudioPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreativeResult | null>(null);
  const [captionTab, setCaptionTab] = useState<"facebook" | "instagram" | "line">("facebook");

  const searchProducts = useCallback(async (q: string) => {
    if (!q.trim()) { setProducts([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/products?search=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      if (data.success) setProducts(data.data ?? data.products ?? []);
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  // Debounced search
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => searchProducts(val), 300));
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    setProducts([]);
    setSearch("");
    setResult(null);
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

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Creative Studio</h1>
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
              placeholder="Search products..."
              className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />

            {/* Search Dropdown */}
            {products.length > 0 && !selectedProduct && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                {products.map((p) => (
                  <button key={p.id} onClick={() => selectProduct(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 text-left transition-colors">
                    {p.images?.[0] && (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                        <Image src={p.images[0]} alt="" fill className="object-cover" unoptimized />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm text-stone-800 truncate">{p.name_th || p.name}</p>
                      <p className="text-[10px] text-stone-400">{p.category?.name} · ฿{p.price?.toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="absolute right-3 top-3.5">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
              </div>
            )}
          </div>

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

          <button
            onClick={handleGenerate}
            disabled={!selectedProduct || loading}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors whitespace-nowrap"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        {/* Selected Product Preview */}
        {selectedProduct && (
          <div className="mt-4 flex items-center gap-3 bg-orange-50 rounded-xl p-3">
            {selectedProduct.images?.[0] && (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                <Image src={selectedProduct.images[0]} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-800 truncate">{selectedProduct.name_th || selectedProduct.name}</p>
              <p className="text-xs text-stone-500">{selectedProduct.category?.name} · ฿{selectedProduct.price?.toLocaleString()}</p>
            </div>
            <button onClick={() => { setSelectedProduct(null); setResult(null); }}
              className="text-stone-400 hover:text-stone-600 text-lg">×</button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 mb-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-4" />
          <p className="text-stone-600 font-medium">Generating creative content...</p>
          <p className="text-xs text-stone-400 mt-1">5 AI calls running in parallel</p>
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4">

          {/* 1. Marketing Hooks */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Marketing Hooks</h2>
              <CopyBtn text={result.hooks.join("\n\n")} />
            </div>
            <div className="space-y-2">
              {result.hooks.map((hook, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <span className="text-xs text-stone-400 mt-0.5 shrink-0">{i + 1}.</span>
                  <p className="text-sm text-stone-700 flex-1">{hook}</p>
                  <button onClick={() => copy(hook)}
                    className="opacity-0 group-hover:opacity-100 text-[10px] text-stone-400 hover:text-orange-500 transition-all shrink-0">
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Social Media Captions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <h2 className="font-bold text-stone-800 text-sm mb-3">Social Media Captions</h2>
            <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-3 w-fit">
              {(["facebook", "instagram", "line"] as const).map((platform) => (
                <button key={platform} onClick={() => setCaptionTab(platform)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${captionTab === platform ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}>
                  {platform === "line" ? "LINE" : platform.charAt(0).toUpperCase() + platform.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans bg-stone-50 rounded-xl p-4">
                {result.captions[captionTab]}
              </pre>
              <div className="absolute top-2 right-2">
                <CopyBtn text={result.captions[captionTab]} />
              </div>
            </div>
          </div>

          {/* 3. Ad Angles */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Ad Angles</h2>
              <CopyBtn text={result.adAngles.map((a) => `[${a.angle}]\n${a.headline}\n${a.body}`).join("\n\n")} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.adAngles.map((angle, i) => (
                <div key={i} className="bg-stone-50 rounded-xl p-4 group relative">
                  <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-1">{angle.angle}</div>
                  <h3 className="text-sm font-bold text-stone-800 mb-1">{angle.headline}</h3>
                  <p className="text-xs text-stone-600">{angle.body}</p>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
              <CopyBtn text={result.ugcScript} />
            </div>
            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans bg-stone-50 rounded-xl p-4 leading-relaxed">
              {result.ugcScript}
            </pre>
          </div>

          {/* 5. Thumbnail Texts */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-stone-800 text-sm">Thumbnail Text</h2>
              <CopyBtn text={result.thumbnailTexts.join("\n")} />
            </div>
            <div className="flex flex-wrap gap-2">
              {result.thumbnailTexts.map((text, i) => (
                <button key={i} onClick={() => copy(text)}
                  className="bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-700 text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                  {text}
                </button>
              ))}
            </div>
          </div>

          {/* Regenerate */}
          <div className="text-center pb-4">
            <button onClick={handleGenerate}
              className="text-sm text-stone-400 hover:text-orange-500 transition-colors">
              Regenerate all
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !result && !selectedProduct && (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm">Select a product to generate marketing content</p>
        </div>
      )}
    </div>
  );
}
