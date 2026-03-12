"use client";

import { useLocale } from "@/context/LocaleContext";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface Candidate {
  id: string;
  shopId: string | null;
  platformSource: string;
  productName: string;
  productImage: string | null;
  category: string | null;
  sourceUrl: string | null;
  salesVolume: string | null;
  trendScore: number | null;
  marketFit: number | null;
  marginPotential: number | null;
  competition: number | null;
  overallScore: number | null;
  aiAnalysis: string | null;
  status: string;
  name_th: string | null;
  description: string | null;
  description_th: string | null;
  suggestedCategory: string | null;
  suggestedPetType: string | null;
  suggestedPrice: number | null;
  nicheKeyword: string | null;
  productId: string | null;
  createdAt: string;
  product?: { id: string; name: string; name_th: string | null; images: string[] } | null;
}

interface Grouped {
  pending: Candidate[];
  scored: Candidate[];
  approved: Candidate[];
  enriched: Candidate[];
  imported: Candidate[];
  rejected: Candidate[];
}

const COLUMNS: { key: keyof Grouped; label: string; color: string; icon: string }[] = [
  { key: "pending", label: "Pending", color: "bg-stone-100 text-stone-600", icon: "⏳" },
  { key: "scored", label: "Scored", color: "bg-blue-100 text-blue-600", icon: "📊" },
  { key: "approved", label: "Approved", color: "bg-green-100 text-green-600", icon: "✅" },
  { key: "enriched", label: "Enriched", color: "bg-purple-100 text-purple-600", icon: "✨" },
  { key: "imported", label: "Imported", color: "bg-orange-100 text-orange-600", icon: "📦" },
];

