"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useShopAdmin } from "@/context/ShopAdminContext";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Banner {
  id: string;
  imageUrl: string;
  badge: string | null;
  badge_th: string | null;
  title: string | null;
  title_th: string | null;
  titleHighlight: string | null;
  titleHighlight_th: string | null;
  subtitle: string | null;
  subtitle_th: string | null;
  ctaLabel: string | null;
  ctaLabel_th: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaLabel_th: string | null;
  secondaryCtaUrl: string | null;
  feat1Enabled: boolean;
  feat1Icon: string | null;
  feat1Label: string | null;
  feat1Label_th: string | null;
  feat2Enabled: boolean;
  feat2Icon: string | null;
  feat2Label: string | null;
  feat2Label_th: string | null;
  feat3Enabled: boolean;
  feat3Icon: string | null;
  feat3Label: string | null;
  feat3Label_th: string | null;
  order: number;
  active: boolean;
}

const emptyForm = {
  imageUrl: "",
  badge: "",
  badge_th: "",
  title: "",
  title_th: "",
  titleHighlight: "",
  titleHighlight_th: "",
  subtitle: "",
  subtitle_th: "",
  ctaLabel: "Shop Now 🛒",
  ctaLabel_th: "ช้อปเลย 🛒",
  ctaUrl: "/products",
  secondaryCtaLabel: "",
  secondaryCtaLabel_th: "",
  secondaryCtaUrl: "",
  feat1Enabled: true,
  feat1Icon: "✅",
  feat1Label: "Quality Products",
  feat1Label_th: "สินค้าคุณภาพ",
  feat2Enabled: true,
  feat2Icon: "🚚",
  feat2Label: "Nationwide Shipping",
  feat2Label_th: "จัดส่งทั่วไทย",
  feat3Enabled: true,
  feat3Icon: "💬",
  feat3Label: "After Sales",
  feat3Label_th: "ดูแลหลังขาย",
  active: true,
};

