"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLocale } from "@/context/LocaleContext";
import { Tag } from "@/types";

const TAG_COLORS: Record<string, string> = {
  orange: "bg-orange-100 text-orange-700 border-orange-200",
  red: "bg-red-100 text-red-700 border-red-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  pink: "bg-pink-100 text-pink-700 border-pink-200",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  lime: "bg-lime-100 text-lime-700 border-lime-200",
  green: "bg-green-100 text-green-700 border-green-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  teal: "bg-teal-100 text-teal-700 border-teal-200",
  cyan: "bg-cyan-100 text-cyan-700 border-cyan-200",
  sky: "bg-sky-100 text-sky-700 border-sky-200",
  blue: "bg-blue-100 text-blue-700 border-blue-200",
  indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  violet: "bg-violet-100 text-violet-700 border-violet-200",
  purple: "bg-purple-100 text-purple-700 border-purple-200",
};

const COLOR_KEYS = Object.keys(TAG_COLORS);

const COLOR_SWATCH: Record<string, string> = {
  orange: "bg-orange-400",
  red: "bg-red-400",
  rose: "bg-rose-400",
  pink: "bg-pink-400",
  amber: "bg-amber-400",
  yellow: "bg-yellow-400",
  lime: "bg-lime-400",
  green: "bg-green-500",
  emerald: "bg-emerald-400",
  teal: "bg-teal-400",
  cyan: "bg-cyan-400",
  sky: "bg-sky-400",
  blue: "bg-blue-400",
  indigo: "bg-indigo-400",
  violet: "bg-violet-400",
  purple: "bg-purple-400",
};

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

interface TagForm { name: string; nameEn: string; slug: string; color: string; icon: string }
const emptyForm: TagForm = { name: "", nameEn: "", slug: "", color: "orange", icon: "" };

export default function AdminTagsPage() {
  const { t } = useLocale();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TagForm>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiTarget, setAiTarget] = useState<keyof TagForm | null>(null);

  const loadTags = () => {
    fetch("/api/admin/tags")
      .then((r) => r.json())
      .then((d) => { if (d.success) setTags(d.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTags(); }, []);

  const handleNameEnChange = (val: string) => {
    setForm((f) => ({
      ...f,
      nameEn: val,
      slug: editId ? f.slug : slugify(val),
    }));
  };

  const handleAiSuggest = async (target: keyof TagForm) => {
    setAiTarget(target);
    try {
      const res = await fetch("/api/admin/automation/tags/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          context: {
            name: form.name,
            nameEn: form.nameEn,
            slug: form.slug,
            icon: form.icon,
          },
        }),
      });
      const data = await res.json();
      if (!data.success || !data.value) {
        toast.error(data.error || "AI ช่วยเติมไม่สำเร็จ");
        return;
      }
      setForm((f) => ({
        ...f,
        [target]: target === "slug" ? slugify(data.value) : data.value,
      }));
    } catch (err) {
      toast.error("เรียก AI ไม่สำเร็จ");
    } finally {
      setAiTarget(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error("กรุณากรอกชื่อและ slug"); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/admin/tags/${editId}` : "/api/admin/tags";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nameEn: form.nameEn.trim() || null,
          slug: form.slug.trim(),
          color: form.color,
          icon: form.icon.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(editId ? "อัปเดตแล้ว" : "สร้าง tag แล้ว");
        setForm(emptyForm);
        setEditId(null);
        setShowForm(false);
        loadTags();
      } else {
        toast.error(data.error || "เกิดข้อผิดพลาด");
      }
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tag: Tag) => {
    setForm({ name: tag.name, nameEn: tag.nameEn ?? "", slug: tag.slug, color: tag.color, icon: tag.icon ?? "" });
    setEditId(tag.id);
    setShowForm(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`ลบ tag "${tag.name}" ใช่ไหม?`)) return;
    const res = await fetch(`/api/admin/tags/${tag.id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("ลบแล้ว"); loadTags(); }
    else toast.error(data.error || "ลบไม่สำเร็จ");
  };

  const cancelEdit = () => { setForm(emptyForm); setEditId(null); setShowForm(false); };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-800">🏷️ {t("tags", "adminPages")}</h1>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
          >
            + สร้าง Tag ใหม่
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 mb-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700">{editId ? "แก้ไข Tag" : "สร้าง Tag ใหม่"}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-stone-500">ชื่อไทย *</label>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("name")}
                  disabled={aiTarget === "name"}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  {aiTarget === "name" ? "AI กำลังคิด..." : "AI ช่วยตั้งชื่อ"}
                </button>
              </div>
              <input
                value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="ขายดี"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-stone-500">ชื่ออังกฤษ</label>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("nameEn")}
                  disabled={aiTarget === "nameEn"}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  {aiTarget === "nameEn" ? "AI กำลังคิด..." : "AI แปล/คิด EN"}
                </button>
              </div>
              <input
                value={form.nameEn} onChange={(e) => handleNameEnChange(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="bestseller"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-stone-500">Slug * (ใช้ใน URL/filter)</label>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("slug")}
                  disabled={aiTarget === "slug"}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  {aiTarget === "slug" ? "AI กำลังคิด..." : "ให้ AI ช่วย slug"}
                </button>
              </div>
              <input
                value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: slugify(e.target.value) }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="bestseller"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs text-stone-500">Icon (emoji)</label>
                <button
                  type="button"
                  onClick={() => handleAiSuggest("icon")}
                  disabled={aiTarget === "icon"}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  {aiTarget === "icon" ? "AI กำลังคิด..." : "AI ช่วยเลือกอีโมจิ"}
                </button>
              </div>
              <input
                value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="🔥"
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs text-stone-500 mb-2">สี</label>
            <div className="flex gap-2">
              {COLOR_KEYS.map((c) => (
                <button
                  key={c} type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-full ${COLOR_SWATCH[c]} border-2 transition-all ${form.color === c ? "border-stone-700 scale-110" : "border-transparent"}`}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs text-stone-500 mb-1.5">Preview</label>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${TAG_COLORS[form.color]}`}>
              {form.icon && <span>{form.icon}</span>}
              {form.name || "ชื่อ tag"}
            </span>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {saving ? "กำลังบันทึก..." : editId ? "บันทึก" : "สร้าง"}
            </button>
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-colors">
              ยกเลิก
            </button>
          </div>
        </form>
      )}

      {/* Tag list */}
      {loading ? (
        <div className="text-stone-400 text-sm">กำลังโหลด...</div>
      ) : tags.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">ยังไม่มี tag — กด "สร้าง Tag ใหม่" เพื่อเริ่ม</div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-400 font-medium">
                <th className="text-left px-4 py-3">Badge (TH)</th>
                <th className="text-left px-4 py-3">Badge (EN)</th>
                <th className="text-left px-4 py-3">Slug</th>
                <th className="text-left px-4 py-3">สี</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${TAG_COLORS[tag.color] ?? TAG_COLORS.orange}`}>
                      {tag.icon && <span>{tag.icon}</span>}
                      {tag.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {tag.nameEn ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${TAG_COLORS[tag.color] ?? TAG_COLORS.orange}`}>
                        {tag.nameEn}
                      </span>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-stone-500">{tag.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block w-4 h-4 rounded-full ${COLOR_SWATCH[tag.color] ?? "bg-stone-300"}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(tag)} className="text-xs text-stone-400 hover:text-stone-700 px-2 py-1 transition-colors">แก้ไข</button>
                    <button onClick={() => handleDelete(tag)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors">ลบ</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
