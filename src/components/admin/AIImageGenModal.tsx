"use client";

import { useState } from "react";
import Image from "next/image";
import toast from "react-hot-toast";

const PROMPT_GROUPS = [
  {
    key: "background",
    label: "พื้นหลัง",
    options: [
      { label: "พื้นหลังขาว", prompt: "change background to pure white studio" },
      { label: "พื้นหลังสตูดิโอ", prompt: "change background to professional white studio with soft shadows" },
      { label: "พื้นหลังสวน", prompt: "change background to green garden, natural outdoor" },
      { label: "พื้นหลังทะเล", prompt: "change background to beach, ocean, blue sky" },
      { label: "พื้นหลังโปร่งใส", prompt: "remove background, transparent, product only" },
      { label: "พื้นหลัง gradient", prompt: "change background to smooth gradient, modern" },
      { label: "พื้นหลังไม้", prompt: "change background to wooden surface, rustic" },
      { label: "พื้นหลังหินอ่อน", prompt: "change background to marble surface, luxury" },
      { label: "พื้นหลังหญ้า", prompt: "change background to green grass lawn, outdoor" },
    ],
  },
  {
    key: "filter",
    label: "Filter / สไตล์",
    options: [
      { label: "Filter vintage", prompt: "apply vintage film filter, warm tones, nostalgic" },
      { label: "Filter pastel", prompt: "apply soft pastel filter, light colors, dreamy" },
      { label: "Filter contrast สูง", prompt: "high contrast, vivid colors, sharp" },
      { label: "Filter สีอบอุ่น", prompt: "warm color tone, golden hour feel" },
      { label: "Filter สีเย็น", prompt: "cool color tone, clean minimal" },
      { label: "Filter cinematic", prompt: "cinematic look, dramatic mood" },
    ],
  },
  {
    key: "lighting",
    label: "แสง / เงา",
    options: [
      { label: "ใส่เงา soft", prompt: "add soft natural shadow, professional product photo" },
      { label: "ใส่แสงส่อง", prompt: "add dramatic lighting, spotlight effect" },
      { label: "แสงธรรมชาติ", prompt: "natural daylight, soft diffused light" },
      { label: "แสงสตูดิโอ", prompt: "studio lighting, even illumination" },
    ],
  },
  {
    key: "badge",
    label: "Badge / ป้าย",
    options: [
      { label: "ป้าย NEW", prompt: "add small NEW badge sticker, top corner" },
      { label: "ป้าย SALE", prompt: "add SALE or discount badge, promotional" },
      { label: "ป้าย Best Seller", prompt: "add Best Seller badge, award style" },
      { label: "ป้าย Free Shipping", prompt: "add Free Shipping badge" },
      { label: "ป้าย Limited", prompt: "add Limited Edition badge" },
    ],
  },
  {
    key: "composition",
    label: "องค์ประกอบ",
    options: [
      { label: "ขยาย product ให้ใหญ่ขึ้น", prompt: "zoom in on product, fill frame, product larger" },
      { label: "ใส่กรอบ", prompt: "add subtle border or frame around image" },
      { label: "ใส่พื้นผิว", prompt: "add texture overlay, subtle pattern" },
    ],
  },
] as const;

const AR_OPTIONS = [
  { label: "1:1", value: "1:1" },
  { label: "4:5", value: "4:5" },
  { label: "9:16", value: "9:16" },
] as const;

const LANG_OPTIONS = [
  { label: "ไทย", value: "th" },
  { label: "English", value: "en" },
] as const;

export interface ProductContext {
  name?: string;
  name_th?: string;
  price?: number;
  normalPrice?: number;
  shortDescription?: string;
}

interface Props {
  imageUrl: string;
  productId?: string;
  marketingPackId?: string;
  productName?: string;
  /** ข้อมูลสินค้าให้ AI ใช้ (แปะป้ายราคา, ใส่ข้อมูล) */
  productContext?: ProductContext;
  onClose: () => void;
  onSaveSuccess?: () => void;
}

