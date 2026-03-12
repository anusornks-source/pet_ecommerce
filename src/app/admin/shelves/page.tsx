"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useShopAdmin } from "@/context/ShopAdminContext";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatPrice } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";

interface Shelf {
  id: string;
  name: string;
  name_th: string | null;
  slug: string;
  description: string | null;
  description_th: string | null;
  color: string;
  active: boolean;
  order: number;
  sourceType: string;
  limit: number;
  _count: { items: number };
}

interface ShelfProduct {
  id: string;
  productId: string;
  order: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    images: string[];
    category: { name: string; icon: string | null };
  };
}

const COLOR_PRESETS = [
  { hex: "#0ea5e9", label: "Sky" },
  { hex: "#7c3aed", label: "Violet" },
  { hex: "#0d9488", label: "Teal" },
  { hex: "#e11d48", label: "Rose" },
  { hex: "#059669", label: "Emerald" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#2563eb", label: "Blue" },
  { hex: "#db2777", label: "Pink" },
  { hex: "#d97706", label: "Amber" },
  { hex: "#4f46e5", label: "Indigo" },
];

const toSlug = (name: string) =>
  name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

export default function AdminShelvesPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [shopFilter, setShopFilter] = useState<string>(searchParams.get("shopId") ?? "");
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<{ name: string; name_th: string; slug: string; description: string; description_th: string; color: string; active: boolean; sourceType: "manual" | "best_seller" | "featured"; limit: number }>({ name: "", name_th: "", slug: "", description: "", description_th: "", color: "#0ea5e9", active: true, sourceType: "manual", limit: 8 });
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTarget, setAiTarget] = useState<string | null>(null);

  const suggestField = async (field: string, ctx: Record<string, string>, setter: (v: string) => void) => {
    setAiTarget(field);
    try {
      const res = await fetch("/api/admin/ai/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, ...ctx }),
      });
      const data = await res.json();
      if (data.success && data.value) {
        setter(data.value);
        toast.success("AI ช่วยเติมแล้ว");
      } else {
        toast.error(data.error || "AI ช่วยไม่สำเร็จ");
      }
    } catch {
      toast.error("เรียก AI ไม่สำเร็จ");
    } finally {
      setAiTarget(null);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", name_th: "", slug: "", description: "", description_th: "", color: "#0ea5e9", active: true, sourceType: "manual" as string, limit: 8 });

  // Product items per shelf + expand state (default: all expanded)
  const [shelfItems, setShelfItems] = useState<Record<string, ShelfProduct[]>>({});
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) =>
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Drag state for shelf-level reordering
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchShelves = useCallback(async () => {
    const url = shopFilter ? `/api/admin/shelves?shopId=${shopFilter}` : "/api/admin/shelves";
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setShelves(data.data);
      // Fetch items for all shelves in parallel
      const results = await Promise.all(
        data.data.map((s: Shelf) =>
          fetch(`/api/admin/shelves/${s.id}/items`).then((r) => r.json()).then((d) => ({ id: s.id, items: d.success ? d.data.items : [] }))
        )
      );
      const map: Record<string, ShelfProduct[]> = {};
      results.forEach(({ id, items }) => { map[id] = items; });
      setShelfItems(map);
    }
    setLoading(false);
  }, [shopFilter]);

  useEffect(() => { fetchShelves(); }, [fetchShelves]);

  // ── Create ────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name || !form.slug) return toast.error("กรุณากรอก name (EN) และ slug");
    setSubmitting(true);
    const createUrl = shopFilter && shopFilter !== "all" ? `/api/admin/shelves?shopId=${shopFilter}` : "/api/admin/shelves";
    const res = await fetch(createUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("สร้าง shelf สำเร็จ");
      setForm({ name: "", name_th: "", slug: "", description: "", description_th: "", color: "#0ea5e9", active: true, sourceType: "manual", limit: 8 });
      setShowForm(false);
      fetchShelves();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSubmitting(false);
  };

  // ── Update ────────────────────────────────────────────────────────────────
  const handleUpdate = async (id: string) => {
    setSubmitting(true);
    const qs = shopFilter && shopFilter !== "all" ? `?shopId=${shopFilter}` : "";
    const res = await fetch(`/api/admin/shelves/${id}${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("อัปเดตสำเร็จ");
      setEditingId(null);
      fetchShelves();
    } else {
      toast.error(data.error || "เกิดข้อผิดพลาด");
    }
    setSubmitting(false);
  };

  // ── Toggle active ─────────────────────────────────────────────────────────
  const handleToggle = async (shelf: Shelf) => {
    const qs = shopFilter && shopFilter !== "all" ? `?shopId=${shopFilter}` : "";
    await fetch(`/api/admin/shelves/${shelf.id}${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !shelf.active }),
    });
    setShelves((prev) => prev.map((s) => s.id === shelf.id ? { ...s, active: !s.active } : s));
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ลบ shelf "${name}" และสินค้าทั้งหมดในนั้น?`)) return;
    const qs = shopFilter && shopFilter !== "all" ? `?shopId=${shopFilter}` : "";
    const res = await fetch(`/api/admin/shelves/${id}${qs}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("ลบสำเร็จ");
      setShelves((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // ── Drag reorder ──────────────────────────────────────────────────────────
  const saveOrder = (ordered: Shelf[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch("/api/admin/shelves/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: ordered.map((s) => s.id) }),
      });
    }, 500);
  };

  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    const updated = [...shelves];
    const fromIdx = updated.findIndex((s) => s.id === dragId);
    const toIdx = updated.findIndex((s) => s.id === targetId);
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setShelves(updated);
    setDragId(null);
    setDragOverId(null);
    saveOrder(updated);
  };

  // ── Color picker sub-component ────────────────────────────────────────────
  const ColorPicker = ({
    value, onChange,
  }: { value: string; onChange: (hex: string) => void }) => (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {COLOR_PRESETS.map((c) => (
          <button
            key={c.hex}
            type="button"
            title={c.label}
            onClick={() => onChange(c.hex)}
            className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${value === c.hex ? "border-stone-800 scale-110" : "border-transparent"}`}
            style={{ backgroundColor: c.hex }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-stone-200"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs border border-stone-200 rounded px-2 py-1 w-24"
          placeholder="#000000"
        />
        <div className="w-8 h-8 rounded-lg border border-stone-200" style={{ backgroundColor: value }} />
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">🗂️ {t("shelves", "adminPages")}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-stone-400">จัดการ shelf แสดงสินค้าบน homepage</p>
            {(isAdmin || shops.length > 1) ? (
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600"
              >
                <option value="">ร้าน: {activeShop?.name ?? "..."}</option>
                {isAdmin && <option value="all">ทั้งหมด (ทุกร้าน)</option>}
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : activeShop ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                ร้าน: {activeShop.name}
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium transition-colors"
        >
          + สร้าง Shelf ใหม่
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-800">สร้าง Shelf ใหม่</h2>
            <button
              type="button"
              disabled={aiLoading}
              onClick={async () => {
                setAiLoading(true);
                try {
                  const res = await fetch("/api/admin/ai/suggest-shelf", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sourceType: form.sourceType }),
                  });
                  const data = await res.json();
                  if (data.success && data.data) {
                    setForm((f) => ({
                      ...f,
                      name: data.data.name || f.name,
                      name_th: data.data.name_th ?? f.name_th,
                      slug: data.data.slug || toSlug(data.data.name || f.name),
                      description: data.data.description ?? f.description,
                      description_th: data.data.description_th ?? f.description_th,
                    }));
                    toast.success("AI ช่วยเติมข้อมูลแล้ว");
                  } else {
                    toast.error(data.error || "AI ช่วยไม่สำเร็จ");
                  }
                } catch {
                  toast.error("เรียก AI ไม่สำเร็จ");
                } finally {
                  setAiLoading(false);
                }
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-600 text-sm font-medium hover:bg-violet-100 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {aiLoading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  AI กำลังคิด...
                </>
              ) : (
                <>
                  <span>✨</span>
                  AI ช่วยเติมทั้งหมด
                </>
              )}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">ชื่อ Shelf (EN) *</label>
                <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_name", { name_th: form.name_th, sourceType: form.sourceType }, (v) => setForm((f) => ({ ...f, name: v, slug: toSlug(v) })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_name" ? "…" : "✨ AI"}</button>
              </div>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder="e.g. Best Sellers"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value, slug: toSlug(e.target.value) })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">ชื่อ Shelf (TH)</label>
                <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_name_th", { name: form.name, sourceType: form.sourceType }, (v) => setForm((f) => ({ ...f, name_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_name_th" ? "…" : "✨ AI"}</button>
              </div>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder="เช่น สินค้าขายดี"
                value={form.name_th}
                onChange={(e) => setForm({ ...form, name_th: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">Slug *</label>
                <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_slug", { name: form.name, name_th: form.name_th }, (v) => setForm((f) => ({ ...f, slug: toSlug(v) })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_slug" ? "…" : "✨ AI"}</button>
              </div>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-orange-400"
                placeholder="เช่น best-sellers"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: toSlug(e.target.value) })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">คำอธิบาย badge (EN)</label>
                <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_description", { description_th: form.description_th }, (v) => setForm((f) => ({ ...f, description: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_description" ? "…" : "✨ AI"}</button>
              </div>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder="e.g. ✨ Special picks"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-stone-500">คำอธิบาย badge (TH)</label>
                <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_description_th", { description: form.description }, (v) => setForm((f) => ({ ...f, description_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_description_th" ? "…" : "✨ AI"}</button>
              </div>
              <input
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                placeholder="เช่น ✨ คัดสรรพิเศษ"
                value={form.description_th}
                onChange={(e) => setForm({ ...form, description_th: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">ประเภทสินค้า</label>
              <select
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={form.sourceType}
                onChange={(e) => setForm({ ...form, sourceType: e.target.value as "manual" | "best_seller" | "featured" })}
              >
                <option value="manual">เลือกสินค้าเอง</option>
                <option value="best_seller">🔥 สินค้าขายดี (อัตโนมัติ)</option>
                <option value="featured">⭐ สินค้าแนะนำ (อัตโนมัติ)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">จำนวนสูงสุด (best_seller/featured)</label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 8)) })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-stone-500 mb-2 block">สีพื้นหลัง</label>
            <ColorPicker value={form.color} onChange={(hex) => setForm({ ...form, color: hex })} />
          </div>
          <div
            className="h-12 rounded-xl flex items-center px-4"
            style={{ background: `linear-gradient(135deg, ${form.color}ee, ${form.color}99)` }}
          >
            <span className="text-white text-sm font-semibold">{form.name_th || form.name || "ตัวอย่าง Shelf"}</span>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {submitting ? "กำลังสร้าง..." : "สร้าง Shelf"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-5 py-2 text-stone-500 hover:text-stone-700 text-sm">
              ยกเลิก
            </button>
          </div>
        </div>
      )}

      {/* Shelf list */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-stone-400 text-sm">กำลังโหลด...</div>
        ) : shelves.length === 0 ? (
          <div className="p-10 text-center text-stone-400 text-sm">ยังไม่มี Shelf — กด "+ สร้าง Shelf ใหม่"</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {shelves.map((shelf) => (
              <div key={shelf.id}>
                {editingId === shelf.id ? (
                  /* Inline edit form */
                  <div className="p-5 space-y-4 bg-stone-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-stone-500">แก้ไข Shelf</span>
                      <button
                        type="button"
                        disabled={aiLoading}
                        onClick={async () => {
                          setAiLoading(true);
                          try {
                            const res = await fetch("/api/admin/ai/suggest-shelf", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ sourceType: editForm.sourceType }),
                            });
                            const data = await res.json();
                            if (data.success && data.data) {
                              setEditForm((f) => ({
                                ...f,
                                name: data.data.name || f.name,
                                name_th: data.data.name_th ?? f.name_th,
                                slug: data.data.slug || toSlug(data.data.name || f.name),
                                description: data.data.description ?? f.description,
                                description_th: data.data.description_th ?? f.description_th,
                              }));
                              toast.success("AI ช่วยเติมข้อมูลแล้ว");
                            } else {
                              toast.error(data.error || "AI ช่วยไม่สำเร็จ");
                            }
                          } catch {
                            toast.error("เรียก AI ไม่สำเร็จ");
                          } finally {
                            setAiLoading(false);
                          }
                        }}
                        className="shrink-0 px-2 py-1 rounded-lg border border-violet-200 bg-violet-50 text-violet-600 text-xs font-medium hover:bg-violet-100 disabled:opacity-50"
                      >
                        {aiLoading ? "…" : "✨ AI ช่วยเติมทั้งหมด"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-stone-500">ชื่อ (EN)</label>
                          <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_name", { name_th: editForm.name_th, sourceType: editForm.sourceType }, (v) => setEditForm((f) => ({ ...f, name: v, slug: toSlug(v) })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_name" ? "…" : "✨ AI"}</button>
                        </div>
                        <input
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-stone-500">ชื่อ (TH)</label>
                          <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_name_th", { name: editForm.name, sourceType: editForm.sourceType }, (v) => setEditForm((f) => ({ ...f, name_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_name_th" ? "…" : "✨ AI"}</button>
                        </div>
                        <input
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.name_th}
                          onChange={(e) => setEditForm({ ...editForm, name_th: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-stone-500">Slug</label>
                          <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_slug", { name: editForm.name, name_th: editForm.name_th }, (v) => setEditForm((f) => ({ ...f, slug: toSlug(v) })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_slug" ? "…" : "✨ AI"}</button>
                        </div>
                        <input
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono"
                          value={editForm.slug}
                          onChange={(e) => setEditForm({ ...editForm, slug: toSlug(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-stone-500">คำอธิบาย (EN)</label>
                          <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_description", { description_th: editForm.description_th }, (v) => setEditForm((f) => ({ ...f, description: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_description" ? "…" : "✨ AI"}</button>
                        </div>
                        <input
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-stone-500">คำอธิบาย (TH)</label>
                          <button type="button" disabled={!!aiTarget} onClick={() => suggestField("shelf_description_th", { description: editForm.description }, (v) => setEditForm((f) => ({ ...f, description_th: v })))} className="text-[10px] px-2 py-0.5 rounded-lg border border-violet-200 text-violet-600 hover:bg-violet-50 disabled:opacity-50">{aiTarget === "shelf_description_th" ? "…" : "✨ AI"}</button>
                        </div>
                        <input
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.description_th}
                          onChange={(e) => setEditForm({ ...editForm, description_th: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">ประเภทสินค้า</label>
                        <select
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.sourceType}
                          onChange={(e) => setEditForm({ ...editForm, sourceType: e.target.value })}
                        >
                          <option value="manual">เลือกสินค้าเอง</option>
                          <option value="best_seller">🔥 สินค้าขายดี</option>
                          <option value="featured">⭐ สินค้าแนะนำ</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 mb-1 block">จำนวนสูงสุด</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm"
                          value={editForm.limit}
                          onChange={(e) => setEditForm({ ...editForm, limit: Math.min(20, Math.max(1, parseInt(e.target.value) || 8)) })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-2 block">สีพื้นหลัง</label>
                      <ColorPicker value={editForm.color} onChange={(hex) => setEditForm({ ...editForm, color: hex })} />
                    </div>
                    <div
                      className="h-10 rounded-xl flex items-center px-4"
                      style={{ background: `linear-gradient(135deg, ${editForm.color}ee, ${editForm.color}99)` }}
                    >
                      <span className="text-white text-sm font-semibold">{editForm.name_th || editForm.name}</span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleUpdate(shelf.id)}
                        disabled={submitting}
                        className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm disabled:opacity-50"
                      >
                        บันทึก
                      </button>
                      <button onClick={() => setEditingId(null)} className="px-4 py-1.5 text-stone-500 text-sm">
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Normal row */
                  <div
                    className={`transition-colors ${dragOverId === shelf.id ? "bg-orange-50" : ""} ${dragId === shelf.id ? "opacity-40" : ""}`}
                    draggable
                    onDragStart={() => handleDragStart(shelf.id)}
                    onDragOver={(e) => handleDragOver(e, shelf.id)}
                    onDrop={() => handleDrop(shelf.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  >
                    {/* Row */}
                    <div className="flex items-center gap-3 px-5 py-3">
                      <span className="text-stone-300 cursor-grab text-lg select-none shrink-0">⠿</span>
                      <div className="w-4 h-4 rounded-full shrink-0 border border-stone-200" style={{ backgroundColor: shelf.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-stone-800 text-sm">{shelf.name_th || shelf.name}</p>
                        <p className="text-xs text-stone-400 font-mono">{shelf.slug}</p>
                      </div>
                      <span className="shrink-0 text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                        {shelf.sourceType === "best_seller" ? "🔥 อัตโนมัติ" : shelf.sourceType === "featured" ? "⭐ อัตโนมัติ" : `${shelf._count.items} สินค้า`}
                      </span>
                      <button
                        onClick={() => handleToggle(shelf)}
                        className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${shelf.active ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-400"}`}
                      >
                        {shelf.active ? "แสดง" : "ซ่อน"}
                      </button>
                      {shelf.sourceType !== "best_seller" && shelf.sourceType !== "featured" ? (
                        <Link
                          href={`/admin/shelves/${shelf.id}`}
                          className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          จัดการสินค้า
                        </Link>
                      ) : (
                        <span className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-stone-50 text-stone-400">
                          ไม่ต้องจัดสินค้า
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditingId(shelf.id);
                            setEditForm({ name: shelf.name, name_th: shelf.name_th || "", slug: shelf.slug, description: shelf.description || "", description_th: shelf.description_th || "", color: shelf.color, active: shelf.active, sourceType: shelf.sourceType || "manual", limit: shelf.limit ?? 8 });
                        }}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-stone-50 text-stone-600 hover:bg-stone-100 transition-colors"
                      >
                        แก้ไข
                      </button>
                      <button
                        onClick={() => handleDelete(shelf.id, shelf.name)}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      >
                        ลบ
                      </button>
                      <button
                        onClick={() => toggleCollapse(shelf.id)}
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 transition-all"
                      >
                        <span className={`text-xs transition-transform duration-200 inline-block ${collapsedIds.has(shelf.id) ? "" : "rotate-180"}`}>▾</span>
                      </button>
                    </div>

                    {/* Product cards */}
                    <div className={`px-5 pb-4 ${collapsedIds.has(shelf.id) ? "hidden" : ""}`}>
                      {loading || !shelfItems[shelf.id] ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-40 rounded-xl bg-stone-100 animate-pulse" />
                          ))}
                        </div>
                      ) : shelfItems[shelf.id].length === 0 ? (
                        <p className="text-xs text-stone-300 py-2">ยังไม่มีสินค้า</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {shelfItems[shelf.id].map((item, idx) => {
                            const img = item.product.images?.[0] || `https://placehold.co/200x150/fff7ed/f97316?text=${encodeURIComponent(item.product.name)}`;
                            const isPlaceholder = !item.product.images?.[0];
                            return (
                              <div key={item.id} className="rounded-xl border border-stone-100 overflow-hidden hover:shadow-sm transition-shadow bg-white">
                                <div className="relative aspect-square bg-orange-50">
                                  <Image src={img} alt={item.product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" unoptimized={isPlaceholder} />
                                  <div
                                    className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white shadow"
                                    style={{ backgroundColor: shelf.color }}
                                  >
                                    {idx + 1}
                                  </div>
                                  {item.product.stock === 0 && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">หมด</span>
                                    </div>
                                  )}
                                </div>
                                <div className="p-2">
                                  <p className="text-xs font-medium text-stone-700 line-clamp-2 leading-snug mb-0.5">{item.product.name}</p>
                                  <p className="text-xs font-bold text-orange-500">{formatPrice(item.product.price)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400 text-center">ลาก ⠿ เพื่อเรียงลำดับการแสดงบน homepage</p>
    </div>
  );
}
