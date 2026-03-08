"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useShopAdmin } from "@/context/ShopAdminContext";

interface NicheKeyword {
  id: string;
  niche: string;
  niche_th: string | null;
  type: string;
  reason: string | null;
  reason_th: string | null;
  remark: string | null;
  tags: string[];
  isFocused: boolean;
  note: string | null;
  aiRecommendation: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; avatar: string | null } | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  trending: { label: "Trending", color: "bg-pink-100 text-pink-600" },
  gap: { label: "Gap", color: "bg-blue-100 text-blue-600" },
  seasonal: { label: "Seasonal", color: "bg-amber-100 text-amber-600" },
  upsell: { label: "Upsell", color: "bg-green-100 text-green-600" },
  manual: { label: "Manual", color: "bg-stone-100 text-stone-600" },
};

export default function NicheKeywordsPage() {
  const router = useRouter();
  const { activeShop } = useShopAdmin();
  const [keywords, setKeywords] = useState<NicheKeyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [filterFocus, setFilterFocus] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Add / Edit
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagEditId, setTagEditId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState("");
  const [remarkEditId, setRemarkEditId] = useState<string | null>(null);
  const [remarkInput, setRemarkInput] = useState("");
  const [nicheEditId, setNicheEditId] = useState<string | null>(null);
  const [nicheInput, setNicheInput] = useState({ niche: "", niche_th: "" });
  const [form, setForm] = useState({ niche: "", niche_th: "", type: "manual", reason: "", reason_th: "", remark: "" });

  // AI enhance
  const [aiModel, setAiModel] = useState<"claude" | "gpt">("claude");
  const [enhancingIds, setEnhancingIds] = useState<Set<string>>(new Set());
  const [enhancingBulk, setEnhancingBulk] = useState(false);
  const [recommendingIds, setRecommendingIds] = useState<Set<string>>(new Set());
  const [expandedRecIds, setExpandedRecIds] = useState<Set<string>>(new Set());

  const handleAiEnhance = async (ids: string[]) => {
    const toEnhance = keywords.filter((k) => ids.includes(k.id) && (!k.niche_th?.trim() || !k.niche?.trim()));
    if (toEnhance.length === 0) { toast("All selected keywords are already complete"); return; }
    const isBulk = ids.length > 1;
    if (isBulk) setEnhancingBulk(true);
    else setEnhancingIds((prev) => new Set([...prev, ids[0]]));
    try {
      const res = await fetch("/api/admin/automation/niche-keywords/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: toEnhance.map((k) => ({ id: k.id, niche: k.niche, niche_th: k.niche_th })), aiModel }),
      });
      const data = await res.json();
      if (data.success) {
        const map: Record<string, { niche?: string; niche_th?: string }> = {};
        for (const e of data.data) map[e.id] = e;
        setKeywords((prev) => prev.map((k) => {
          if (!map[k.id]) return k;
          return { ...k, ...(map[k.id].niche ? { niche: map[k.id].niche! } : {}), ...(map[k.id].niche_th !== undefined ? { niche_th: map[k.id].niche_th! } : {}) };
        }));
        toast.success(`Translated ${data.data.length} keywords`);
        if (isBulk) setSelected(new Set());
      } else toast.error(data.error || "AI translate failed");
    } catch { toast.error("AI translate failed"); }
    finally {
      setEnhancingBulk(false);
      setEnhancingIds((prev) => { const next = new Set(prev); ids.forEach((id) => next.delete(id)); return next; });
    }
  };

  const fetchKeywords = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType) params.set("type", filterType);
    if (filterFocus) params.set("focus", "true");
    if (search) params.set("search", search);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/automation/niche-keywords?${params}`);
      const data = await res.json();
      if (data.success) {
        setKeywords(data.data);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchKeywords(); }, [filterType, filterFocus, page]);

  const handleSearch = () => { setPage(1); fetchKeywords(); };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === keywords.length) setSelected(new Set());
    else setSelected(new Set(keywords.map((k) => k.id)));
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Deleted ${ids.length} keywords`);
        setSelected(new Set());
        fetchKeywords();
      }
    } catch { toast.error("Delete failed"); }
  };

  const handleToggleFocus = async (id: string) => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, toggleFocus: true }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, isFocused: data.isFocused } : k));
        // If filtering by focus, remove unfocused items immediately
        if (filterFocus && !data.isFocused) {
          setKeywords((prev) => prev.filter((k) => k.id !== id));
        }
      }
    } catch { toast.error("Focus toggle failed"); }
  };

  const handleSaveTags = async (id: string, tags: string[]) => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, tags }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, tags } : k));
        setTagEditId(null);
        toast.success("Tags updated");
      }
    } catch { toast.error("Update failed"); }
  };

  const handleSaveNiche = async (id: string, niche: string, niche_th: string) => {
    if (!niche.trim()) { toast.error("Keyword is required"); return; }
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, niche, niche_th }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, niche, niche_th: niche_th || null } : k));
        setNicheEditId(null);
      } else toast.error(data.error || "Update failed");
    } catch { toast.error("Update failed"); }
  };

  const handleSaveRemark = async (id: string, remark: string) => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, remark }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, remark: remark || null } : k));
        setRemarkEditId(null);
      }
    } catch { toast.error("Save remark failed"); }
  };

  const handleSaveNote = async (id: string, note: string) => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, note }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === id ? { ...k, note: data.note } : k));
        setNoteEditId(null);
      }
    } catch { toast.error("Save note failed"); }
  };

  const handleAiRecommend = async (kw: NicheKeyword) => {
    setRecommendingIds((prev) => new Set([...prev, kw.id]));
    try {
      const res = await fetch("/api/admin/automation/niche-keywords/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: kw.id, niche: kw.niche, niche_th: kw.niche_th, aiModel, shopId: activeShop?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => prev.map((k) => k.id === kw.id ? { ...k, aiRecommendation: data.aiRecommendation } : k));
        setExpandedRecIds((prev) => new Set([...prev, kw.id]));
        toast.success("AI recommendation generated");
      } else toast.error(data.error || "AI recommend failed");
    } catch { toast.error("AI recommend failed"); }
    finally { setRecommendingIds((prev) => { const next = new Set(prev); next.delete(kw.id); return next; }); }
  };

  const handleAdd = async () => {
    if (!form.niche.trim()) { toast.error("Keyword is required"); return; }
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [form] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.data.saved > 0 ? "Added!" : "Already exists");
        setShowAdd(false);
        setForm({ niche: "", niche_th: "", type: "manual", reason: "", reason_th: "", remark: "" });
        fetchKeywords();
      } else toast.error(data.error || "Add failed");
    } catch { toast.error("Add failed"); }
  };

  const handleEdit = async (kw: NicheKeyword) => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: kw.id, niche: form.niche, niche_th: form.niche_th, type: form.type, reason: form.reason, reason_th: form.reason_th, remark: form.remark }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Updated!");
        setEditingId(null);
        fetchKeywords();
      } else toast.error(data.error || "Update failed");
    } catch { toast.error("Update failed"); }
  };

  const startEdit = (kw: NicheKeyword) => {
    setTagEditId(null);
    setEditingId(kw.id);
    setForm({ niche: kw.niche, niche_th: kw.niche_th || "", type: kw.type, reason: kw.reason || "", reason_th: kw.reason_th || "", remark: kw.remark || "" });
    setTimeout(() => document.getElementById("edit-form-top")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const useInResearch = (niche: string) => {
    router.push(`/admin/automation/research?niche=${encodeURIComponent(niche)}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Niche Keyword Bank</h1>
          <p className="text-sm text-stone-500 mt-1">Saved niche keywords for research</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400">{total} keywords</span>
          <button onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm({ niche: "", niche_th: "", type: "manual", reason: "", reason_th: "", remark: "" }); }}
            className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors">
            + Add
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {(showAdd || editingId) && (
        <div id="edit-form-top" className="bg-white rounded-2xl border border-orange-200 p-4 mb-4">
          <h3 className="text-sm font-bold text-stone-700 mb-3">{editingId ? "Edit Keyword" : "Add Keyword"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input type="text" value={form.niche} onChange={(e) => setForm((f) => ({ ...f, niche: e.target.value }))}
              placeholder="Keyword (EN) *" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <input type="text" value={form.niche_th} onChange={(e) => setForm((f) => ({ ...f, niche_th: e.target.value }))}
              placeholder="Keyword (TH)" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
              <option value="manual">Manual</option>
              <option value="trending">Trending</option>
              <option value="gap">Gap</option>
              <option value="seasonal">Seasonal</option>
              <option value="upsell">Upsell</option>
            </select>
            <input type="text" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Reason (EN)" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <input type="text" value={form.reason_th} onChange={(e) => setForm((f) => ({ ...f, reason_th: e.target.value }))}
              placeholder="Reason (TH)" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <input type="text" value={form.remark} onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
              placeholder="Remark (source / note)" className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 md:col-span-2" />
          </div>
          <div className="flex gap-2 mt-3">
            {editingId ? (
              <button onClick={() => handleEdit(keywords.find((k) => k.id === editingId)!)}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors">Save</button>
            ) : (
              <button onClick={handleAdd}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-4 py-2 rounded-xl font-medium transition-colors">Add</button>
            )}
            <button onClick={() => { setShowAdd(false); setEditingId(null); }}
              className="bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs px-4 py-2 rounded-xl transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex gap-2 flex-1 min-w-48">
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search keywords..."
              className="flex-1 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            <button onClick={handleSearch}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
              Search
            </button>
          </div>

          {/* Type filter */}
          <div className="flex gap-1 bg-stone-100 rounded-lg p-0.5">
            <button onClick={() => { setFilterType(""); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!filterType ? "bg-white text-stone-800 shadow-sm" : "text-stone-500"}`}>
              All
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <button key={key} onClick={() => { setFilterType(key); setPage(1); }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filterType === key ? "bg-white shadow-sm " + cfg.color : "text-stone-500"}`}>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Focus filter */}
          <button
            onClick={() => { setFilterFocus((v) => !v); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterFocus ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "border-stone-200 text-stone-500 hover:border-stone-300"}`}
          >
            <span>{filterFocus ? "★" : "☆"}</span> Focus
          </button>

          {/* AI Model */}
          <div className="flex bg-stone-100 rounded-lg p-0.5 ml-auto">
            <button onClick={() => setAiModel("claude")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${aiModel === "claude" ? "bg-white text-purple-600 shadow-sm" : "text-stone-500"}`}>Claude</button>
            <button onClick={() => setAiModel("gpt")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${aiModel === "gpt" ? "bg-white text-green-600 shadow-sm" : "text-stone-500"}`}>GPT</button>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex gap-2">
              <button onClick={() => handleAiEnhance(Array.from(selected))} disabled={enhancingBulk}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-50">
                {enhancingBulk ? <><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Fill...</> : <>✨ AI Fill ({selected.size})</>}
              </button>
              <button onClick={handleDelete}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                Delete ({selected.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Keywords Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-3 border-orange-500 border-t-transparent mx-auto mb-3" />
          <p className="text-sm text-stone-400">Loading...</p>
        </div>
      ) : keywords.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400">
          <p className="text-sm">{filterFocus ? "No focused keywords yet" : "No saved keywords yet"}</p>
          <p className="text-xs mt-1">{filterFocus ? "Click ☆ on any keyword to mark it as focus" : "Use Ideation in Product Research to generate and save keywords"}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="w-8 px-3 py-3">
                  <input type="checkbox" checked={selected.size === keywords.length && keywords.length > 0}
                    onChange={toggleAll} className="rounded" />
                </th>
                <th className="w-8 px-3 py-3"></th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500">Keyword</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 hidden md:table-cell">Thai</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 w-20">Type</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 hidden lg:table-cell w-48">Reason</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 hidden lg:table-cell w-48">Remark</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 hidden xl:table-cell w-48">Note</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500">Tags</th>
                <th className="text-left px-3 py-3 text-xs font-medium text-stone-500 hidden md:table-cell w-28">By</th>
                <th className="w-24 px-3 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {keywords.map((kw) => (
                <React.Fragment key={kw.id}>
                <tr className={`border-b border-stone-50 hover:bg-stone-50/50 ${selected.has(kw.id) ? "bg-orange-50/30" : ""}`}>
                  <td className="px-3 py-2.5">
                    <input type="checkbox" checked={selected.has(kw.id)} onChange={() => toggleSelect(kw.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => handleToggleFocus(kw.id)}
                      title={kw.isFocused ? "Remove focus" : "Mark as focus"}
                      className={`text-base leading-none transition-colors ${kw.isFocused ? "text-yellow-400 hover:text-yellow-500" : "text-stone-200 hover:text-yellow-300"}`}
                    >
                      {kw.isFocused ? "★" : "☆"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    {nicheEditId === kw.id ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          value={nicheInput.niche}
                          onChange={(e) => setNicheInput((p) => ({ ...p, niche: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNiche(kw.id, nicheInput.niche, nicheInput.niche_th);
                            if (e.key === "Escape") setNicheEditId(null);
                          }}
                          placeholder="Keyword EN *"
                          className="w-36 border border-stone-200 rounded px-2 py-0.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-300"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={nicheInput.niche_th}
                          onChange={(e) => setNicheInput((p) => ({ ...p, niche_th: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNiche(kw.id, nicheInput.niche, nicheInput.niche_th);
                            if (e.key === "Escape") setNicheEditId(null);
                          }}
                          placeholder="Keyword TH"
                          className="w-36 border border-stone-200 rounded px-2 py-0.5 text-xs text-stone-400 focus:outline-none focus:ring-1 focus:ring-orange-300"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => handleSaveNiche(kw.id, nicheInput.niche, nicheInput.niche_th)} className="text-[10px] text-green-600 hover:text-green-800">Save</button>
                          <button onClick={() => setNicheEditId(null)} className="text-[10px] text-stone-400 hover:text-stone-600">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => { setNicheEditId(kw.id); setNicheInput({ niche: kw.niche, niche_th: kw.niche_th || "" }); setTagEditId(null); setRemarkEditId(null); setNoteEditId(null); }} className="text-left group">
                        <p className="font-medium text-stone-800 group-hover:text-orange-600 transition-colors">{kw.niche}</p>
                        <p className="text-[11px] text-stone-400 md:hidden">{kw.niche_th || ""}</p>
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-stone-400 hidden md:table-cell">
                    {nicheEditId === kw.id ? null : (
                      <button onClick={() => { setNicheEditId(kw.id); setNicheInput({ niche: kw.niche, niche_th: kw.niche_th || "" }); setTagEditId(null); setRemarkEditId(null); setNoteEditId(null); }} className="text-left group">
                        <span className="text-sm text-stone-400 group-hover:text-orange-500 transition-colors">{kw.niche_th || <span className="text-stone-200 group-hover:text-stone-400 text-xs">+ TH</span>}</span>
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${TYPE_CONFIG[kw.type]?.color ?? "bg-stone-100 text-stone-500"}`}>
                      {TYPE_CONFIG[kw.type]?.label ?? kw.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-stone-400 hidden lg:table-cell w-48">
                    <p className="truncate max-w-45" title={kw.reason_th || kw.reason || ""}>
                      {kw.reason_th || kw.reason || "—"}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell w-48">
                    {remarkEditId === kw.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          value={remarkInput}
                          onChange={(e) => setRemarkInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRemark(kw.id, remarkInput);
                            if (e.key === "Escape") setRemarkEditId(null);
                          }}
                          placeholder="type remark..."
                          className="w-36 border border-stone-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                          autoFocus
                        />
                        <button onClick={() => handleSaveRemark(kw.id, remarkInput)} className="text-[10px] text-green-600 hover:text-green-800">Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setRemarkEditId(kw.id); setRemarkInput(kw.remark || ""); setTagEditId(null); setNoteEditId(null); }}
                        className="text-left w-full group"
                        title={kw.remark || "Click to add remark"}
                      >
                        {kw.remark ? (
                          <p className="truncate max-w-45 text-[11px] text-stone-400">{kw.remark}</p>
                        ) : (
                          <span className="text-[10px] text-stone-200 group-hover:text-stone-400">+ remark</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden xl:table-cell w-48">
                    {noteEditId === kw.id ? (
                      <div className="flex gap-1 items-center">
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveNote(kw.id, noteInput);
                            if (e.key === "Escape") setNoteEditId(null);
                          }}
                          placeholder="type note..."
                          className="w-36 border border-stone-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-300"
                          autoFocus
                        />
                        <button onClick={() => handleSaveNote(kw.id, noteInput)} className="text-[10px] text-green-600 hover:text-green-800">Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setNoteEditId(kw.id); setNoteInput(kw.note || ""); setTagEditId(null); setRemarkEditId(null); }}
                        className="text-left w-full group"
                        title={kw.note || "Click to add note"}
                      >
                        {kw.note ? (
                          <p className="truncate max-w-45 text-[11px] text-amber-600">{kw.note}</p>
                        ) : (
                          <span className="text-[10px] text-stone-200 group-hover:text-stone-400">+ note</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {tagEditId === kw.id ? (
                      <div className="flex gap-1">
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveTags(kw.id, tagInput.split(",").map((t) => t.trim()).filter(Boolean));
                            if (e.key === "Escape") setTagEditId(null);
                          }}
                          placeholder="tag1, tag2"
                          className="w-32 border border-stone-200 rounded px-2 py-0.5 text-xs" autoFocus />
                        <button onClick={() => handleSaveTags(kw.id, tagInput.split(",").map((t) => t.trim()).filter(Boolean))}
                          className="text-[10px] text-green-600 hover:text-green-800">Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setTagEditId(kw.id); setTagInput(kw.tags.join(", ")); }}
                        className="flex flex-wrap gap-1 group">
                        {kw.tags.length > 0 ? kw.tags.map((t, i) => (
                          <span key={i} className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{t}</span>
                        )) : (
                          <span className="text-[10px] text-stone-300 group-hover:text-stone-500">+ add tags</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    <span className="text-[11px] text-stone-400">{kw.createdBy?.name ?? "—"}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <button onClick={() => handleAiEnhance([kw.id])}
                        disabled={enhancingIds.has(kw.id) || (!!kw.niche?.trim() && !!kw.niche_th?.trim())}
                        title={kw.niche?.trim() && kw.niche_th?.trim() ? "Both EN and TH already filled" : "AI fill missing EN/TH"}
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        {enhancingIds.has(kw.id) ? <><span className="inline-block w-2.5 h-2.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /></> : <>✨ Fill</>}
                      </button>
                      <button onClick={() => handleAiRecommend(kw)}
                        disabled={recommendingIds.has(kw.id)}
                        title="AI: แนะนำสินค้า, pain point, ขั้นตอนต่อไป"
                        className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 transition-colors disabled:opacity-40">
                        {recommendingIds.has(kw.id) ? <><span className="inline-block w-2.5 h-2.5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /></> : <>✨ Advise</>}
                      </button>
                      <button onClick={() => startEdit(kw)}
                        className="text-[11px] text-stone-400 hover:text-stone-600 transition-colors">Edit</button>
                      <button onClick={() => useInResearch(kw.niche)}
                        className="text-[11px] text-orange-500 hover:text-orange-700 font-medium transition-colors">Research</button>
                    </div>
                  </td>
                </tr>
                {kw.aiRecommendation && (
                  <tr className="border-b border-stone-50 bg-teal-50/30">
                    <td colSpan={12} className="px-10 py-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">🤖</span>
                        <div className="flex-1">
                          {expandedRecIds.has(kw.id) ? (
                            <div>
                              <p className="text-xs text-stone-600 whitespace-pre-wrap">{kw.aiRecommendation}</p>
                              <button onClick={() => setExpandedRecIds((prev) => { const next = new Set(prev); next.delete(kw.id); return next; })}
                                className="text-[10px] text-teal-500 hover:text-teal-700 mt-1">ย่อ ▲</button>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs text-stone-500 line-clamp-2">{kw.aiRecommendation}</p>
                              <button onClick={() => setExpandedRecIds((prev) => new Set([...prev, kw.id]))}
                                className="text-[10px] text-teal-500 hover:text-teal-700 mt-0.5">ดูทั้งหมด ▼</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg disabled:opacity-30 hover:bg-stone-50 transition-colors">
            Prev
          </button>
          <span className="text-xs text-stone-500">Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg disabled:opacity-30 hover:bg-stone-50 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