function SortableBannerCard({
  banner: b,
  index,
  isValidUrl,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  banner: Banner;
  index: number;
  isValidUrl: (url: string) => boolean;
  onEdit: (b: Banner) => void;
  onDelete: (b: Banner) => void;
  onToggleActive: (b: Banner) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: b.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={`bg-white rounded-2xl border ${b.active ? "border-stone-100" : "border-stone-100 opacity-60"} overflow-hidden`}>
      <div className="flex gap-4 p-4">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 flex flex-col items-center justify-center w-8 cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 transition-colors"
          title="ลากเพื่อจัดลำดับ"
        >
          <span className="text-lg">⠿</span>
        </button>

        {/* Thumbnail */}
        <div className="relative w-40 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0">
          {b.imageUrl && isValidUrl(b.imageUrl) ? (
            <Image src={b.imageUrl} alt="Banner" fill className="object-cover" sizes="160px" />
          ) : (
            <div className="flex items-center justify-center h-full text-stone-300 text-2xl">🖼️</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {b.badge && <p className="text-xs text-orange-500 font-medium mb-0.5">{b.badge}</p>}
              <p className="font-semibold text-stone-800 text-sm">
                {b.title}{b.titleHighlight && <span className="text-orange-500"> {b.titleHighlight}</span>}
                {!b.title && !b.titleHighlight && <span className="text-stone-400 italic">ไม่มีหัวเรื่อง</span>}
              </p>
              {b.subtitle && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{b.subtitle}</p>}
              <div className="flex gap-2 mt-1.5">
                {b.ctaLabel && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{b.ctaLabel}</span>
                )}
                {b.secondaryCtaLabel && (
                  <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{b.secondaryCtaLabel}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full">#{index}</span>
              <button
                onClick={() => onToggleActive(b)}
                className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${b.active ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-stone-100 text-stone-400 hover:bg-stone-200"}`}
              >
                {b.active ? "แสดง" : "ซ่อน"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-50 px-4 py-2 flex gap-3">
        <button onClick={() => onEdit(b)} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">แก้ไข</button>
        <button onClick={() => onDelete(b)} className="text-xs text-red-400 hover:text-red-600 transition-colors">ลบ</button>
      </div>
    </div>
  );
}

export default function AdminBannersPage() {
  const { activeShop, shops, isAdmin } = useShopAdmin();
  const [shopFilter, setShopFilter] = useState<string>("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Init shopFilter from activeShop when it first loads
  useEffect(() => {
    if (activeShop?.id && !shopFilter) setShopFilter(activeShop.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShop?.id]);

  const load = useCallback(() => {
    const sid = shopFilter || activeShop?.id;
    const url = sid ? `/api/admin/banners?shopId=${sid}` : "/api/admin/banners";
    fetch(url)
      .then((r) => r.json())
      .then((d) => { if (d.success) setBanners(d.data); })
      .finally(() => setLoading(false));
  }, [shopFilter, activeShop?.id]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, imageUrl: data.url }));
      toast.success("อัปโหลดรูปสำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl.trim()) { toast.error("กรุณาใส่รูปภาพ"); return; }
    setSaving(true);
    try {
      const sid = shopFilter || activeShop?.id;
      const qs = sid ? `?shopId=${sid}` : "";
      const url = editId ? `/api/admin/banners/${editId}${qs}` : `/api/admin/banners${qs}`;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(!editId && { order: String(banners.length) }) }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "อัปเดตแล้ว" : "สร้าง banner แล้ว");
        setForm(emptyForm);
        setEditId(null);
        setShowForm(false);
        load();
      } else {
        toast.error(data.error ?? "เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Banner) => {
    setForm({
      imageUrl: b.imageUrl,
      badge: b.badge ?? "",
      badge_th: b.badge_th ?? "",
      title: b.title ?? "",
      title_th: b.title_th ?? "",
      titleHighlight: b.titleHighlight ?? "",
      titleHighlight_th: b.titleHighlight_th ?? "",
      subtitle: b.subtitle ?? "",
      subtitle_th: b.subtitle_th ?? "",
      ctaLabel: b.ctaLabel ?? emptyForm.ctaLabel,
      ctaLabel_th: b.ctaLabel_th ?? emptyForm.ctaLabel_th,
      ctaUrl: b.ctaUrl ?? emptyForm.ctaUrl,
      secondaryCtaLabel: b.secondaryCtaLabel ?? "",
      secondaryCtaLabel_th: b.secondaryCtaLabel_th ?? "",
      secondaryCtaUrl: b.secondaryCtaUrl ?? "",
      feat1Enabled: b.feat1Enabled,
      feat1Icon: b.feat1Icon ?? "✅",
      feat1Label: b.feat1Label ?? emptyForm.feat1Label,
      feat1Label_th: b.feat1Label_th ?? emptyForm.feat1Label_th,
      feat2Enabled: b.feat2Enabled,
      feat2Icon: b.feat2Icon ?? "🚚",
      feat2Label: b.feat2Label ?? emptyForm.feat2Label,
      feat2Label_th: b.feat2Label_th ?? emptyForm.feat2Label_th,
      feat3Enabled: b.feat3Enabled,
      feat3Icon: b.feat3Icon ?? "💬",
      feat3Label: b.feat3Label ?? emptyForm.feat3Label,
      feat3Label_th: b.feat3Label_th ?? emptyForm.feat3Label_th,
      active: b.active,
    });
    setEditId(b.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (b: Banner) => {
    if (!confirm(`ลบ banner นี้ใช่ไหม?`)) return;
    const sid = shopFilter || activeShop?.id;
    const qs = sid ? `?shopId=${sid}` : "";
    const res = await fetch(`/api/admin/banners/${b.id}${qs}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบแล้ว"); load(); }
    else toast.error(data.error ?? "ลบไม่สำเร็จ");
  };

  const toggleActive = async (b: Banner) => {
    const sid = shopFilter || activeShop?.id;
    const qs = sid ? `?shopId=${sid}` : "";
    const res = await fetch(`/api/admin/banners/${b.id}${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !b.active }),
    });
    const data = await res.json();
    if (data.success) load();
  };

  const cancel = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = banners.findIndex((b) => b.id === active.id);
    const newIndex = banners.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(banners, oldIndex, newIndex);
    setBanners(reordered);
    const sid = shopFilter || activeShop?.id;
    const qs = sid ? `?shopId=${sid}` : "";
    const res = await fetch(`/api/admin/banners/reorder${qs}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((b) => b.id) }),
    });
    const data = await res.json();
    if (data.success) toast.success("จัดลำดับแล้ว");
    else { toast.error("จัดลำดับไม่สำเร็จ"); load(); }
  };

  const inputCls = "w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const suggestTh = async (field: string, ctx: Record<string, string>, setter: (v: string) => void) => {
    setAiBusy(field);
    const res = await fetch("/api/admin/ai/suggest-field", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field, ...ctx }),
    });
    const data = await res.json();
    if (data.success) setter(data.value);
    setAiBusy(null);
  };
  const AIBtn = ({ field, disabled, onSuggest }: { field: string; disabled?: boolean; onSuggest: () => void }) => (
    <button type="button" disabled={!!disabled || aiBusy === field} onClick={onSuggest}
      className="shrink-0 px-2 py-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-600 text-xs font-medium hover:bg-violet-100 disabled:opacity-40 transition-colors"
      title="AI แปลภาษาไทย">
      {aiBusy === field ? "…" : "✨"}
    </button>
  );

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  // ── Live Preview ───────────────────────────────────────────
  const [previewLang, setPreviewLang] = useState<"th" | "en">("en");
  const pick = (th: string, en: string) => previewLang === "th" ? (th || en) : (en || th);
  const Preview = () => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Preview</p>
        <div className="flex rounded-lg border border-stone-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => setPreviewLang("en")}
            className={`px-3 py-1 transition-colors ${previewLang === "en" ? "bg-orange-500 text-white" : "text-stone-500 hover:bg-stone-50"}`}
          >
            🇬🇧 EN
          </button>
          <button
            type="button"
            onClick={() => setPreviewLang("th")}
            className={`px-3 py-1 transition-colors ${previewLang === "th" ? "bg-orange-500 text-white" : "text-stone-500 hover:bg-stone-50"}`}
          >
            🇹🇭 TH
          </button>
        </div>
      </div>
      <div
        className="relative w-full aspect-[5/2] rounded-xl overflow-hidden bg-stone-800 cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
        title="คลิกเพื่ออัปโหลดรูป"
      >
        {form.imageUrl && isValidUrl(form.imageUrl) && (
          <Image src={form.imageUrl} alt="preview" fill className="object-cover" sizes="600px" />
        )}
        {!form.imageUrl && !uploading && (
          <div className="absolute inset-0 flex flex-col items-end justify-start p-3 pointer-events-none">
            <span className="bg-black/40 text-white text-[10px] px-2 py-1 rounded-lg">🖼️ คลิกเพื่ออัปโหลดรูป</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <div className="flex items-center gap-2 text-white text-sm">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              กำลังอัปโหลด...
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-start justify-end p-3 z-10">
          <span className="bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg">📷 เปลี่ยนรูป</span>
        </div>
        <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center px-6 py-4 max-w-[70%]">
          {(form.badge || form.badge_th) && (
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur text-white text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 w-fit">
              {pick(form.badge_th, form.badge)}
            </span>
          )}
          {(form.title || form.title_th || form.titleHighlight || form.titleHighlight_th) && (
            <h2 className="text-white font-bold text-base leading-tight mb-1">
              {pick(form.title_th, form.title)}{" "}
              {(form.titleHighlight || form.titleHighlight_th) && (
                <span className="text-orange-400">{pick(form.titleHighlight_th, form.titleHighlight)}</span>
              )}
            </h2>
          )}
          {(form.subtitle || form.subtitle_th) && (
            <p className="text-white/80 text-[10px] leading-relaxed mb-2 line-clamp-2">
              {pick(form.subtitle_th, form.subtitle)}
            </p>
          )}
          <div className="flex gap-2">
            {(form.ctaLabel || form.ctaLabel_th) && (
              <span className="bg-orange-500 text-white text-[9px] font-semibold px-2.5 py-1 rounded-lg">
                {pick(form.ctaLabel_th, form.ctaLabel)}
              </span>
            )}
            {(form.secondaryCtaLabel || form.secondaryCtaLabel_th) && (
              <span className="bg-white/20 backdrop-blur text-white text-[9px] font-semibold px-2.5 py-1 rounded-lg border border-white/30">
                {pick(form.secondaryCtaLabel_th, form.secondaryCtaLabel)}
              </span>
            )}
          </div>
          {(form.feat1Enabled || form.feat2Enabled || form.feat3Enabled) && (
            <div className="flex items-center gap-3 mt-2 text-white/80 text-[9px]">
              {form.feat1Enabled && <span>{form.feat1Icon} {pick(form.feat1Label_th, form.feat1Label)}</span>}
              {form.feat2Enabled && <span>{form.feat2Icon} {pick(form.feat2Label_th, form.feat2Label)}</span>}
              {form.feat3Enabled && <span>{form.feat3Icon} {pick(form.feat3Label_th, form.feat3Label)}</span>}
            </div>
          )}
        </div>
      </div>
      <p className="text-[10px] text-stone-400 mt-1.5 text-center">Preview อัปเดตตามที่คุณพิมพ์</p>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">🖼️ Hero Banner</h1>
          <div className="flex items-center gap-2 mt-0.5">
            {(isAdmin || shops.length > 1) ? (
              <select
                value={shopFilter}
                onChange={(e) => setShopFilter(e.target.value)}
                className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-200 bg-white text-stone-600"
              >
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
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            + เพิ่ม Banner
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 mb-5 space-y-5">
          <p className="text-sm font-semibold text-stone-700">{editId ? "แก้ไข Banner" : "สร้าง Banner ใหม่"}</p>

          {/* Live Preview (คลิกเพื่ออัปโหลดรูป) */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
          <Preview />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
            placeholder="หรือวาง URL รูปโดยตรง"
            className={inputCls}
          />

          {/* Text content — EN / TH side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <p className="sm:col-span-2 text-xs font-semibold text-stone-500 uppercase tracking-wide">ข้อความ EN (Default) / TH</p>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Badge EN</label>
              <div className="flex gap-1.5">
                <input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="🎉 Welcome to PetShop" className={inputCls} />
                <AIBtn field="badge_en" disabled={!form.badge_th} onSuggest={() => suggestTh("badge_en", { badge_th: form.badge_th }, (v) => setForm((f) => ({ ...f, badge: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Badge TH</label>
              <div className="flex gap-1.5">
                <input value={form.badge_th} onChange={(e) => setForm((f) => ({ ...f, badge_th: e.target.value }))} placeholder="🎉 ยินดีต้อนรับสู่ PetShop" className={inputCls} />
                <AIBtn field="badge_th" disabled={!form.badge} onSuggest={() => suggestTh("badge_th", { badge: form.badge }, (v) => setForm((f) => ({ ...f, badge_th: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title EN (หัวเรื่องหลัก)</label>
              <div className="flex gap-1.5">
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Everything your" className={inputCls} />
                <AIBtn field="title_en" disabled={!form.title_th} onSuggest={() => suggestTh("title_en", { title_th: form.title_th }, (v) => setForm((f) => ({ ...f, title: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title TH</label>
              <div className="flex gap-1.5">
                <input value={form.title_th} onChange={(e) => setForm((f) => ({ ...f, title_th: e.target.value }))} placeholder="ทุกสิ่งที่" className={inputCls} />
                <AIBtn field="title_th" disabled={!form.title} onSuggest={() => suggestTh("title_th", { title: form.title }, (v) => setForm((f) => ({ ...f, title_th: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title Highlight EN (สีส้ม)</label>
              <div className="flex gap-1.5">
                <input value={form.titleHighlight} onChange={(e) => setForm((f) => ({ ...f, titleHighlight: e.target.value }))} placeholder="Pet needs, right here!" className={inputCls} />
                <AIBtn field="titleHighlight_en" disabled={!form.titleHighlight_th} onSuggest={() => suggestTh("titleHighlight_en", { titleHighlight_th: form.titleHighlight_th }, (v) => setForm((f) => ({ ...f, titleHighlight: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Title Highlight TH (สีส้ม)</label>
              <div className="flex gap-1.5">
                <input value={form.titleHighlight_th} onChange={(e) => setForm((f) => ({ ...f, titleHighlight_th: e.target.value }))} placeholder="น้องรัก ต้องการ ที่นี่ครบ!" className={inputCls} />
                <AIBtn field="titleHighlight_th" disabled={!form.titleHighlight} onSuggest={() => suggestTh("titleHighlight_th", { titleHighlight: form.titleHighlight }, (v) => setForm((f) => ({ ...f, titleHighlight_th: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Subtitle EN (คำอธิบาย)</label>
              <div className="flex gap-1.5 items-start">
                <textarea value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} rows={2} placeholder="Quality pet products delivered nationwide." className={inputCls} />
                <AIBtn field="subtitle_en" disabled={!form.subtitle_th} onSuggest={() => suggestTh("subtitle_en", { subtitle_th: form.subtitle_th }, (v) => setForm((f) => ({ ...f, subtitle: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Subtitle TH</label>
              <div className="flex gap-1.5 items-start">
                <textarea value={form.subtitle_th} onChange={(e) => setForm((f) => ({ ...f, subtitle_th: e.target.value }))} rows={2} placeholder="คัดสรรสัตว์เลี้ยงคุณภาพ จัดส่งถึงบ้านทั่วประเทศ" className={inputCls} />
                <AIBtn field="subtitle_th" disabled={!form.subtitle} onSuggest={() => suggestTh("subtitle_th", { subtitle: form.subtitle }, (v) => setForm((f) => ({ ...f, subtitle_th: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มหลัก EN (CTA Label)</label>
              <div className="flex gap-1.5">
                <input value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} placeholder="Shop Now 🛒" className={inputCls} />
                <AIBtn field="ctaLabel_en" disabled={!form.ctaLabel_th} onSuggest={() => suggestTh("ctaLabel_en", { ctaLabel_th: form.ctaLabel_th }, (v) => setForm((f) => ({ ...f, ctaLabel: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มหลัก TH</label>
              <div className="flex gap-1.5">
                <input value={form.ctaLabel_th} onChange={(e) => setForm((f) => ({ ...f, ctaLabel_th: e.target.value }))} placeholder="ช้อปเลย 🛒" className={inputCls} />
                <AIBtn field="ctaLabel_th" disabled={!form.ctaLabel} onSuggest={() => suggestTh("ctaLabel_th", { ctaLabel: form.ctaLabel }, (v) => setForm((f) => ({ ...f, ctaLabel_th: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มหลัก URL</label>
              <input value={form.ctaUrl} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} placeholder="/products" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มรอง EN (Secondary Label)</label>
              <div className="flex gap-1.5">
                <input value={form.secondaryCtaLabel} onChange={(e) => setForm((f) => ({ ...f, secondaryCtaLabel: e.target.value }))} placeholder="View Pets" className={inputCls} />
                <AIBtn field="secondaryCtaLabel_en" disabled={!form.secondaryCtaLabel_th} onSuggest={() => suggestTh("secondaryCtaLabel_en", { secondaryCtaLabel_th: form.secondaryCtaLabel_th }, (v) => setForm((f) => ({ ...f, secondaryCtaLabel: v })))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">ปุ่มรอง TH</label>
              <div className="flex gap-1.5">
                <input value={form.secondaryCtaLabel_th} onChange={(e) => setForm((f) => ({ ...f, secondaryCtaLabel_th: e.target.value }))} placeholder="ดูสัตว์เลี้ยง" className={inputCls} />
                <AIBtn field="secondaryCtaLabel_th" disabled={!form.secondaryCtaLabel} onSuggest={() => suggestTh("secondaryCtaLabel_th", { secondaryCtaLabel: form.secondaryCtaLabel }, (v) => setForm((f) => ({ ...f, secondaryCtaLabel_th: v })))} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-stone-500 mb-1">ปุ่มรอง URL</label>
              <input value={form.secondaryCtaUrl} onChange={(e) => setForm((f) => ({ ...f, secondaryCtaUrl: e.target.value }))} placeholder="/products?category=dogs" className={inputCls} />
            </div>
          </div>

          {/* Feature badges */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Feature Badges (แถบด้านล่าง Banner)</p>
            {([1, 2, 3] as const).map((n) => {
              const enabledKey = `feat${n}Enabled` as const;
              const iconKey = `feat${n}Icon` as const;
              const labelKey = `feat${n}Label` as const;
              const labelThKey = `feat${n}Label_th` as const;
              return (
                <div key={n} className="border border-stone-100 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`feat${n}Enabled`}
                      checked={form[enabledKey]}
                      onChange={(e) => setForm((f) => ({ ...f, [enabledKey]: e.target.checked }))}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <label htmlFor={`feat${n}Enabled`} className="text-sm font-medium text-stone-600">Badge {n}</label>
                  </div>
                  {form[enabledKey] && (
                    <div className="grid grid-cols-[60px_1fr_1fr] gap-2">
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">Icon</label>
                        <input
                          value={form[iconKey]}
                          onChange={(e) => setForm((f) => ({ ...f, [iconKey]: e.target.value }))}
                          className={inputCls}
                          maxLength={4}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">ข้อความ EN</label>
                        <input
                          value={form[labelKey]}
                          onChange={(e) => setForm((f) => ({ ...f, [labelKey]: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-400 mb-1">ข้อความ TH</label>
                        <input
                          value={form[labelThKey]}
                          onChange={(e) => setForm((f) => ({ ...f, [labelThKey]: e.target.value }))}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="w-4 h-4 accent-orange-500"
            />
            <label htmlFor="active" className="text-sm text-stone-600">แสดงบนหน้าเว็บ (Active)</label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "สร้าง"}
            </button>
            <button type="button" onClick={cancel} className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* Banner list */}
      {loading ? (
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">ยังไม่มี banner — กด "+ เพิ่ม Banner" เพื่อเริ่ม</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {banners.map((b, idx) => (
                <SortableBannerCard
                  key={b.id}
                  banner={b}
                  index={idx}
                  isValidUrl={isValidUrl}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggleActive={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
