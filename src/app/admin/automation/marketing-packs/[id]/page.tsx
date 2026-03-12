"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import MarketingAssetsSection from "@/components/admin/MarketingAssetsSection";
import { useLocale } from "@/context/LocaleContext";

function AutoTextarea({ value, onChange, className, minHeight = 72 }: { value: string; onChange: (v: string) => void; className?: string; minHeight?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, minHeight) + "px";
  }, [minHeight]);
  useEffect(() => { resize(); }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange(e.target.value); resize(); }}
      className={className}
      style={{ resize: "none", overflow: "hidden", minHeight }}
      rows={1}
    />
  );
}

const AR_OPTIONS = [
  { label: "1:1 Feed", ar: "1:1" },
  { label: "4:5 Portrait", ar: "4:5" },
  { label: "9:16 Story/TikTok", ar: "9:16" },
] as const;

function VideoConceptCard({ item, onConceptChange }: { item: { angle: string; concept: string }; onConceptChange?: (concept: string) => void }) {
  const [edited, setEdited] = useState(item.concept);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(edited).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="text-[10px] text-pink-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
      <AutoTextarea
        value={edited}
        onChange={(v) => { setEdited(v); onConceptChange?.(v); }}
        className="w-full text-xs text-stone-700 leading-relaxed font-sans bg-white border border-stone-200 rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-1 focus:ring-pink-300"
        minHeight={56}
      />
      <div className="flex justify-end">
        <button onClick={copy}
          className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "text-stone-400 hover:text-pink-500 hover:bg-pink-50"}`}>
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function ImagePromptCard({
  item,
  productImages,
  productId,
  marketingPackId,
  onPromptChange,
  onSaveSuccess,
}: {
  item: { angle: string; prompt: string };
  productImages?: string[];
  productId?: string;
  marketingPackId?: string;
  onPromptChange?: (prompt: string) => void;
  onSaveSuccess?: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedAr, setSelectedAr] = useState<string>("1:1");
  const [error, setError] = useState<string | null>(null);
  const [selectedRefImages, setSelectedRefImages] = useState<string[]>([]);
  const toggleRefImage = (img: string) =>
    setSelectedRefImages((prev) => prev.includes(img) ? prev.filter((x) => x !== img) : [...prev, img]);
  const [editedPrompt, setEditedPrompt] = useState(item.prompt);

  const copyWithAr = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const generateImage = async () => {
    setGenerating(true);
    setGeneratedUrl(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/automation/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: editedPrompt, aspectRatio: selectedAr, imageUrls: selectedRefImages }),
      });
      const data = await res.json();
      if (data.success) setGeneratedUrl(data.url);
      else setError(data.error ?? "Generation failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setGenerating(false);
    }
  };

  const saveToMarketingAsset = async () => {
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
          prompt: editedPrompt,
          angle: item.angle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("บันทึกไป Marketing Asset แล้ว");
        onSaveSuccess?.();
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
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="text-[10px] text-purple-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
      <AutoTextarea
        value={editedPrompt}
        onChange={(v) => { setEditedPrompt(v); onPromptChange?.(v); }}
        className="w-full text-xs text-stone-700 leading-relaxed font-mono bg-white border border-stone-200 rounded-lg px-3 py-2 mb-3 focus:outline-none focus:ring-1 focus:ring-purple-300"
        minHeight={72}
      />

      {/* Reference image picker for img2img */}
      {productImages && productImages.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-stone-400 mb-1.5">
            Reference images:{" "}
            {selectedRefImages.length > 0
              ? <span className="text-teal-500 font-medium">{selectedRefImages.length} รูป selected ✓</span>
              : <span className="text-stone-300">none — click to use Kontext</span>}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {productImages.slice(0, 8).map((img, i) => (
              <button key={i} type="button"
                onClick={() => toggleRefImage(img)}
                className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors shrink-0 ${selectedRefImages.includes(img) ? "border-teal-400 ring-1 ring-teal-300" : "border-stone-200 hover:border-stone-400"}`}>
                <img src={img} alt="" className="w-full h-full object-cover" />
                {selectedRefImages.includes(img) && (
                  <div className="absolute inset-0 bg-teal-500/30 flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-stone-400 mr-1">Copy --ar:</span>
        {AR_OPTIONS.map(({ label, ar }) => (
          <button key={ar} type="button" onClick={() => copyWithAr(`${editedPrompt} --ar ${ar}`, ar)}
            className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors font-medium ${copied === ar ? "bg-green-100 text-green-600" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}>
            {copied === ar ? "Copied!" : label}
          </button>
        ))}
        <button type="button" onClick={() => copyWithAr(editedPrompt, "base")}
          className={`text-[10px] px-2.5 py-1 rounded-lg transition-colors ${copied === "base" ? "bg-green-100 text-green-600" : "bg-stone-200 text-stone-500 hover:bg-stone-300"}`}>
          {copied === "base" ? "Copied!" : "Base"}
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <select value={selectedAr} onChange={(e) => setSelectedAr(e.target.value)}
            className="text-[10px] border border-stone-200 rounded-lg px-1.5 py-1 bg-white text-stone-600 focus:outline-none focus:ring-1 focus:ring-purple-300">
            {AR_OPTIONS.map(({ label, ar }) => (
              <option key={ar} value={ar}>{label}</option>
            ))}
          </select>
          <button type="button" onClick={generateImage} disabled={generating}
            className="text-[10px] px-3 py-1 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:bg-stone-300 text-white font-medium transition-colors flex items-center gap-1">
            {generating ? (
              <><span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : "Generate Image"}
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-500 mt-2">{error}</p>}
      {generatedUrl && (
        <div className="mt-3 relative">
          <img src={generatedUrl} alt={item.angle} className="w-full rounded-xl object-cover" />
          <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
            <a href={generatedUrl} download target="_blank" rel="noopener noreferrer"
              className="text-[10px] bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg transition-colors">
              Download
            </a>
            {productId && (
              <button
                type="button"
                onClick={saveToMarketingAsset}
                disabled={saving}
                className="text-[10px] bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg transition-colors"
              >
                {saving ? "กำลังบันทึก..." : "Save to Marketing Asset"}
              </button>
            )}
          </div>
          <button type="button" onClick={generateImage}
            className="absolute top-2 left-2 text-[10px] bg-black/60 hover:bg-black/80 text-white px-2.5 py-1 rounded-lg transition-colors">
            Regenerate
          </button>
        </div>
      )}
    </div>
  );
}

interface AdAngle {
  angle: string;
  headline: string;
  body: string;
}

interface Pack {
  id: string;
  productId: string;
  productName: string;
  lang: string;
  hooks: string[];
  captionFacebook: string | null;
  captionInstagram: string | null;
  captionLine: string | null;
  adAngles: AdAngle[];
  ugcScript: string;
  thumbnailTexts: string[];
  imageAdPrompts: { angle: string; prompt: string }[] | null;
  videoAdPrompts: { angle: string; concept: string }[] | null;
  rawHooks: string | null;
  rawCaptions: string | null;
  rawAngles: string | null;
  rawUgc: string | null;
  rawThumbnails: string | null;
  rawImagePrompts: string | null;
  rawVideoPrompts: string | null;
  createdAt: string;
  product: {
    name: string;
    name_th: string | null;
    images: string[];
    videos?: string[];
    mediaOrder?: string[];
    price: number;
    normalPrice?: number | null;
    stock?: number;
    active?: boolean;
    featured?: boolean;
    source?: string | null;
    shortDescription?: string | null;
    shortDescription_th?: string | null;
    description?: string | null;
    description_th?: string | null;
    category: { name: string } | null;
    petType?: { name: string } | null;
    tags?: { id: string; name: string }[];
    variants?: { id: string; sku: string | null; size: string | null; color: string | null; price: number; stock: number; variantImage: string | null; cjVid: string | null }[];
  };
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-[11px] text-stone-400 hover:text-orange-500 transition-colors px-2 py-1 rounded-lg hover:bg-orange-50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function RawToggle({ raw }: { label: string; raw: string | null }) {
  const [open, setOpen] = useState(false);
  if (!raw) return null;
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[10px] text-stone-400 hover:text-blue-500 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
      >
        {open ? "Hide raw" : "Raw"}
      </button>
      {open && (
        <pre className="mt-2 text-[11px] text-stone-500 font-mono bg-stone-50 border border-stone-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
          {raw}
        </pre>
      )}
    </div>
  );
}

export default function MarketingPackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { t } = useLocale();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [versionInfo, setVersionInfo] = useState<{ ver: number; total: number } | null>(null);
  const [editedHooks, setEditedHooks] = useState<string[]>([]);
  const [editedCaptionFacebook, setEditedCaptionFacebook] = useState("");
  const [editedCaptionInstagram, setEditedCaptionInstagram] = useState("");
  const [editedCaptionLine, setEditedCaptionLine] = useState("");
  const [editedAdAngles, setEditedAdAngles] = useState<AdAngle[]>([]);
  const [editedUgcScript, setEditedUgcScript] = useState("");
  const [editedThumbnailTexts, setEditedThumbnailTexts] = useState<string[]>([]);
  const [editedImagePrompts, setEditedImagePrompts] = useState<{ angle: string; prompt: string }[]>([]);
  const [editedVideoPrompts, setEditedVideoPrompts] = useState<{ angle: string; concept: string }[]>([]);
  const [packAssetsRefreshKey, setPackAssetsRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/automation/marketing-packs/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPack(d.data);
          setEditedHooks(Array.isArray(d.data.hooks) ? d.data.hooks : []);
          setEditedCaptionFacebook(d.data.captionFacebook ?? "");
          setEditedCaptionInstagram(d.data.captionInstagram ?? "");
          setEditedCaptionLine(d.data.captionLine ?? "");
          setEditedAdAngles(Array.isArray(d.data.adAngles) ? d.data.adAngles : []);
          setEditedUgcScript(d.data.ugcScript ?? "");
          setEditedThumbnailTexts(Array.isArray(d.data.thumbnailTexts) ? d.data.thumbnailTexts : []);
          if (Array.isArray(d.data.imageAdPrompts)) setEditedImagePrompts(d.data.imageAdPrompts);
          if (Array.isArray(d.data.videoAdPrompts)) setEditedVideoPrompts(d.data.videoAdPrompts);
          // Fetch version info
          fetch(`/api/admin/automation/marketing-packs?productId=${d.data.productId}`)
            .then((r) => r.json())
            .then((v) => {
              if (v.success) {
                const sorted = [...v.data].sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                const idx = sorted.findIndex((p: { id: string }) => p.id === id);
                setVersionInfo({ ver: idx + 1, total: sorted.length });
              }
            });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/automation/marketing-packs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hooks: editedHooks,
          captionFacebook: editedCaptionFacebook,
          captionInstagram: editedCaptionInstagram,
          captionLine: editedCaptionLine,
          adAngles: editedAdAngles,
          ugcScript: editedUgcScript,
          thumbnailTexts: editedThumbnailTexts,
          imageAdPrompts: editedImagePrompts,
          videoAdPrompts: editedVideoPrompts,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("บันทึกแล้ว");
      else toast.error(data.error ?? "บันทึกไม่สำเร็จ");
    } catch {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("ลบ Marketing Pack นี้?")) return;
    setDeleting(true);
    await fetch(`/api/admin/automation/marketing-packs/${id}`, { method: "DELETE" });
    toast.success("ลบแล้ว");
    router.push("/admin/automation/marketing-packs");
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied!");
  };

  if (loading) return <div className="text-center py-20 text-stone-400 text-sm">กำลังโหลด...</div>;
  if (!pack) return <div className="text-center py-20 text-stone-400 text-sm">ไม่พบ Pack</div>;

  const date = new Date(pack.createdAt).toLocaleDateString("th-TH", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin/automation/marketing-packs")}
            className="text-xs text-stone-400 hover:text-orange-500 transition-colors mb-2 flex items-center gap-1"
          >
            ← Marketing Packs
          </button>
          <h1 className="text-2xl font-bold text-stone-800">{t("marketingPack", "adminPages")}</h1>
          <p className="text-sm text-stone-500 mt-1">
            {pack.productName}
            {pack.product.name_th && pack.product.name_th !== pack.productName && ` · ${pack.product.name_th}`}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pack.lang === "en" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
              {pack.lang}
            </span>
            {versionInfo && versionInfo.total > 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                v{versionInfo.ver}/{versionInfo.total}
              </span>
            )}
            <span className="text-xs text-stone-400">{date}</span>
            <span className="text-[10px] text-stone-400 font-mono">#{pack.id.slice(0, 8)}</span>
            <a href={`/admin/products/${pack.productId}`} onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-stone-300 font-mono hover:text-orange-500 transition-colors">pid:{pack.productId.slice(0, 8)}</a>
          </div>
        </div>
        <div className="flex items-start gap-2 shrink-0 pt-8">
          <button
            onClick={() => {
              const all = [
                `# ${pack.productName}`,
                ``,
                `## Marketing Hooks`,
                editedHooks.map((h, i) => `${i + 1}. ${h}`).join("\n"),
                ``,
                `## Social Media Captions`,
                editedCaptionFacebook ? `### Facebook\n${editedCaptionFacebook}` : "",
                ``,
                editedCaptionInstagram ? `### Instagram\n${editedCaptionInstagram}` : "",
                ``,
                editedCaptionLine ? `### LINE\n${editedCaptionLine}` : "",
                ``,
                `## Ad Angles`,
                editedAdAngles.map((a) => `### ${a.angle}\n**${a.headline}**\n${a.body}`).join("\n\n"),
                ``,
                `## UGC Video Script`,
                editedUgcScript,
                ``,
                `## Thumbnail Text`,
                editedThumbnailTexts.map((t, i) => `${i + 1}. ${t}`).join("\n"),
                ``,
                `---`,
                ``,
                `## Platform Ready`,
                `### Shopee\n${[
                  pack.lang === "th" ? (pack.product?.name_th || pack.product?.name || pack.productName) : (pack.product?.name || pack.productName),
                  "",
                  ...editedHooks.slice(0, 3).map((h) => `✅ ${h}`),
                  "",
                  editedCaptionFacebook || editedAdAngles[0]?.body || "",
                  "",
                  "📦 จัดส่งรวดเร็ว | ✅ สินค้าคุณภาพ | 💬 ติดต่อได้เลย",
                ].join("\n").trim()}`,
                ``,
                `### TikTok Shop\n${[
                  editedHooks[0] ? `${editedHooks[0]} ⬅ ดูต่อเลย!` : "",
                  "",
                  editedCaptionInstagram,
                  "",
                  "#tiktokshop #สัตว์เลี้ยง #petshop #ของดี",
                ].join("\n").trim()}`,
                ``,
                `### Facebook\n${[editedCaptionFacebook, "", "👇 กดสั่งซื้อ หรือทักมาถามได้เลย!"].join("\n").trim()}`,
                ``,
                `### LINE\n${[editedCaptionLine, "", "📞 ทักมาสั่งได้เลยนะคะ/ครับ 😊"].join("\n").trim()}`,
              ].filter((l) => l !== undefined).join("\n");
              copy(all);
            }}
            className="text-xs text-orange-500 hover:text-orange-600 border border-orange-200 hover:border-orange-400 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors"
          >
            Copy All
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs text-teal-600 hover:text-teal-700 border border-teal-200 hover:border-teal-400 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            {saving ? "กำลังบันทึก..." : "Save"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-xl transition-colors"
          >
            {deleting ? "กำลังลบ..." : "ลบ Pack"}
          </button>
        </div>
      </div>

      {/* Product Card */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-stone-50 border-b border-stone-100">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Product</span>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pack.lang === "en" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>{pack.lang}</span>
            <span className="text-xs text-stone-400">{date}</span>
          </div>
        </div>
        <div className="p-5 flex gap-6">
          {pack.product.images?.length > 0 && (
            <div className="shrink-0 flex flex-col gap-2 w-48">
              <div className="relative w-48 h-48 rounded-xl overflow-hidden bg-stone-100 border border-stone-100">
                <img src={activeImg ?? pack.product.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
              {pack.product.images.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {pack.product.images.slice(0, 8).map((img, i) => (
                    <button key={i} type="button" onClick={() => setActiveImg(img)}
                      className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${(activeImg ?? pack.product.images[0]) === img ? "border-orange-400" : "border-transparent"}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <h2 className="text-base font-bold text-stone-800 leading-snug">
                {pack.lang === "th" ? (pack.product.name_th || pack.product.name) : pack.product.name}
              </h2>
              {pack.lang === "th"
                ? pack.product.name && pack.product.name_th && <p className="text-sm text-stone-400 mt-0.5">{pack.product.name}</p>
                : pack.product.name_th && <p className="text-sm text-stone-400 mt-0.5">{pack.product.name_th}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <span className="text-lg font-bold text-orange-600">฿{pack.product.price?.toLocaleString()}</span>
                {pack.product.normalPrice && pack.product.normalPrice > pack.product.price && (
                  <span className="ml-2 text-sm text-stone-400 line-through">฿{pack.product.normalPrice.toLocaleString()}</span>
                )}
              </div>
              {pack.product.stock !== undefined && (
                <span className="text-xs text-stone-400 border border-stone-200 rounded-lg px-2 py-0.5">Stock: {pack.product.stock}</span>
              )}
              {pack.product.active === false && <span className="text-xs bg-red-100 text-red-500 rounded-lg px-2 py-0.5">Inactive</span>}
              {pack.product.featured && <span className="text-xs bg-amber-100 text-amber-600 rounded-lg px-2 py-0.5">Featured</span>}
              {pack.product.source === "CJ" && <span className="text-xs bg-blue-100 text-blue-600 rounded-lg px-2 py-0.5">CJ</span>}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-stone-500">
              {pack.product.category && <span className="bg-stone-100 rounded-lg px-2.5 py-1">{pack.product.category.name}</span>}
              {pack.product.petType && <span className="bg-stone-100 rounded-lg px-2.5 py-1">{pack.product.petType.name}</span>}
              {pack.product.tags?.map((t) => <span key={t.id} className="bg-orange-50 text-orange-500 rounded-lg px-2.5 py-1">{t.name}</span>)}
            </div>
            {(() => {
              const sd = pack.lang === "th" ? (pack.product.shortDescription_th || pack.product.shortDescription) : (pack.product.shortDescription || pack.product.shortDescription_th);
              return sd ? <div className="text-sm text-stone-600 bg-stone-50 rounded-xl px-4 py-3">{sd}</div> : null;
            })()}
            {pack.product.variants && pack.product.variants.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Variants ({pack.product.variants.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {pack.product.variants.slice(0, 12).map((v) => {
                    const label = [v.size, v.color].filter(Boolean).join(" / ") || v.sku || v.id.slice(0, 6);
                    const isActive = v.variantImage && activeImg === v.variantImage;
                    return v.variantImage ? (
                      <button key={v.id} type="button" onClick={() => setActiveImg(v.variantImage!)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${isActive ? "bg-orange-100 text-orange-600 ring-1 ring-orange-400" : "bg-stone-100 text-stone-600 hover:bg-orange-50 hover:text-orange-500"}`}>
                        {label} <span className={isActive ? "text-orange-400" : "text-stone-400"}>฿{v.price?.toLocaleString()} · {v.stock}</span>
                      </button>
                    ) : (
                      <span key={v.id} className="text-[11px] bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg">
                        {label} <span className="text-stone-400">฿{v.price?.toLocaleString()} · {v.stock}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 1. Marketing Hooks */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-stone-800 text-sm">Marketing Hooks</h2>
          <div className="flex items-center gap-1">
            <RawToggle label="hooks" raw={pack.rawHooks} />
            <CopyBtn text={editedHooks.join("\n\n")} />
          </div>
        </div>
        <div className="space-y-2">
          {editedHooks.map((hook, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-stone-400 mt-2.5 shrink-0">{i + 1}.</span>
              <AutoTextarea
                value={hook}
                onChange={(v) => setEditedHooks((prev) => prev.map((h, idx) => idx === i ? v : h))}
                className="flex-1 text-sm text-stone-700 bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-stone-300"
                minHeight={72}
              />
              <button onClick={() => copy(hook)} className="text-[10px] text-stone-400 hover:text-orange-500 transition-all shrink-0 mt-2.5">Copy</button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Social Media Captions */}
      {(editedCaptionFacebook || editedCaptionInstagram || editedCaptionLine) && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-stone-800 text-sm">Social Media Captions</h2>
            <div className="flex items-center gap-1">
              <RawToggle label="captions" raw={pack.rawCaptions} />
              <CopyBtn text={[editedCaptionFacebook, editedCaptionInstagram, editedCaptionLine].filter(Boolean).join("\n\n---\n\n")} />
            </div>
          </div>
          <div className="space-y-4">
            {editedCaptionFacebook && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">Facebook</span>
                  <CopyBtn text={editedCaptionFacebook} />
                </div>
                <AutoTextarea
                  value={editedCaptionFacebook}
                  onChange={setEditedCaptionFacebook}
                  className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-300 leading-relaxed"
                  minHeight={72}
                />
              </div>
            )}
            {editedCaptionInstagram && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full">Instagram</span>
                  <CopyBtn text={editedCaptionInstagram} />
                </div>
                <AutoTextarea
                  value={editedCaptionInstagram}
                  onChange={setEditedCaptionInstagram}
                  className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-pink-300 leading-relaxed"
                  minHeight={72}
                />
              </div>
            )}
            {editedCaptionLine && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">LINE</span>
                  <CopyBtn text={editedCaptionLine} />
                </div>
                <AutoTextarea
                  value={editedCaptionLine}
                  onChange={setEditedCaptionLine}
                  className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-green-300 leading-relaxed"
                  minHeight={72}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Ad Angles */}
      {editedAdAngles.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Ad Angles</h2>
            <div className="flex items-center gap-1">
              <RawToggle label="angles" raw={pack.rawAngles} />
              <CopyBtn text={editedAdAngles.map((a) => `[${a.angle}]\n${a.headline}\n${a.body}`).join("\n\n")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editedAdAngles.map((angle, i) => (
              <div key={i} className="bg-stone-50 rounded-xl p-4 space-y-1.5">
                <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">{angle.angle}</div>
                <input
                  value={angle.headline}
                  onChange={(e) => setEditedAdAngles((prev) => prev.map((a, idx) => idx === i ? { ...a, headline: e.target.value } : a))}
                  className="w-full text-sm font-bold text-stone-800 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                />
                <AutoTextarea
                  value={angle.body}
                  onChange={(v) => setEditedAdAngles((prev) => prev.map((a, idx) => idx === i ? { ...a, body: v } : a))}
                  className="w-full text-xs text-stone-600 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-300"
                  minHeight={72}
                />
                <div className="flex justify-end">
                  <CopyBtn text={`${angle.headline}\n${angle.body}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. UGC Video Script */}
      {editedUgcScript && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">UGC Video Script</h2>
            <CopyBtn text={editedUgcScript} />
          </div>
          <AutoTextarea
            value={editedUgcScript}
            onChange={setEditedUgcScript}
            className="w-full text-sm text-stone-700 font-sans bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-stone-300 leading-relaxed"
            minHeight={72}
          />
        </div>
      )}

      {/* 5. Thumbnail Texts */}
      {editedThumbnailTexts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Thumbnail Text</h2>
            <div className="flex items-center gap-1">
              <RawToggle label="thumbnails" raw={pack.rawThumbnails} />
              <CopyBtn text={editedThumbnailTexts.join("\n")} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editedThumbnailTexts.map((text, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  value={text}
                  onChange={(e) => setEditedThumbnailTexts((prev) => prev.map((t, idx) => idx === i ? e.target.value : t))}
                  className="text-sm text-stone-700 bg-stone-100 border border-transparent focus:border-stone-300 focus:bg-white px-4 py-2 rounded-xl font-medium focus:outline-none transition-colors"
                />
                <button onClick={() => copy(text)} className="text-[10px] text-stone-400 hover:text-orange-500 px-1.5">Copy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Image Ad Prompts */}
      {pack.imageAdPrompts && pack.imageAdPrompts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-stone-800 text-sm">Image Ad Prompts</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">ใช้กับ Midjourney / DALL-E / Flux</p>
            </div>
            <div className="flex items-center gap-1">
              <RawToggle label="imagePrompts" raw={pack.rawImagePrompts} />
              <CopyBtn text={pack.imageAdPrompts.map((p) => `[${p.angle}]\n${p.prompt}`).join("\n\n")} />
            </div>
          </div>
          <div className="space-y-3">
            {pack.imageAdPrompts.map((item, i) => (
              <ImagePromptCard
                key={i}
                item={item}
                productImages={pack.product?.images ?? []}
                productId={pack.productId}
                marketingPackId={pack.id}
                onPromptChange={(prompt) => setEditedImagePrompts((prev) => prev.map((p, idx) => idx === i ? { ...p, prompt } : p))}
                onSaveSuccess={() => setPackAssetsRefreshKey((k) => k + 1)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 6b. Assets from this Pack */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-stone-800 text-sm">Assets จาก Pack นี้</h2>
          <Link
            href={`/admin/products/${pack.productId}/view`}
            className="text-[11px] text-teal-600 hover:text-teal-700"
          >
            ดูทั้งหมดใน Product →
          </Link>
        </div>
        <MarketingAssetsSection
          marketingPackId={pack.id}
          productId={pack.productId}
          productImages={pack.product?.images ?? []}
          productVideos={pack.product?.videos ?? []}
          productMediaOrder={pack.product?.mediaOrder}
          productName={pack.lang === "th" ? (pack.product?.name_th || pack.product?.name || pack.productName) : (pack.product?.name || pack.productName)}
          productContext={pack.product ? {
            name: pack.product.name,
            name_th: pack.product.name_th ?? undefined,
            price: pack.product.price,
            normalPrice: pack.product.normalPrice ?? undefined,
            shortDescription: (pack.lang === "th" ? pack.product.shortDescription_th : pack.product.shortDescription) ?? pack.product.shortDescription ?? pack.product.shortDescription_th ?? undefined,
          } : undefined}
          hideUpload
          refreshKey={packAssetsRefreshKey}
        />
      </div>

      {/* 7. Short Video Ad Concepts */}
      {pack.videoAdPrompts && pack.videoAdPrompts.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-stone-800 text-sm">Short Video Ad Concepts</h2>
              <p className="text-[11px] text-stone-400 mt-0.5">ใช้กับ Sora / Runway / TikTok / Reels</p>
            </div>
            <div className="flex items-center gap-1">
              <RawToggle label="videoPrompts" raw={pack.rawVideoPrompts} />
              <CopyBtn text={pack.videoAdPrompts.map((p) => `[${p.angle}]\n${p.concept}`).join("\n\n")} />
            </div>
          </div>
          <div className="space-y-3">
            {pack.videoAdPrompts.map((item, i) => (
              <VideoConceptCard key={i} item={item}
                onConceptChange={(concept) => setEditedVideoPrompts((prev) => prev.map((p, idx) => idx === i ? { ...p, concept } : p))} />
            ))}
          </div>
        </div>
      )}

      {/* 8. Platform Ready */}
      <PlatformReadySection
        productName={pack.lang === "th" ? (pack.product?.name_th || pack.product?.name || pack.productName) : (pack.product?.name || pack.productName)}
        hooks={editedHooks}
        captionFacebook={editedCaptionFacebook}
        captionInstagram={editedCaptionInstagram}
        captionLine={editedCaptionLine}
        adAngles={editedAdAngles}
      />

    </div>
  );
}

function PlatformReadySection({
  productName,
  hooks,
  captionFacebook,
  captionInstagram,
  captionLine,
  adAngles,
}: {
  productName: string;
  hooks: string[];
  captionFacebook: string;
  captionInstagram: string;
  captionLine: string;
  adAngles: AdAngle[];
}) {
  const shopeeContent = [
    productName,
    "",
    ...(hooks.slice(0, 3).map((h) => `✅ ${h}`)),
    "",
    captionFacebook || (adAngles[0]?.body ?? ""),
    "",
    "📦 จัดส่งรวดเร็ว | ✅ สินค้าคุณภาพ | 💬 ติดต่อได้เลย",
  ].join("\n").trim();

  const tiktokContent = [
    hooks[0] ? `${hooks[0]} ⬅ ดูต่อเลย!` : "",
    "",
    captionInstagram,
    "",
    "#tiktokshop #สัตว์เลี้ยง #petshop #ของดี",
  ].join("\n").trim();

  const facebookContent = [
    captionFacebook,
    "",
    "👇 กดสั่งซื้อ หรือทักมาถามได้เลย!",
  ].join("\n").trim();

  const lineContent = [
    captionLine,
    "",
    "📞 ทักมาสั่งได้เลยนะคะ/ครับ 😊",
  ].join("\n").trim();

  const platforms = [
    { key: "shopee", label: "Shopee", icon: "🛒", content: shopeeContent },
    { key: "tiktok", label: "TikTok Shop", icon: "🎵", content: tiktokContent },
    { key: "facebook", label: "Facebook", icon: "📘", content: facebookContent },
    { key: "line", label: "LINE", icon: "💬", content: lineContent },
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5">
      <div className="mb-4">
        <h2 className="font-bold text-stone-800 text-sm">Platform Ready</h2>
        <p className="text-[11px] text-stone-400 mt-0.5">Content ที่ format สำหรับแต่ละแพลตฟอร์ม — แก้ไขได้ก่อน copy</p>
      </div>
      <div className="space-y-4">
        {platforms.map((p) => (
          <PlatformCard key={p.key} label={p.label} icon={p.icon} initialContent={p.content} />
        ))}
      </div>
    </div>
  );
}

function PlatformCard({ label, icon, initialContent }: { label: string; icon: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="bg-stone-50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-semibold text-stone-700">{label}</span>
        </div>
        <button
          onClick={copy}
          className={`text-[11px] px-2.5 py-1 rounded-lg transition-colors ${copied ? "bg-green-100 text-green-600" : "text-stone-400 hover:text-orange-500 hover:bg-orange-50"}`}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <AutoTextarea
        value={content}
        onChange={setContent}
        className="w-full text-sm text-stone-700 leading-relaxed font-sans bg-white border border-stone-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-orange-300"
        minHeight={72}
      />
    </div>
  );
}
