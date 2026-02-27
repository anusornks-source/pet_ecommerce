"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

interface ArticleFormProps {
  articleId?: string;
  initialData?: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    coverImage: string;
    published: boolean;
    tags: string[];
  };
}

function toSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ArticleForm({ articleId, initialData }: ArticleFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: "",
    published: false,
    tagsText: "",
    ...initialData
      ? {
          ...initialData,
          tagsText: initialData.tags.join(", "),
        }
      : {},
  });

  // Auto-generate slug from title (new articles only)
  useEffect(() => {
    if (!articleId && form.title && !form.slug) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, articleId]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, coverImage: data.url }));
      toast.success("อัปโหลดสำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug: form.slug,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      published: form.published,
      tags,
    };

    const url = articleId ? `/api/admin/articles/${articleId}` : "/api/admin/articles";
    const method = articleId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (data.success) {
      toast.success(articleId ? "บันทึกแล้ว" : "เพิ่มบทความแล้ว");
      router.push("/admin/articles");
    } else {
      toast.error(data.error ?? "เกิดข้อผิดพลาด");
    }
    setSaving(false);
  };

  const inputCls =
    "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  const isValidUrl = (url: string) => {
    try { new URL(url); return true; } catch { return false; }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">ชื่อบทความ *</label>
        <input
          required
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="เช่น 5 วิธีดูแลสุนัขพันธุ์โกลเด้น"
          className={inputCls}
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Slug <span className="text-stone-400 font-normal">(URL)</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-stone-400 shrink-0">/articles/</span>
          <input
            required
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="5-ways-care-golden"
            className={inputCls}
          />
        </div>
      </div>

      {/* Excerpt */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">สรุปย่อ</label>
        <textarea
          rows={2}
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          placeholder="คำอธิบายสั้น ๆ แสดงในหน้ารายการบทความ..."
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Cover image */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">ภาพปก</label>
        <div className="flex gap-3 items-start">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 border-2 border-dashed border-stone-200 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 hover:bg-stone-50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            {uploading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-orange-500">กำลังอัปโหลด...</span>
              </div>
            ) : (
              <p className="text-sm text-stone-500">🖼️ คลิกเพื่ออัปโหลดภาพปก</p>
            )}
          </div>
          {form.coverImage && isValidUrl(form.coverImage) && (
            <div className="relative w-24 h-16 rounded-xl overflow-hidden border border-stone-200 shrink-0">
              <Image src={form.coverImage} alt="" fill className="object-cover" sizes="96px" />
            </div>
          )}
        </div>
        <input
          value={form.coverImage}
          onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))}
          placeholder="หรือวาง URL รูปภาพโดยตรง"
          className={`${inputCls} mt-2`}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          แท็ก <span className="text-stone-400 font-normal">(คั่นด้วยคอมมา)</span>
        </label>
        <input
          value={form.tagsText}
          onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
          placeholder="สุนัข, อาหาร, สุขภาพ"
          className={inputCls}
        />
      </div>

      {/* Content */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-stone-700">เนื้อหา * (Markdown)</label>
          <button
            type="button"
            onClick={() => setPreview(!preview)}
            className="text-xs px-3 py-1 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            {preview ? "✏️ แก้ไข" : "👁️ Preview"}
          </button>
        </div>

        {preview ? (
          <div className="border border-stone-200 rounded-xl p-4 min-h-48 prose prose-sm max-w-none text-stone-700 bg-stone-50">
            {form.content ? (
              <pre className="whitespace-pre-wrap text-sm font-sans">{form.content}</pre>
            ) : (
              <p className="text-stone-400">ยังไม่มีเนื้อหา...</p>
            )}
          </div>
        ) : (
          <textarea
            required
            rows={16}
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder={`# หัวข้อหลัก\n\nเนื้อหาบทความ...\n\n## หัวข้อรอง\n\n- รายการ 1\n- รายการ 2\n\n**ตัวหนา** และ *ตัวเอียง*`}
            className={`${inputCls} resize-y font-mono text-xs leading-relaxed`}
          />
        )}
        <p className="text-xs text-stone-400 mt-1">รองรับ Markdown: # หัวข้อ, **ตัวหนา**, *ตัวเอียง*, - รายการ</p>
      </div>

      {/* Published */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="published"
          checked={form.published}
          onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
          className="w-4 h-4 accent-orange-500"
        />
        <label htmlFor="published" className="text-sm font-medium text-stone-700">
          เผยแพร่บทความ 🌐
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : articleId ? "บันทึกการแก้ไข" : "เพิ่มบทความ"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