export default function AIImageGenModal({
  imageUrl,
  productId,
  marketingPackId,
  productName,
  productContext,
  onClose,
  onSaveSuccess,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [task, setTask] = useState("");
  const [textLang, setTextLang] = useState<"th" | "en">("th");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16">("1:1");
  const [generating, setGenerating] = useState(false);
  const [expandingPrompt, setExpandingPrompt] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const togglePreset = (presetPrompt: string) => {
    const isAdding = !selectedPrompts.has(presetPrompt);
    setSelectedPrompts((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(presetPrompt);
      else next.delete(presetPrompt);
      return next;
    });
    setPrompt((p) => {
      const trimmed = p.trim();
      if (isAdding) {
        return trimmed ? `${trimmed}, ${presetPrompt}` : presetPrompt;
      }
      const parts = trimmed.split(/,\s*/).map((s) => s.trim()).filter(Boolean);
      return parts.filter((part) => part !== presetPrompt).join(", ");
    });
  };

  const buildFinalPrompt = () => {
    return prompt.trim();
  };

  const handleExpandPrompt = async () => {
    if (!task.trim()) {
      toast.error("กรุณาใส่โจทย์สั้น ๆ");
      return;
    }
    setExpandingPrompt(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai/expand-image-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: task.trim(),
          productContext: productContext ?? productName ?? undefined,
          textLang,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrompt(data.prompt);
        toast.success("AI สร้าง prompt ให้แล้ว");
      } else {
        toast.error(data.error ?? "สร้าง prompt ไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setExpandingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    const finalPrompt = buildFinalPrompt();
    if (!finalPrompt.trim()) {
      toast.error("กรุณาเลือก preset หรือใส่ prompt");
      return;
    }
    setGenerating(true);
    setError(null);
    setGeneratedUrl(null);
    try {
      const res = await fetch("/api/admin/automation/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: buildFinalPrompt(),
          aspectRatio,
          imageUrls: [imageUrl],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedUrl(data.url);
        toast.success("สร้างรูปสำเร็จ");
      } else {
        setError(data.error ?? "สร้างรูปไม่สำเร็จ");
        toast.error(data.error ?? "สร้างรูปไม่สำเร็จ");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedUrl) return;
    const a = document.createElement("a");
    a.href = generatedUrl;
    a.download = `ai-gen-${Date.now()}.jpg`;
    a.target = "_blank";
    a.click();
    toast.success("ดาวน์โหลดแล้ว");
  };

  const handleSaveToMarketing = async () => {
    if (!generatedUrl || !productId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/marketing-assets/save-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: generatedUrl,
          productId,
          marketingPackId: marketingPackId || undefined,
          prompt: buildFinalPrompt() || null,
          angle: "AI generated",
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกเข้า Marketing Assets แล้ว");
        onSaveSuccess?.();
        onClose();
      } else {
        toast.error(data.error ?? "บันทึกไม่สำเร็จ");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-stone-800">AI สร้างรูปจากภาพ</h3>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${showHelp ? "bg-purple-100 text-purple-600" : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}
              title="วิธีใช้งาน"
            >
              ?
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-stone-100 text-stone-500 flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        {showHelp && (
          <div className="px-5 py-4 bg-purple-50 border-b border-purple-100 text-sm text-stone-600 space-y-2">
            <p className="font-medium text-purple-800">วิธีใช้งาน</p>
            <ol className="list-decimal list-inside space-y-1 text-[13px]">
              <li><strong>เลือกภาษา</strong> — ไทย หรือ English สำหรับข้อความที่ AI จะใส่ (ป้ายราคา, ชื่อสินค้า)</li>
              <li><strong>บอกโจทย์สั้น ๆ</strong> — พิมพ์ในช่องด้านบน เช่น &quot;แปะป้ายราคา&quot; &quot;พื้นหลังขาว&quot; &quot;ใส่ข้อมูลสั้น ๆ&quot;</li>
              <li><strong>กด AI สร้าง prompt</strong> — AI จะคิด prompt ละเอียดให้ (ถ้ามีข้อมูลสินค้า จะใส่ราคา/ชื่อให้ถูกตามภาษาที่เลือก)</li>
              <li><strong>เลือก preset</strong> — กดปุ่มในแต่ละกลุ่ม (พื้นหลัง, Filter, Badge ฯลฯ) ได้หลายอัน แล้วพิมพ์เพิ่มในช่อง Prompt ได้</li>
              <li><strong>เลือกอัตราส่วน</strong> — 1:1, 4:5 หรือ 9:16</li>
              <li><strong>กดสร้างรูปด้วย AI</strong> — รอสักครู่ แล้วดาวน์โหลดหรือบันทึกเข้า Marketing Assets</li>
            </ol>
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Reference image */}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden bg-stone-100 shrink-0">
              <Image src={imageUrl} alt="ต้นฉบับ" width={96} height={96} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-stone-500 mb-2">รูปต้นฉบับ (ใช้เป็น reference)</p>
              {(productContext || productName) && (
                <div className="text-[11px] text-stone-500 space-y-0.5">
                  <p className="truncate">สินค้า: {productName ?? productContext?.name_th ?? productContext?.name ?? "—"}</p>
                  {productContext?.price != null && (
                    <p>ราคา: ฿{productContext.price.toLocaleString()}{productContext.normalPrice ? ` (ปกติ ฿${productContext.normalPrice.toLocaleString()})` : ""}</p>
                  )}
                  {productContext?.shortDescription && (
                    <p className="line-clamp-2 text-stone-400">{productContext.shortDescription}</p>
                  )}
                  <p className="text-[10px] text-purple-500">AI จะใช้ข้อมูลนี้เมื่อบอกแปะป้ายราคา/ใส่ข้อมูล</p>
                </div>
              )}
            </div>
          </div>

          {/* AI โจทย์ → prompt */}
          <div className="flex gap-2">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="บอกโจทย์สั้น ๆ เช่น แปะป้ายราคา, พื้นหลังขาว, ใส่ข้อมูลสั้น ๆ..."
              className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300 placeholder:text-stone-400"
            />
            <button
              type="button"
              onClick={handleExpandPrompt}
              disabled={expandingPrompt || !task.trim()}
              className="shrink-0 px-4 py-2 rounded-lg bg-purple-100 hover:bg-purple-200 disabled:bg-stone-100 disabled:text-stone-400 text-purple-700 font-medium text-sm flex items-center gap-1.5"
            >
              {expandingPrompt ? (
                <>
                  <span className="animate-spin">⏳</span>
                  กำลังคิด...
                </>
              ) : (
                <>✨ AI สร้าง prompt</>
              )}
            </button>
          </div>

          {/* Prompt presets - grouped, multi-select */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-stone-600">เลือก prompt (กดได้หลายอัน หรือพิมพ์เองด้านล่าง):</p>
            {PROMPT_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wide mb-1.5">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.options.map((opt) => {
                    const isSelected = selectedPrompts.has(opt.prompt);
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => togglePreset(opt.prompt)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${
                          isSelected
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-stone-100 hover:bg-purple-100 hover:text-purple-700 text-stone-600"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom prompt */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">Prompt เพิ่มเติม (หรือพิมพ์เอง)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="พิมพ์ prompt เพิ่มเติม หรือใช้ AI สร้าง prompt จากโจทย์ด้านบน..."
              className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300 min-h-[80px]"
              rows={3}
            />
            {selectedPrompts.size > 0 && (
              <p className="text-[10px] text-stone-400 mt-1">
                เลือกแล้ว {selectedPrompts.size} รายการ — จะรวมกับ prompt ด้านบน
              </p>
            )}
          </div>

          {/* Aspect ratio + Lang */}
          <div>
            <p className="text-xs font-medium text-stone-600 mb-2">อัตราส่วน</p>
            <div className="flex items-center justify-between gap-2">
              <div className="flex gap-2">
                {AR_OPTIONS.map((ar) => (
                  <button
                    key={ar.value}
                    type="button"
                    onClick={() => setAspectRatio(ar.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === ar.value ? "bg-purple-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {ar.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 shrink-0" title="ภาษาข้อความที่ AI จะใส่">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTextLang(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      textLang === opt.value ? "bg-purple-600 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                    }`}
                  >
                    {opt.value === "th" ? "TH" : "EN"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !buildFinalPrompt().trim()}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-medium flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">⏳</span>
                กำลังสร้างรูป...
              </>
            ) : (
              <>✨ สร้างรูปด้วย AI</>
            )}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* Result */}
          {generatedUrl && (
            <div className="border-t border-stone-100 pt-4 space-y-3">
              <p className="text-xs font-medium text-stone-600">รูปที่สร้าง:</p>
              <div className="relative aspect-square max-w-xs rounded-xl overflow-hidden bg-stone-100">
                <Image src={generatedUrl} alt="AI generated" fill className="object-contain" sizes="320px" unoptimized />
              </div>
              <div className="flex gap-2">
                <a
                  href={generatedUrl}
                  download={`ai-gen-${Date.now()}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 text-center"
                >
                  ⬇ ดาวน์โหลด
                </a>
                {productId && (
                  <button
                    type="button"
                    onClick={handleSaveToMarketing}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-stone-300 text-white text-sm font-medium"
                  >
                    {saving ? "กำลังบันทึก..." : marketingPackId ? "💾 บันทึกเข้า Pack" : "💾 บันทึกเข้า Marketing Assets"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