function ScoreBadge({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  const color = value >= 7 ? "text-green-600" : value >= 4 ? "text-amber-600" : "text-red-500";
  return <span className={`text-[10px] ${color}`}>{label}: <b>{value.toFixed(1)}</b></span>;
}

export default function TrendPipelinePage() {
  const { activeShop } = useShopAdmin();
  const [grouped, setGrouped] = useState<Grouped>({ pending: [], scored: [], approved: [], enriched: [], imported: [], rejected: [] });
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scrapeLog, setScrapeLog] = useState("");
  const [showLog, setShowLog] = useState(false);
  const [scrapeRegion, setScrapeRegion] = useState("TH");
  const [scrapeLang, setScrapeLang] = useState("en");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeShop ? `/api/admin/automation/trend-pipeline?shopId=${activeShop.id}` : "/api/admin/automation/trend-pipeline";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setGrouped(data.grouped);
    } finally {
      setLoading(false);
    }
  }, [activeShop]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleScrape = async () => {
    setScraping(true);
    setScrapeLog("");
    try {
      const res = await fetch("/api/admin/automation/trend-pipeline/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: activeShop?.id, region: scrapeRegion, lang: scrapeLang, limit: 20 }),
      });
      const data = await res.json();
      setScrapeLog(JSON.stringify(data, null, 2));
      if (data.success) {
        toast.success(`Scraped ${data.scraped} products (${data.skipped} skipped)`);
        if (data.error) {
          toast(data.error.slice(0, 100), { icon: "⚠️" });
          setShowLog(true);
        }
        fetchData();
      } else {
        toast.error(data.error || "Scrape failed");
        setShowLog(true);
      }
    } catch { toast.error("Scrape failed"); }
    finally { setScraping(false); }
  };

  const handleScoreAll = async () => {
    const ids = grouped.pending.map((c) => c.id);
    if (ids.length === 0) { toast("No pending candidates"); return; }
    setScoring(true);
    try {
      const res = await fetch("/api/admin/automation/trend-pipeline/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: ids }),
      });
      const data = await res.json();
      if (data.success) {
        const ok = data.results.filter((r: { success: boolean }) => r.success).length;
        toast.success(`Scored ${ok}/${ids.length}`);
        fetchData();
      }
    } catch { toast.error("Score failed"); }
    finally { setScoring(false); }
  };

  const handleApprove = async (action: "approve" | "reject") => {
    const ids = Array.from(selected);
    if (ids.length === 0) { toast("Select candidates first"); return; }
    const res = await fetch("/api/admin/automation/trend-pipeline/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateIds: ids, action }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`${action === "approve" ? "Approved" : "Rejected"} ${data.updated}`);
      setSelected(new Set());
      fetchData();
    }
  };

  const handleEnrichAll = async () => {
    const ids = grouped.approved.map((c) => c.id);
    if (ids.length === 0) { toast("No approved candidates"); return; }
    setEnriching(true);
    try {
      const res = await fetch("/api/admin/automation/trend-pipeline/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: ids, shopId: activeShop?.id }),
      });
      const data = await res.json();
      if (data.success) {
        const ok = data.results.filter((r: { success: boolean }) => r.success).length;
        toast.success(`Enriched ${ok}/${ids.length}`);
        fetchData();
      }
    } catch { toast.error("Enrich failed"); }
    finally { setEnriching(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/automation/trend-pipeline?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">{t("trendPipeline", "adminPages")}</h1>
          <p className="text-sm text-stone-500 mt-1">
            Scrape → Score → Approve → Enrich → Import
            <a href={`https://ads.tiktok.com/business/creativecenter/inspiration/topproducts/pc/${scrapeLang}?region=${scrapeRegion}`} target="_blank" rel="noopener noreferrer"
              className="ml-2 text-pink-400 hover:text-pink-600 text-xs">TikTok Creative Center ↗</a>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={scrapeRegion} onChange={(e) => setScrapeRegion(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 text-stone-600">
            <option value="TH">TH</option>
            <option value="US">US</option>
            <option value="GB">UK</option>
            <option value="ID">ID</option>
            <option value="VN">VN</option>
            <option value="MY">MY</option>
            <option value="PH">PH</option>
          </select>
          <select value={scrapeLang} onChange={(e) => setScrapeLang(e.target.value)}
            className="text-xs border border-stone-200 rounded-lg px-2 py-1.5 text-stone-600">
            <option value="en">EN</option>
            <option value="th">TH</option>
          </select>
          {scrapeLog && (
            <button onClick={() => setShowLog((v) => !v)}
              className="text-[10px] text-stone-400 hover:text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
              {showLog ? "Hide Log" : "Log"}
            </button>
          )}
          <button onClick={handleScrape} disabled={scraping}
            className="bg-pink-500 hover:bg-pink-600 disabled:bg-stone-300 text-white text-sm px-4 py-2 rounded-xl font-medium transition-colors">
            {scraping ? "Scraping..." : "Scrape TikTok"}
          </button>
        </div>
      </div>

      {/* Scrape Log */}
      {showLog && scrapeLog && (
        <pre className="text-[11px] text-stone-500 font-mono bg-stone-50 border border-stone-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto mb-4">
          {scrapeLog}
        </pre>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 mb-4 bg-stone-50 rounded-xl px-4 py-2.5">
        <button onClick={handleScoreAll} disabled={scoring || grouped.pending.length === 0}
          className="text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-stone-300 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          {scoring ? "Scoring..." : `Score All Pending (${grouped.pending.length})`}
        </button>
        <button onClick={() => handleApprove("approve")} disabled={selected.size === 0}
          className="text-xs bg-green-500 hover:bg-green-600 disabled:bg-stone-300 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          Approve ({selected.size})
        </button>
        <button onClick={() => handleApprove("reject")} disabled={selected.size === 0}
          className="text-xs bg-red-400 hover:bg-red-500 disabled:bg-stone-300 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          Reject ({selected.size})
        </button>
        <button onClick={handleEnrichAll} disabled={enriching || grouped.approved.length === 0}
          className="text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-stone-300 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
          {enriching ? "Enriching..." : `Enrich All Approved (${grouped.approved.length})`}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
      ) : (
        /* Pipeline columns */
        <div className="grid grid-cols-5 gap-3">
          {COLUMNS.map(({ key, label, color, icon }) => (
            <div key={key} className="bg-white rounded-2xl border border-stone-200 min-h-[400px] flex flex-col">
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
                </div>
                <span className="text-[10px] text-stone-400">{grouped[key].length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[600px]">
                {grouped[key].length === 0 && (
                  <p className="text-[10px] text-stone-300 text-center py-8">Empty</p>
                )}
                {grouped[key].map((c) => (
                  <div key={c.id}
                    className={`border rounded-xl p-2.5 text-xs transition-colors cursor-pointer ${
                      selected.has(c.id) ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300" : "border-stone-200 hover:border-stone-300"
                    }`}
                    onClick={() => key === "scored" && toggleSelect(c.id)}
                  >
                    {/* Image */}
                    {c.productImage && (
                      <div className="w-full h-20 rounded-lg overflow-hidden bg-stone-100 mb-2">
                        <img src={c.productImage} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Name */}
                    <p className="text-[11px] font-medium text-stone-800 line-clamp-2 leading-snug mb-1">{c.productName}</p>
                    {c.name_th && <p className="text-[10px] text-stone-500 line-clamp-1 mb-1">{c.name_th}</p>}

                    {/* Scores */}
                    {c.overallScore != null && (
                      <div className="space-y-0.5 mb-1.5">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-stone-600">Score: {c.overallScore.toFixed(1)}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-2">
                          <ScoreBadge label="🔥" value={c.trendScore} />
                          <ScoreBadge label="🎯" value={c.marketFit} />
                          <ScoreBadge label="💰" value={c.marginPotential} />
                          <ScoreBadge label="⚔️" value={c.competition} />
                        </div>
                      </div>
                    )}

                    {/* AI Analysis */}
                    {c.aiAnalysis && (
                      <p className="text-[10px] text-stone-400 line-clamp-2 mb-1">{c.aiAnalysis}</p>
                    )}

                    {/* Enriched info */}
                    {c.nicheKeyword && (
                      <span className="text-[10px] font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-500">{c.nicheKeyword}</span>
                    )}
                    {c.suggestedPrice != null && (
                      <span className="text-[10px] text-orange-500 ml-1">฿{c.suggestedPrice.toLocaleString()}</span>
                    )}

                    {/* Linked product */}
                    {c.product && (
                      <a href={`/admin/products/${c.product.id}`}
                        className="block text-[10px] text-green-600 mt-1 hover:underline">
                        → {c.product.name_th || c.product.name}
                      </a>
                    )}

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[9px] text-stone-300">{c.platformSource}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                        className="text-[9px] text-stone-300 hover:text-red-400">×</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
