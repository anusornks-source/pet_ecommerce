"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface LogEntry {
  time: string;
  step: string;
  status: "ok" | "error" | "info";
  detail: string;
  durationMs?: number;
}

interface TrendKeyword {
  keyword: string;
  source: string;
  volume?: number | null;
  trending?: boolean;
}

interface CJProduct {
  pid: string;
  productNameEn: string;
  productImage: string;
  sellPrice: number;
  categoryName?: string;
  inventoryNum?: number;
  productSales?: number;
}

interface Category { id: string; name: string; icon: string | null }
interface PetType { id: string; name: string; slug: string; icon: string | null }

type TrendSource = "google" | "cj" | "tiktok" | "ai";
type AIModel = "claude" | "gpt";

const SOURCE_OPTIONS: { id: TrendSource; label: string; icon: string }[] = [
  { id: "tiktok", label: "TikTok", icon: "🎵" },
  { id: "cj", label: "CJ Bestsellers", icon: "🏆" },
  { id: "google", label: "Google Trends", icon: "📊" },
  { id: "ai", label: "AI Web Search", icon: "🧠" },
];

const STEPS = ["Scanning trend sources...", "Collecting trending keywords..."];

const SOURCE_COLORS: Record<string, string> = {
  "Google Trends (Top)": "bg-blue-50 text-blue-600",
  "Google Trends (Rising)": "bg-blue-100 text-blue-700",
  "Google Trends (Daily)": "bg-blue-50 text-blue-600",
  "CJ Bestseller": "bg-amber-50 text-amber-600",
  "TikTok Trending": "bg-pink-50 text-pink-600",
  "TikTok Products": "bg-pink-50 text-pink-600",
  "AI (Claude)": "bg-purple-50 text-purple-600",
  "AI (GPT)": "bg-green-50 text-green-600",
  "AI Fallback": "bg-stone-50 text-stone-500",
};

