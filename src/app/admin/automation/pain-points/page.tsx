"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface NicheKeywordRef {
  id: string;
  niche: string;
  niche_th: string | null;
  type: string;
}

interface PainPointBank {
  id: string;
  shopId: string | null;
  category: string;
  painPoint: string;
  painPoint_th: string | null;
  severity: string;
  productOpportunity: string;
  nicheKeyword: string;
  shopCanSolve: boolean;
  createdAt: string;
  nicheKeywords: NicheKeywordRef[];
  createdBy: { name: string } | null;
}

const SEVERITY_CFG: Record<string, { label: string; color: string }> = {
  high: { label: "สูง", color: "bg-red-100 text-red-600" },
  medium: { label: "กลาง", color: "bg-amber-100 text-amber-600" },
  low: { label: "ต่ำ", color: "bg-green-100 text-green-600" },
};

export default function PainPointBankPage() {
  const { activeShop } = useShopAdmin();
  const router = useRouter();
  const [items, setItems] = useState<PainPointBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterSolve, setFilterSolve] = useState<"" | "yes" | "no">("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = activeShop
        ? `/api/admin/automation/pain-points/bank?shopId=${activeShop.id}`
        : "/api/admin/automation/pain-points/bank";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  }, [activeShop]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm("ลบ Pain Point นี้?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/automation/pain-points/bank?id=${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success("ลบแล้ว");
    } finally {
      setDeleting(null);
    }
  };

  const categories = Array.from(new Set(items.map((p) => p.category))).sort();

  const filtered = items.filter((p) => {
    if (filterCat && p.category !== filterCat) return false;
    if (filterSeverity && p.severity !== filterSeverity) return false;
    if (filterSolve === "yes" && !p.shopCanSolve) return false;
    if (filterSolve === "no" && p.shopCanSolve) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.painPoint.toLowerCase().includes(q) ||
        (p.painPoint_th ?? "").toLowerCase().includes(q) ||
        p.nicheKeyword.toLowerCase().includes(q) ||
        p.productOpportunity.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = Array.from(new Set(filtered.map((p) => p.category))).map((cat) => ({
    category: cat,
    items: filtered.filter((p) => p.category === cat),
  }));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Pain Point Bank</h1>
          <p className="text-sm text-stone-500 mt-1">{items.length} pain points</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/admin/automation/research")}
            className="text-sm bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
          >
            + Explore Pain Points
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหา pain point, keyword..."
          className="flex-1 min-w-[200px] border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        {categories.length > 1 && (
          <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 text-stone-600">
            <option value="">ทุกหมวด</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-sm border border-stone-200 rounded-xl px-3 py-2 text-stone-600">
          <option value="">ทุก Severity</option>
          <option value="high">สูง</option>
          <option value="medium">กลาง</option>
          <option value="low">ต่ำ</option>
        </select>
        <select value={filterSolve} onChange={(e) => setFilterSolve(e.target.value as "" | "yes" | "no")}
          className="text-sm border border-stone-200 rounded-xl px-3 py-2 text-stone-600">
          <option value="">ทั้งหมด</option>
          <option value="no">โอกาสใหม่</option>
          <option value="yes">ร้านแก้ได้แล้ว</option>
        </select>
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && (
        <div className="flex gap-4 text-xs text-stone-500 bg-stone-50 rounded-xl px-4 py-2.5">
          <span>ทั้งหมด: <b>{items.length}</b></span>
          <span>โอกาสใหม่: <b className="text-violet-600">{items.filter((p) => !p.shopCanSolve).length}</b></span>
          <span>ร้านแก้ได้แล้ว: <b>{items.filter((p) => p.shopCanSolve).length}</b></span>
          <span>กรองแล้ว: <b>{filtered.length}</b></span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-stone-400 text-sm">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-sm">{items.length === 0 ? "ยังไม่มี Pain Point ใน Bank" : "ไม่พบ Pain Point ที่ตรง"}</p>
          {items.length === 0 && (
            <Link href="/admin/automation/research" className="text-sm text-violet-500 hover:text-violet-700 mt-2 inline-block">
              ไปหน้า Research เพื่อ Explore Pain Points
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ category, items: catItems }) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-violet-100 text-violet-600">
                  {category}
                </span>
                <span className="text-[11px] text-stone-400">{catItems.length} items</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catItems.map((pp) => {
                  const sev = SEVERITY_CFG[pp.severity] ?? SEVERITY_CFG.medium;
                  const date = new Date(pp.createdAt).toLocaleDateString("th-TH", {
                    day: "numeric", month: "short", year: "numeric",
                  });
                  return (
                    <div key={pp.id}
                      className={`border rounded-2xl p-4 transition-colors group ${
                        pp.shopCanSolve
                          ? "border-stone-200 bg-stone-50/50"
                          : "border-violet-200 bg-white hover:border-violet-300"
                      }`}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-800 font-medium leading-snug">{pp.painPoint_th || pp.painPoint}</p>
                          {pp.painPoint && pp.painPoint_th && (
                            <p className="text-xs text-stone-500 leading-snug mt-0.5">{pp.painPoint}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.color}`}>{sev.label}</span>
                          {pp.shopCanSolve && (
                            <span className="text-[10px] bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded-full">มีแล้ว</span>
                          )}
                        </div>
                      </div>

                      {/* Product opportunity */}
                      <p className="text-xs text-violet-600 mb-2">{pp.productOpportunity}</p>

                      {/* Niche keyword + linked niches */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-2">
                        <span className="text-[11px] font-mono bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-stone-600">
                          {pp.nicheKeyword}
                        </span>
                        {pp.nicheKeywords.length > 0 && (
                          <>
                            <span className="text-[10px] text-stone-300">→</span>
                            {pp.nicheKeywords.map((nk) => (
                              <Link key={nk.id} href={`/admin/automation/niche-keywords`}
                                className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded hover:bg-purple-100 transition-colors">
                                {nk.niche}
                              </Link>
                            ))}
                          </>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[10px] text-stone-400">
                        <div className="flex items-center gap-2">
                          <span>{date}</span>
                          {pp.createdBy && <span>by {pp.createdBy.name}</span>}
                        </div>
                        <button
                          onClick={() => handleDelete(pp.id)}
                          disabled={deleting === pp.id}
                          className="text-stone-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          {deleting === pp.id ? "กำลังลบ..." : "ลบ"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
