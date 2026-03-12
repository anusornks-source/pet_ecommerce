"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { useLocale } from "@/context/LocaleContext";

export default function SiteSettingsPage() {
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    heroImageUrl: "",
    homeHeroTitle: "",
    homeHeroSubtitle: "",
  });

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setForm({
            heroImageUrl: d.data.heroImageUrl ?? "",
            homeHeroTitle: d.data.homeHeroTitle ?? "",
            homeHeroSubtitle: d.data.homeHeroSubtitle ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (data.success) {
      setForm((f) => ({ ...f, heroImageUrl: data.url }));
      toast.success("อัปโหลดรูป Hero สำเร็จ");
    } else {
      toast.error(data.error ?? "อัปโหลดไม่สำเร็จ");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/site-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      toast.success("บันทึก Site settings แล้ว");
    } else {
      toast.error(data.error ?? "เกิดข้อผิดพลาด");
    }
  };

  const inputCls =
    "w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200";

  if (loading) {
    return <div className="p-10 text-center text-stone-400 text-sm">กำลังโหลด Site settings...</div>;
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">{t("siteSettings", "adminPages")}</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          ตั้งค่าหน้า Home ของแพลตฟอร์ม CartNova เช่น Hero banner กลาง
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Hero Banner */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 space-y-5">
          <h2 className="text-base font-semibold text-stone-700">🏠 Home Hero Banner</h2>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hero Title (EN/TH)
            </label>
            <input
              value={form.homeHeroTitle}
              onChange={(e) => setForm((f) => ({ ...f, homeHeroTitle: e.target.value }))}
              placeholder="เช่น CartNova — Multi-shop Cart Platform"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hero Subtitle
            </label>
            <textarea
              rows={3}
              value={form.homeHeroSubtitle}
              onChange={(e) => setForm((f) => ({ ...f, homeHeroSubtitle: e.target.value }))}
              placeholder="คำอธิบายสั้น ๆ ใต้หัวข้อ เช่น รวมหลายร้านไว้ในตะกร้าเดียว"
              className={`${inputCls} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              Hero Background Image
            </label>
            <div className="flex gap-4 items-start">
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
                  <p className="text-sm text-stone-500">
                    🖼️ คลิกเพื่ออัปโหลดรูปพื้นหลัง Hero (แนะนำ 1200x600px ขึ้นไป)
                  </p>
                )}
              </div>
              <div className="relative w-32 h-20 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden shrink-0">
                {form.heroImageUrl ? (
                  <Image src={form.heroImageUrl} alt="Hero preview" fill className="object-cover" sizes="128px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-stone-400 px-2 text-center">
                    Preview
                  </div>
                )}
              </div>
            </div>
            <input
              value={form.heroImageUrl}
              onChange={(e) => setForm((f) => ({ ...f, heroImageUrl: e.target.value }))}
              placeholder="หรือวาง URL รูป Hero โดยตรง"
              className={`${inputCls} mt-2`}
            />
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500">
            ส่วนนี้มีผลกับหน้า Home (/) ของ CartNova เท่านั้น — ไม่กระทบหน้าร้านย่อย (/shopSlug).
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "กำลังบันทึก..." : "บันทึก Site settings"}
        </button>
      </form>
    </div>
  );
}