export default function ProductResearchPage() {
  const { activeShop, shops } = useShopAdmin();
  const [selectedShopId, setSelectedShopId] = useState("");
  useEffect(() => { if (activeShop && !selectedShopId) setSelectedShopId(activeShop.id); }, [activeShop, selectedShopId]);

  const searchParams = useSearchParams();
  const [niche, setNiche] = useState(searchParams.get("niche") || "");
  const [loading, setLoading] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [keywords, setKeywords] = useState<TrendKeyword[]>([]);
  const [sourceResults, setSourceResults] = useState<Record<string, TrendKeyword[]>>({});

  // Source & model selection
  const [selectedSources, setSelectedSources] = useState<Set<TrendSource>>(new Set(["tiktok", "cj", "google", "ai"]));
  const [aiModel, setAiModel] = useState<AIModel>("claude");

  // Logs & stats
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [researchTime, setResearchTime] = useState(0);

  // Niche ideation
  const [suggestions, setSuggestions] = useState<{ niche: string; niche_th?: string; type: string; reason: string; reason_th?: string }[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  // CJ Search (box 3)
  const [cjQuery, setCjQuery] = useState("");
  const [cjProducts, setCjProducts] = useState<CJProduct[]>([]);
  const [cjLoading, setCjLoading] = useState(false);
  const [cjTotal, setCjTotal] = useState(0);

  // Import
  const [priceFactor, setPriceFactor] = useState(3);
  const [usdToThb, setUsdToThb] = useState(36);
  const [categories, setCategories] = useState<Category[]>([]);
  const [petTypes, setPetTypes] = useState<PetType[]>([]);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importForm, setImportForm] = useState<Record<string, { categoryId: string; petTypeId: string }>>({});
  const [importedIds, setImportedIds] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedShopId) return;
    fetch(`/api/admin/shops/${selectedShopId}/categories`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const enabled = d.data.filter((c: { enabled: boolean }) => c.enabled);
          setCategories(enabled.length > 0 ? enabled : d.data);
        }
      });
  }, [selectedShopId]);

  const toggleSource = (src: TrendSource) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) { if (next.size > 1) next.delete(src); }
      else next.add(src);
      return next;
    });
  };

  // ─── Ideation ─────────────────────────────────────────────────

  const handleSuggestNiches = async () => {
    setSuggestLoading(true);
    setSuggestError("");
    setSuggestions([]);
    try {
      const res = await fetch("/api/admin/automation/suggest-niches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: selectedShopId || activeShop?.id, aiModel }),
      });
      const data = await res.json();
      if (data.success) setSuggestions(data.data);
      else { setSuggestError(data.error || "Failed"); toast.error(data.error || "Failed"); }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setSuggestError(msg); toast.error(msg);
    } finally { setSuggestLoading(false); }
  };

  // ─── Trend Research ───────────────────────────────────────────

  const handleResearch = async () => {
    if (!niche.trim() || selectedSources.size === 0) return;
    const t0 = Date.now();
    setLoading(true);
    setResearchTime(0);
    setStepIdx(0);
    setKeywords([]);
    setSourceResults({});
    setLogs([]);

    const interval = setInterval(() => {
      setStepIdx((prev) => (prev < STEPS.length - 1 ? prev + 1 : prev));
    }, 3500);

    if (petTypes.length === 0) {
      fetch("/api/admin/pet-types").then((r) => r.json()).then((d) => { if (d.success) setPetTypes(d.data); });
    }

    try {
      const res = await fetch("/api/admin/automation/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche: niche.trim(), sources: Array.from(selectedSources), aiModel }),
      });
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
      if (data.success) {
        setKeywords(data.data.keywords ?? []);
        setSourceResults(data.data.sourceResults ?? {});
        if (data.data.logs) setLogs(data.data.logs);
      } else {
        toast.error(data.error || "Research failed");
        setShowLogs(true);
      }
    } catch { toast.error("Error"); }
    finally { clearInterval(interval); setLoading(false); setResearchTime(Date.now() - t0); }
  };

  // ─── CJ Product Search ───────────────────────────────────────

  const handleCJSearch = async () => {
    const kws = cjQuery.split(",").map((s) => s.trim()).filter(Boolean);
    if (kws.length === 0) return;
    setCjLoading(true);
    setCjProducts([]);
    setCjTotal(0);
    const allProducts: CJProduct[] = [];
    const seenPids = new Set<string>();
    let totalCount = 0;
    for (const kw of kws) {
      try {
        const res = await fetch(`/api/admin/cj-products?keyword=${encodeURIComponent(kw)}&page=1`);
        const data = await res.json();
        if (data.success) {
          const list = (data.data?.list ?? data.products ?? []) as CJProduct[];
          for (const p of list) {
            if (!seenPids.has(p.pid)) { seenPids.add(p.pid); allProducts.push(p); }
          }
          totalCount += data.data?.total ?? data.total ?? 0;
        }
      } catch { /* skip failed keyword */ }
      if (kws.length > 1) await new Promise((r) => setTimeout(r, 300));
    }
    setCjProducts(allProducts);
    setCjTotal(totalCount);
    setCjLoading(false);
  };

  const handleKeywordClick = (kw: string) => {
    setCjQuery((prev) => {
      const existing = prev.split(",").map((s) => s.trim()).filter(Boolean);
      if (existing.includes(kw)) return prev;
      return existing.length > 0 ? `${prev}, ${kw}` : kw;
    });
  };

  // ─── Import ───────────────────────────────────────────────────

  const handleImport = async (product: CJProduct) => {
    const form = importForm[product.pid];
    if (!form?.categoryId) { toast.error("Select a category"); return; }
    const toastId = toast.loading("Importing...");
    try {
      const shopId = selectedShopId || activeShop?.id;
      const res = await fetch(`/api/admin/cj-products${shopId ? `?shopId=${shopId}` : ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pid: product.pid,
          categoryId: form.categoryId,
          petTypeId: form.petTypeId || null,
          priceFactor,
          usdToThb,
          fallbackCostUSD: product.sellPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Imported "${data.data.name}"`, { id: toastId });
        setImportedIds((prev) => ({ ...prev, [product.pid]: data.data.id }));
        setImportingPid(null);
      } else { toast.error(data.error || "Import failed", { id: toastId }); }
    } catch { toast.error("Import error", { id: toastId }); }
  };

  // ─── Helpers ──────────────────────────────────────────────────

  const getSourceColor = (source: string) => {
    for (const [key, color] of Object.entries(SOURCE_COLORS)) {
      if (source.includes(key) || source === key) return color;
    }
    return "bg-stone-50 text-stone-500";
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Product Research</h1>
          <p className="text-sm text-stone-500 mt-1">Ideation → Trend Research → CJ Product Search</p>
        </div>
        {shops.length > 1 && (
          <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-300">
            {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* ═══════════════ BOX 1: Ideation ═══════════════ */}
      <div className="bg-white rounded-2xl border border-purple-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-purple-700">1. Niche Ideation</h2>
            <p className="text-[11px] text-stone-400 mt-0.5">AI analyzes your shop data to suggest niche ideas</p>
          </div>
          <div className="flex items-center gap-2">
            {suggestions.length > 0 && (
              <>
                <button onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/automation/niche-keywords", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ keywords: suggestions }),
                    });
                    const data = await res.json();
                    if (data.success) toast.success(`Saved ${data.data.saved} keywords (${data.data.skipped} skipped)`);
                    else toast.error(data.error || "Save failed");
                  } catch { toast.error("Save failed"); }
                }} className="text-[11px] text-purple-500 hover:text-purple-700 border border-purple-200 px-2.5 py-1.5 rounded-lg transition-colors">
                  Save to Bank
                </button>
                <button onClick={() => {
                  const text = suggestions.map((s) => `[${s.type}] ${s.niche} (${s.niche_th ?? ""}) — ${s.reason_th || s.reason}`).join("\n");
                  navigator.clipboard.writeText(text); toast.success("Copied!");
                }} className="text-[11px] text-stone-400 hover:text-stone-600 border border-stone-200 px-2.5 py-1.5 rounded-lg transition-colors">
                  Copy All
                </button>
              </>
            )}
            <button onClick={handleSuggestNiches} disabled={suggestLoading}
              className="border border-purple-200 bg-purple-50 hover:bg-purple-100 disabled:bg-stone-100 disabled:border-stone-200 text-purple-600 disabled:text-stone-400 px-4 py-1.5 rounded-lg font-medium text-xs transition-colors whitespace-nowrap">
              {suggestLoading ? "Thinking..." : suggestions.length > 0 ? "Regenerate" : "Generate Ideas"}
            </button>
          </div>
        </div>

        {suggestLoading && (
          <div className="flex items-center gap-2 py-6 justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
            <span className="text-xs text-purple-400">Analyzing shop data...</span>
          </div>
        )}

        {!suggestLoading && suggestions.length > 0 && (
          <div className="space-y-3">
            {["trending", "gap", "seasonal", "upsell"].map((type) => {
              const items = suggestions.filter((s) => s.type === type);
              if (items.length === 0) return null;
              const cfgMap: Record<string, { label: string; color: string }> = {
                trending: { label: "Trending", color: "bg-pink-100 text-pink-600" },
                gap: { label: "Gaps", color: "bg-blue-100 text-blue-600" },
                seasonal: { label: "Seasonal", color: "bg-amber-100 text-amber-600" },
                upsell: { label: "Upsell", color: "bg-green-100 text-green-600" },
              };
              const cfg = cfgMap[type] ?? { label: type, color: "bg-stone-100 text-stone-600" };
              return (
                <div key={type}>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {items.map((s, i) => (
                      <span key={i} className="inline-flex items-center bg-stone-50 border border-stone-200 rounded-lg overflow-hidden text-left text-xs text-stone-700">
                        <button onClick={() => setNiche((prev) => {
                            const existing = prev.split(",").map((x) => x.trim()).filter(Boolean);
                            if (existing.includes(s.niche)) return prev;
                            return existing.length > 0 ? `${prev}, ${s.niche}` : s.niche;
                          })}
                          className="px-3 py-1.5 hover:bg-purple-50 transition-colors font-medium"
                          title={`Add "${s.niche}"`}>
                          {s.niche}
                        </button>
                        {s.niche_th && (
                          <button onClick={() => setNiche((prev) => {
                              const val = s.niche_th!;
                              const existing = prev.split(",").map((x) => x.trim()).filter(Boolean);
                              if (existing.includes(val)) return prev;
                              return existing.length > 0 ? `${prev}, ${val}` : val;
                            })}
                            className="px-3 py-1.5 text-stone-400 hover:bg-orange-50 hover:text-orange-600 border-l border-stone-200 transition-colors"
                            title={`Add "${s.niche_th}"`}>
                            {s.niche_th}
                          </button>
                        )}
                        {(s.reason_th || s.reason) && (
                          <span className="text-[10px] text-stone-400 pr-3 py-1.5 border-l border-stone-100 pl-2">— {s.reason_th || s.reason}</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!suggestLoading && suggestError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
            <p className="font-medium mb-1">Error</p>
            <p className="text-red-500">{suggestError}</p>
          </div>
        )}

        {!suggestLoading && !suggestError && suggestions.length === 0 && (
          <p className="text-xs text-stone-400 text-center py-3">Click &quot;Generate Ideas&quot; to get AI-powered niche suggestions</p>
        )}
      </div>

      {/* ═══════════════ BOX 2: Trend Research ═══════════════ */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
        <h2 className="text-sm font-bold text-stone-700 mb-3">2. Trend Research</h2>
        <div className="flex gap-3">
          <input type="text" value={niche} onChange={(e) => setNiche(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && handleResearch()}
            placeholder='Enter a niche e.g. "dog toys", "cat grooming tools"'
            className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <button onClick={handleResearch} disabled={loading || !niche.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors whitespace-nowrap">
            {loading ? "Researching..." : "Research"}
          </button>
        </div>

        {/* Trend Sources */}
        <div className="mt-4">
          <p className="text-xs text-stone-500 mb-2 font-medium">Trend Sources</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((src) => (
              <button key={src.id} onClick={() => toggleSource(src.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  selectedSources.has(src.id) ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-white border-stone-200 text-stone-400 hover:border-stone-300"
                }`}>
                <span>{src.icon}</span><span>{src.label}</span>
                {selectedSources.has(src.id) && <span className="text-orange-400 ml-0.5">&#10003;</span>}
              </button>
            ))}
          </div>
        </div>

        {/* AI Model */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-stone-500">AI Model:</span>
          <div className="flex bg-stone-100 rounded-lg p-0.5">
            <button onClick={() => setAiModel("claude")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${aiModel === "claude" ? "bg-white text-purple-600 shadow-sm" : "text-stone-500"}`}>Claude</button>
            <button onClick={() => setAiModel("gpt")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${aiModel === "gpt" ? "bg-white text-green-600 shadow-sm" : "text-stone-500"}`}>GPT</button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8 mb-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-4" />
          <p className="text-stone-600 font-medium">{STEPS[stepIdx]}</p>
          <p className="text-xs text-stone-400 mt-1">
            Sources: {Array.from(selectedSources).map((s) => SOURCE_OPTIONS.find((o) => o.id === s)?.label).join(", ")}
            {" · "}Model: {aiModel === "gpt" ? "GPT-4o mini" : "Claude Haiku"}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= stepIdx ? "bg-orange-400" : "bg-stone-200"}`} />
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      {!loading && researchTime > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 px-1">
          {(() => {
            const srcCount = Object.keys(sourceResults).length;
            const srcOk = Object.values(sourceResults).filter((v) => v.length > 0).length;
            const errCount = logs.filter((l) => l.status === "error").length;
            return (
              <>
                <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-stone-400">Sources</span>
                  <span className="text-xs font-bold text-stone-700">{srcOk}/{srcCount}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-stone-400">Keywords</span>
                  <span className="text-xs font-bold text-stone-700">{keywords.length}</span>
                </div>
                {errCount > 0 && (
                  <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-red-400">Errors</span>
                    <span className="text-xs font-bold text-red-600">{errCount}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-xl px-3 py-2">
                  <span className="text-xs text-stone-400">Time</span>
                  <span className="text-xs font-bold text-stone-700">{(researchTime / 1000).toFixed(1)}s</span>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Source Results Summary */}
      {!loading && Object.keys(sourceResults).length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
          <p className="text-xs text-stone-500 font-medium mb-2">Source Results</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(sourceResults).map(([key, kws]) => {
              const srcOpt = SOURCE_OPTIONS.find((o) => o.id === key);
              return (
                <div key={key} className="bg-stone-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{srcOpt?.icon ?? "📌"}</span>
                    <span className="text-xs font-medium text-stone-700">{srcOpt?.label ?? key}</span>
                    <span className="text-[10px] text-stone-400 ml-auto">{kws.length} keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {kws.slice(0, 3).map((k, i) => (
                      <span key={i} className="text-[10px] bg-white text-stone-500 px-1.5 py-0.5 rounded truncate max-w-36">
                        {k.keyword}
                        {k.volume != null && k.volume > 0 && <span className="text-stone-400 ml-0.5">({k.volume.toLocaleString()})</span>}
                      </span>
                    ))}
                    {kws.length > 3 && <span className="text-[10px] text-stone-400">+{kws.length - 3}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keywords (clickable → sends to CJ search) */}
      {keywords.length > 0 && !loading && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5">
            <span className="text-xs text-stone-400 self-center mr-1">Keywords ({keywords.length}) — click to search CJ:</span>
            {keywords.map((tk, i) => (
              <button key={i} onClick={() => handleKeywordClick(tk.keyword)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 cursor-pointer hover:ring-2 hover:ring-orange-300 transition-all ${getSourceColor(tk.source)} ${cjQuery.split(",").map((s) => s.trim()).includes(tk.keyword) ? "ring-2 ring-orange-400" : ""}`}>
                {tk.keyword}
                {tk.volume != null && tk.volume > 0 && <span className="opacity-60 text-[9px]">({tk.volume.toLocaleString()})</span>}
                {tk.trending && <span className="text-[9px]">&#9650;</span>}
              </button>
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {[
              { bg: "bg-blue-500", label: "Google Trends" },
              { bg: "bg-amber-500", label: "CJ Bestseller" },
              { bg: "bg-pink-500", label: "TikTok" },
              { bg: "bg-purple-500", label: "AI (Claude)" },
              { bg: "bg-green-500", label: "AI (GPT)" },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5 text-[10px] text-stone-500">
                <span className={`w-2 h-2 rounded-full ${l.bg}`} />{l.label}
              </span>
            ))}
            <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
              <span className="text-orange-500 text-[9px]">&#9650;</span> Trending
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════ BOX 3: CJ Product Search ═══════════════ */}
      <div className="bg-white rounded-2xl border border-orange-100 p-5 mb-4">
        <h2 className="text-sm font-bold text-orange-700 mb-3">3. CJ Product Search</h2>
        <div className="flex gap-3">
          <input type="text" value={cjQuery} onChange={(e) => setCjQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !cjLoading && handleCJSearch()}
            placeholder="Type keyword or click a keyword above..."
            className="flex-1 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
          <button onClick={handleCJSearch} disabled={cjLoading || !cjQuery.trim()}
            className="bg-orange-500 hover:bg-orange-600 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors whitespace-nowrap">
            {cjLoading ? "Searching..." : "Search CJ"}
          </button>
        </div>

        {/* Pricing settings */}
        <div className="flex gap-4 mt-3">
          <label className="text-xs text-stone-500 flex items-center gap-1">
            Price factor
            <input type="number" value={priceFactor} onChange={(e) => setPriceFactor(Number(e.target.value))} step={0.5} min={1}
              className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-xs" />
          </label>
          <label className="text-xs text-stone-500 flex items-center gap-1">
            USD/THB
            <input type="number" value={usdToThb} onChange={(e) => setUsdToThb(Number(e.target.value))} step={1} min={1}
              className="w-16 border border-stone-200 rounded-lg px-2 py-1 text-xs" />
          </label>
        </div>

        {/* CJ Loading */}
        {cjLoading && (
          <div className="flex items-center gap-2 py-8 justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-3 border-orange-500 border-t-transparent" />
            <span className="text-sm text-stone-500">Searching CJ Dropshipping...</span>
          </div>
        )}

        {/* CJ Results Grid */}
        {!cjLoading && cjProducts.length > 0 && (
          <>
            <p className="text-xs text-stone-400 mt-4 mb-3">{cjTotal.toLocaleString()} products found</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {cjProducts.map((p) => {
                const cost = Number(p.sellPrice) || 0;
                const costTHB = Math.ceil(cost * usdToThb);
                const sellTHB = Math.ceil(cost * usdToThb * priceFactor);
                const marginTHB = sellTHB - costTHB;
                const marginPct = costTHB > 0 ? Math.round((marginTHB / sellTHB) * 100) : 0;
                const imported = importedIds[p.pid];

                return (
                  <div key={p.pid} className="bg-white rounded-xl border border-stone-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative aspect-square bg-stone-100">
                      {p.productImage ? (
                        <Image src={p.productImage} alt={p.productNameEn} fill className="object-contain" unoptimized />
                      ) : (
                        <div className="flex items-center justify-center h-full text-3xl text-stone-300">📦</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <h3 className="text-xs font-medium text-stone-800 line-clamp-2 mb-2">{p.productNameEn}</h3>

                      {/* Price breakdown */}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] mb-2">
                        <div className="text-stone-400">Cost</div>
                        <div className="text-right font-medium">${cost.toFixed(2)}</div>
                        <div className="text-stone-400">Sell</div>
                        <div className="text-right font-medium text-orange-600">฿{sellTHB.toLocaleString()}</div>
                        <div className="text-stone-400">Margin</div>
                        <div className={`text-right font-bold ${marginPct >= 50 ? "text-green-600" : marginPct >= 30 ? "text-yellow-600" : "text-red-600"}`}>
                          ฿{marginTHB.toLocaleString()} ({marginPct}%)
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex gap-1.5 text-[10px] mb-2 flex-wrap">
                        {p.inventoryNum != null && (
                          <span className={`px-1.5 py-0.5 rounded-full ${Number(p.inventoryNum) > 100 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                            Stock: {Number(p.inventoryNum).toLocaleString()}
                          </span>
                        )}
                        {p.productSales != null && Number(p.productSales) > 0 && (
                          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Sales: {Number(p.productSales).toLocaleString()}</span>
                        )}
                      </div>

                      {/* PID */}
                      <p className="text-[9px] text-stone-300 font-mono mb-2 select-all">{p.pid}</p>

                      {/* Import */}
                      {imported ? (
                        <Link href={`/admin/products/${imported}`}
                          className="block text-center bg-green-50 text-green-600 text-xs py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors">
                          Imported — View
                        </Link>
                      ) : importingPid === p.pid ? (
                        <div className="space-y-1.5">
                          <select value={importForm[p.pid]?.categoryId || ""}
                            onChange={(e) => setImportForm((f) => ({ ...f, [p.pid]: { ...f[p.pid], categoryId: e.target.value, petTypeId: f[p.pid]?.petTypeId || "" } }))}
                            className="w-full border border-stone-200 rounded-lg px-2 py-1 text-xs">
                            <option value="">-- Category --</option>
                            {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>)}
                          </select>
                          <select value={importForm[p.pid]?.petTypeId || ""}
                            onChange={(e) => setImportForm((f) => ({ ...f, [p.pid]: { ...f[p.pid], petTypeId: e.target.value } }))}
                            className="w-full border border-stone-200 rounded-lg px-2 py-1 text-xs">
                            <option value="">-- Pet Type --</option>
                            {petTypes.map((pt) => <option key={pt.id} value={pt.id}>{pt.icon} {pt.name}</option>)}
                          </select>
                          <div className="flex gap-1.5">
                            <button onClick={() => handleImport(p)}
                              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-xs py-1.5 rounded-lg font-medium transition-colors">Import</button>
                            <button onClick={() => setImportingPid(null)}
                              className="px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs py-1.5 rounded-lg transition-colors">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <button onClick={() => setImportingPid(p.pid)}
                            className="flex-1 bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-600 text-xs py-1.5 rounded-lg font-medium transition-colors">
                            Import Draft
                          </button>
                          <Link href={`/admin/cj-import/${p.pid}`} target="_blank" rel="noopener noreferrer"
                            className="px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-500 text-xs py-1.5 rounded-lg transition-colors flex items-center">
                            Detail ↗
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* CJ Empty */}
        {!cjLoading && cjProducts.length === 0 && !cjQuery && (
          <div className="text-center py-8 text-stone-400">
            <p className="text-sm">Click a keyword above or type your own to search CJ</p>
          </div>
        )}
        {!cjLoading && cjProducts.length === 0 && cjQuery && cjTotal === 0 && (
          <div className="text-center py-8 text-stone-400">
            <p className="text-sm">No CJ products found for &quot;{cjQuery}&quot;</p>
          </div>
        )}
      </div>

      {/* Empty State (no research yet) */}
      {!loading && keywords.length === 0 && cjProducts.length === 0 && (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-3">🔬</div>
          <p className="text-sm">Start with Ideation or enter a niche in Trend Research</p>
        </div>
      )}

      {/* Log Viewer */}
      {logs.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-2 text-xs font-medium transition-colors ${
              logs.some((l) => l.status === "error") ? "text-red-500 hover:text-red-600" : "text-stone-400 hover:text-stone-600"
            }`}>
            <span>{showLogs ? "▾" : "▸"}</span>
            <span>Logs ({logs.length})</span>
            {logs.some((l) => l.status === "error") && (
              <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {logs.filter((l) => l.status === "error").length} errors
              </span>
            )}
          </button>

          {showLogs && (
            <div className="mt-2 bg-stone-900 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-stone-700">
                <span className="text-[10px] text-stone-400 font-mono">Research Pipeline Log</span>
                <button onClick={() => {
                  navigator.clipboard.writeText(logs.map((l) => `[${l.time}] [${l.status.toUpperCase()}] ${l.step}: ${l.detail}${l.durationMs ? ` (${l.durationMs}ms)` : ""}`).join("\n"));
                  toast.success("Logs copied!");
                }} className="text-[10px] text-stone-500 hover:text-stone-300 transition-colors">Copy</button>
              </div>
              <div className="max-h-72 overflow-y-auto p-3 space-y-0.5 font-mono text-[11px]">
                {logs.map((entry, i) => (
                  <div key={i} className="flex gap-2 leading-relaxed">
                    <span className="text-stone-600 shrink-0">{entry.time}</span>
                    <span className={`shrink-0 w-3 text-center ${entry.status === "ok" ? "text-green-400" : entry.status === "error" ? "text-red-400" : "text-blue-400"}`}>
                      {entry.status === "ok" ? "✓" : entry.status === "error" ? "✗" : "·"}
                    </span>
                    <span className="text-amber-400 shrink-0 min-w-22.5">{entry.step}</span>
                    <span className={entry.status === "error" ? "text-red-300" : "text-stone-400"}>{entry.detail}</span>
                    {entry.durationMs != null && <span className="text-stone-600 shrink-0 ml-auto">{entry.durationMs}ms</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
