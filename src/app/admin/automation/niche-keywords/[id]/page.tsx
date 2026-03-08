"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  aiRecommendation: string | null;
  isFocused: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string; avatar: string | null } | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  trending:  { label: "Trending",  color: "bg-pink-100 text-pink-600 border-pink-200" },
  gap:       { label: "Gap",       color: "bg-blue-100 text-blue-600 border-blue-200" },
  seasonal:  { label: "Seasonal",  color: "bg-amber-100 text-amber-600 border-amber-200" },
  upsell:    { label: "Upsell",    color: "bg-green-100 text-green-600 border-green-200" },
  manual:    { label: "Manual",    color: "bg-stone-100 text-stone-600 border-stone-200" },
};

export default function NicheKeywordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { activeShop } = useShopAdmin();

  const [kw, setKw] = useState<NicheKeyword | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiModel, setAiModel] = useState<"claude" | "gpt">("claude");

  // Edit states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [tagInput, setTagInput] = useState("");

  // AI states
  const [enhancing, setEnhancing] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/automation/niche-keywords/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setKw(d.data);
        else toast.error(d.error || "Not found");
      })
      .catch(() => toast.error("Load failed"))
      .finally(() => setLoading(false));
  }, [id]);

  const patch = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/admin/automation/niche-keywords", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...payload }),
    });
    return res.json();
  };

  const saveField = async (field: string, value: string | string[]) => {
    try {
      const data = await patch({ [field]: value });
      if (data.success) {
        setKw((prev) => prev ? { ...prev, [field]: data.data?.[field] ?? value } : prev);
        setEditingField(null);
        toast.success("Saved");
      } else toast.error(data.error || "Save failed");
    } catch { toast.error("Save failed"); }
  };

  const saveNiche = async () => {
    if (!draft.niche?.trim()) { toast.error("Keyword EN is required"); return; }
    try {
      const data = await patch({ niche: draft.niche, niche_th: draft.niche_th || null });
      if (data.success) {
        setKw((prev) => prev ? { ...prev, niche: draft.niche, niche_th: draft.niche_th || null } : prev);
        setEditingField(null);
        toast.success("Saved");
      } else toast.error(data.error || "Save failed");
    } catch { toast.error("Save failed"); }
  };

  const saveNote = async () => {
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, note: draft.note ?? "" }),
      });
      const data = await res.json();
      if (data.success) {
        setKw((prev) => prev ? { ...prev, note: data.note } : prev);
        setEditingField(null);
        toast.success("Saved");
      }
    } catch { toast.error("Save failed"); }
  };

  const toggleFocus = async () => {
    try {
      const data = await patch({ toggleFocus: true });
      if (data.success) setKw((prev) => prev ? { ...prev, isFocused: data.isFocused } : prev);
    } catch { toast.error("Focus toggle failed"); }
  };

  const handleAiEnhance = async () => {
    if (!kw) return;
    if (kw.niche?.trim() && kw.niche_th?.trim()) { toast("Both EN and TH already filled"); return; }
    setEnhancing(true);
    try {
      const res = await fetch("/api/admin/automation/niche-keywords/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: [{ id: kw.id, niche: kw.niche, niche_th: kw.niche_th }], aiModel }),
      });
      const data = await res.json();
      if (data.success && data.data?.[0]) {
        const e = data.data[0];
        setKw((prev) => prev ? {
          ...prev,
          ...(e.niche ? { niche: e.niche } : {}),
          ...(e.niche_th !== undefined ? { niche_th: e.niche_th } : {}),
        } : prev);
        toast.success("Translated");
      } else toast.error(data.error || "AI translate failed");
    } catch { toast.error("AI translate failed"); }
    finally { setEnhancing(false); }
  };

  const handleAiRecommend = async () => {
    if (!kw) return;
    setRecommending(true);
    try {
      const res = await fetch("/api/admin/automation/niche-keywords/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: kw.id, niche: kw.niche, niche_th: kw.niche_th, aiModel, shopId: activeShop?.id }),
      });
      const data = await res.json();
      if (data.success) {
        setKw((prev) => prev ? { ...prev, aiRecommendation: data.aiRecommendation } : prev);
        toast.success("AI recommendation generated");
      } else toast.error(data.error || "AI recommend failed");
    } catch { toast.error("AI recommend failed"); }
    finally { setRecommending(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${kw?.niche}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/automation/niche-keywords", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Deleted");
        router.push("/admin/automation/niche-keywords");
      } else toast.error(data.error || "Delete failed");
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  };

  const startEdit = (field: string, current: string) => {
    setDraft((d) => ({ ...d, [field]: current }));
    setEditingField(field);
  };

  const typeCfg = kw ? (TYPE_CONFIG[kw.type] ?? { label: kw.type, color: "bg-stone-100 text-stone-600 border-stone-200" }) : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pt-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-orange-500 border-t-transparent mx-auto mb-3" />
        <p className="text-sm text-stone-400">Loading...</p>
      </div>
    );
  }

  if (!kw) {
    return (
      <div className="max-w-4xl mx-auto pt-16 text-center">
        <p className="text-stone-500 mb-4">Keyword not found</p>
        <Link href="/admin/automation/niche-keywords" className="text-orange-500 text-sm hover:underline">← Back to Keyword Bank</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/automation/niche-keywords"
          className="text-stone-400 hover:text-stone-600 text-sm transition-colors flex items-center gap-1">
          ← Bank
        </Link>
        <span className="text-stone-300">/</span>
        <span className="text-stone-500 text-sm truncate max-w-64">{kw.niche}</span>
      </div>

      {/* Title + Focus + Type */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-4">
        <div className="flex items-start gap-4">
          <button onClick={toggleFocus}
            className={`text-2xl leading-none mt-0.5 transition-colors ${kw.isFocused ? "text-yellow-400 hover:text-yellow-500" : "text-stone-200 hover:text-yellow-300"}`}
            title={kw.isFocused ? "Remove focus" : "Mark as focus"}>
            {kw.isFocused ? "★" : "☆"}
          </button>

          <div className="flex-1 min-w-0">
            {editingField === "niche" ? (
              <div className="space-y-2">
                <input autoFocus type="text" value={draft.niche ?? ""} onChange={(e) => setDraft((d) => ({ ...d, niche: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNiche(); if (e.key === "Escape") setEditingField(null); }}
                  placeholder="Keyword EN *"
                  className="w-full text-2xl font-bold border-b-2 border-orange-400 outline-none bg-transparent text-stone-800 pb-1" />
                <input type="text" value={draft.niche_th ?? ""} onChange={(e) => setDraft((d) => ({ ...d, niche_th: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") saveNiche(); if (e.key === "Escape") setEditingField(null); }}
                  placeholder="Keyword TH"
                  className="w-full text-base border-b border-stone-200 outline-none bg-transparent text-stone-500 pb-1" />
                <div className="flex gap-2">
                  <button onClick={saveNiche} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">Save</button>
                  <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => { startEdit("niche", kw.niche); setDraft((d) => ({ ...d, niche_th: kw.niche_th || "" })); }}
                className="text-left group w-full">
                <h1 className="text-2xl font-bold text-stone-800 group-hover:text-orange-600 transition-colors leading-tight">{kw.niche}</h1>
                {kw.niche_th && <p className="text-base text-stone-400 mt-0.5">{kw.niche_th}</p>}
                {!kw.niche_th && <p className="text-sm text-stone-200 group-hover:text-stone-400 mt-0.5 transition-colors">+ add Thai keyword</p>}
              </button>
            )}
          </div>

          {/* Type badge */}
          {editingField === "type" ? (
            <select autoFocus value={draft.type ?? kw.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
              onBlur={() => saveField("type", draft.type ?? kw.type)}
              className="text-xs border border-stone-200 rounded-lg px-2 py-1">
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          ) : (
            <button onClick={() => startEdit("type", kw.type)}
              className={`text-xs font-bold uppercase px-3 py-1.5 rounded-full border shrink-0 transition-opacity hover:opacity-70 ${typeCfg?.color}`}>
              {typeCfg?.label}
            </button>
          )}
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-stone-100">
          <Link href={`/admin/automation/research?niche=${encodeURIComponent(kw.niche)}`}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 border border-orange-200 font-medium transition-colors">
            Research
          </Link>
          <button onClick={handleAiEnhance} disabled={enhancing || (!!kw.niche?.trim() && !!kw.niche_th?.trim())}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {enhancing ? <><span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Translating...</> : "✨ AI Fill EN/TH"}
          </button>
          <button onClick={handleAiRecommend} disabled={recommending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 transition-colors disabled:opacity-40">
            {recommending ? <><span className="inline-block w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /> Generating...</> : <>✨ {kw.aiRecommendation ? "Re-generate Advice" : "Generate Advice"}</>}
          </button>

          <div className="ml-auto flex items-center gap-2">
            {/* AI Model toggle */}
            <div className="flex bg-stone-100 rounded-lg p-0.5">
              <button onClick={() => setAiModel("claude")}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${aiModel === "claude" ? "bg-white text-purple-600 shadow-sm" : "text-stone-400"}`}>Claude</button>
              <button onClick={() => setAiModel("gpt")}
                className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${aiModel === "gpt" ? "bg-white text-green-600 shadow-sm" : "text-stone-400"}`}>GPT</button>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Reason */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Reason</p>
          <div className="space-y-3">
            {editingField === "reason" ? (
              <div>
                <p className="text-[10px] text-stone-400 mb-1">EN</p>
                <textarea autoFocus rows={2} value={draft.reason ?? ""} onChange={(e) => setDraft((d) => ({ ...d, reason: e.target.value }))}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="Why is this a good niche?" />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => saveField("reason", draft.reason ?? "")} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">Save</button>
                  <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => startEdit("reason", kw.reason || "")} className="text-left w-full group">
                <p className="text-[10px] text-stone-400 mb-0.5">EN</p>
                {kw.reason ? <p className="text-sm text-stone-600 leading-relaxed">{kw.reason}</p>
                  : <p className="text-sm text-stone-200 group-hover:text-stone-400 transition-colors">+ add reason</p>}
              </button>
            )}
            <div className="border-t border-stone-50" />
            {editingField === "reason_th" ? (
              <div>
                <p className="text-[10px] text-stone-400 mb-1">TH</p>
                <textarea autoFocus rows={2} value={draft.reason_th ?? ""} onChange={(e) => setDraft((d) => ({ ...d, reason_th: e.target.value }))}
                  className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                  placeholder="เหตุผลที่ดีของ niche นี้" />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => saveField("reason_th", draft.reason_th ?? "")} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">Save</button>
                  <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => startEdit("reason_th", kw.reason_th || "")} className="text-left w-full group">
                <p className="text-[10px] text-stone-400 mb-0.5">TH</p>
                {kw.reason_th ? <p className="text-sm text-stone-600 leading-relaxed">{kw.reason_th}</p>
                  : <p className="text-sm text-stone-200 group-hover:text-stone-400 transition-colors">+ add reason (Thai)</p>}
              </button>
            )}
          </div>
        </div>

        {/* Remark */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Remark</p>
          {editingField === "remark" ? (
            <div>
              <textarea autoFocus rows={4} value={draft.remark ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, remark: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); }}
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                placeholder="Source, context, where this keyword came from..." />
              <div className="flex gap-2 mt-1.5">
                <button onClick={() => saveField("remark", draft.remark ?? "")} className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">Save</button>
                <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => startEdit("remark", kw.remark || "")} className="text-left w-full group min-h-16">
              {kw.remark ? (
                <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-wrap">{kw.remark}</p>
              ) : (
                <p className="text-sm text-stone-200 group-hover:text-stone-400 transition-colors">+ add remark</p>
              )}
            </button>
          )}
        </div>
      </div>

      {/* My Note — full width, amber accent */}
      <div className="bg-amber-50/60 rounded-2xl border border-amber-100 p-5 mb-4">
        <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-3">My Note</p>
        {editingField === "note" ? (
          <div>
            <textarea autoFocus rows={4} value={draft.note ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Escape") setEditingField(null); }}
              className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none bg-white"
              placeholder="Personal note, ideas, thoughts, next steps..." />
            <div className="flex gap-2 mt-1.5">
              <button onClick={saveNote} className="text-xs bg-amber-500 text-white px-3 py-1 rounded-lg">Save</button>
              <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setDraft((d) => ({ ...d, note: kw.note || "" })); setEditingField("note"); }} className="text-left w-full group min-h-10">
            {kw.note ? (
              <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-wrap">{kw.note}</p>
            ) : (
              <p className="text-sm text-amber-200 group-hover:text-amber-400 transition-colors">+ add personal note</p>
            )}
          </button>
        )}
      </div>

      {/* Tags */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 mb-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Tags</p>
        {editingField === "tags" ? (
          <div>
            <input autoFocus type="text" value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveField("tags", tagInput.split(",").map((t) => t.trim()).filter(Boolean));
                if (e.key === "Escape") setEditingField(null);
              }}
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
              placeholder="tag1, tag2, tag3" />
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => saveField("tags", tagInput.split(",").map((t) => t.trim()).filter(Boolean))}
                className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg">Save</button>
              <button onClick={() => setEditingField(null)} className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setTagInput(kw.tags.join(", ")); setEditingField("tags"); }}
            className="flex flex-wrap gap-2 w-full group text-left">
            {kw.tags.length > 0 ? kw.tags.map((t, i) => (
              <span key={i} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">{t}</span>
            )) : (
              <span className="text-sm text-stone-200 group-hover:text-stone-400 transition-colors">+ add tags</span>
            )}
          </button>
        )}
      </div>

      {/* AI Recommendation */}
      <div className="bg-white rounded-2xl border border-teal-100 p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider flex items-center gap-1.5">
            <span>✨</span> AI Advice
          </p>
          {kw.aiRecommendation && (
            <button onClick={handleAiRecommend} disabled={recommending}
              className="text-[11px] text-teal-500 hover:text-teal-700 transition-colors disabled:opacity-40">
              {recommending ? "Generating..." : "Re-generate"}
            </button>
          )}
        </div>
        {kw.aiRecommendation ? (
          <div className="bg-teal-50/50 rounded-xl p-4">
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">{kw.aiRecommendation}</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-stone-400 mb-3">No AI advice yet</p>
            <button onClick={handleAiRecommend} disabled={recommending}
              className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-600 border border-teal-200 transition-colors mx-auto disabled:opacity-40">
              {recommending ? <><span className="inline-block w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" /> Generating...</> : "✨ Generate Advice"}
            </button>
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 text-xs text-stone-400 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <p className="font-medium text-stone-500 mb-0.5">Created by</p>
          <p>{kw.createdBy?.name ?? "—"}</p>
        </div>
        <div>
          <p className="font-medium text-stone-500 mb-0.5">Created</p>
          <p>{new Date(kw.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div>
          <p className="font-medium text-stone-500 mb-0.5">Last updated</p>
          <p>{new Date(kw.updatedAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div>
          <p className="font-medium text-stone-500 mb-0.5">ID</p>
          <p className="font-mono truncate select-all" title={kw.id}>{kw.id.slice(0, 12)}…</p>
        </div>
      </div>
    </div>
  );
}
