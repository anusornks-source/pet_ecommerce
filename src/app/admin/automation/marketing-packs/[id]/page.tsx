"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

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
    price: number;
    category: { name: string } | null;
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

function RawToggle({ label, raw }: { label: string; raw: string | null }) {
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
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [captionTab, setCaptionTab] = useState<"facebook" | "instagram" | "line">("facebook");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/automation/marketing-packs/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setPack(d.data); })
      .finally(() => setLoading(false));
  }, [id]);

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

  const captionText = pack.captionFacebook && pack.captionInstagram && pack.captionLine
    ? { facebook: pack.captionFacebook, instagram: pack.captionInstagram, line: pack.captionLine }
    : null;

  const adAngles: AdAngle[] = Array.isArray(pack.adAngles) ? pack.adAngles : [];

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
          <h1 className="text-xl font-bold text-stone-800">{pack.productName}</h1>
          {pack.product.name_th && pack.product.name_th !== pack.productName && (
            <p className="text-sm text-stone-500">{pack.product.name_th}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${pack.lang === "en" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
              {pack.lang}
            </span>
            <span className="text-xs text-stone-400">{date}</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-xl transition-colors shrink-0"
        >
          {deleting ? "กำลังลบ..." : "ลบ Pack"}
        </button>
      </div>

      {/* 1. Marketing Hooks */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-stone-800 text-sm">Marketing Hooks</h2>
          <div className="flex items-center gap-1">
            <RawToggle label="hooks" raw={pack.rawHooks} />
            <CopyBtn text={pack.hooks.join("\n\n")} />
          </div>
        </div>
        <div className="space-y-2">
          {pack.hooks.map((hook, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <span className="text-xs text-stone-400 mt-0.5 shrink-0">{i + 1}.</span>
              <p className="text-sm text-stone-700 flex-1">{hook}</p>
              <button onClick={() => copy(hook)} className="opacity-0 group-hover:opacity-100 text-[10px] text-stone-400 hover:text-orange-500 transition-all shrink-0">Copy</button>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Social Media Captions */}
      {captionText && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Social Media Captions</h2>
            <RawToggle label="captions" raw={pack.rawCaptions} />
          </div>
          <div className="flex gap-1 bg-stone-100 rounded-xl p-1 mb-3 w-fit">
            {(["facebook", "instagram", "line"] as const).map((platform) => (
              <button key={platform} onClick={() => setCaptionTab(platform)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${captionTab === platform ? "bg-white text-orange-600 shadow-sm" : "text-stone-500"}`}>
                {platform === "line" ? "LINE" : platform.charAt(0).toUpperCase() + platform.slice(1)}
              </button>
            ))}
          </div>
          <div className="relative">
            <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans bg-stone-50 rounded-xl p-4">
              {captionText[captionTab]}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyBtn text={captionText[captionTab]} />
            </div>
          </div>
        </div>
      )}

      {/* 3. Ad Angles */}
      {adAngles.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Ad Angles</h2>
            <div className="flex items-center gap-1">
              <RawToggle label="angles" raw={pack.rawAngles} />
              <CopyBtn text={adAngles.map((a) => `[${a.angle}]\n${a.headline}\n${a.body}`).join("\n\n")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adAngles.map((angle, i) => (
              <div key={i} className="bg-stone-50 rounded-xl p-4 group relative">
                <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wide mb-1">{angle.angle}</div>
                <h3 className="text-sm font-bold text-stone-800 mb-1">{angle.headline}</h3>
                <p className="text-xs text-stone-600">{angle.body}</p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyBtn text={`${angle.headline}\n${angle.body}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. UGC Video Script */}
      {pack.ugcScript && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">UGC Video Script</h2>
            <CopyBtn text={pack.ugcScript} />
          </div>
          <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans bg-stone-50 rounded-xl p-4 leading-relaxed">
            {pack.ugcScript}
          </pre>
        </div>
      )}

      {/* 5. Thumbnail Texts */}
      {pack.thumbnailTexts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-stone-800 text-sm">Thumbnail Text</h2>
            <div className="flex items-center gap-1">
              <RawToggle label="thumbnails" raw={pack.rawThumbnails} />
              <CopyBtn text={pack.thumbnailTexts.join("\n")} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pack.thumbnailTexts.map((text, i) => (
              <button key={i} onClick={() => copy(text)}
                className="bg-stone-100 hover:bg-orange-50 hover:text-orange-600 text-stone-700 text-sm px-4 py-2 rounded-xl font-medium transition-colors">
                {text}
              </button>
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
              <div key={i} className="bg-stone-50 rounded-xl p-4">
                <div className="text-[10px] text-purple-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
                <p className="text-xs text-stone-700 leading-relaxed font-mono mb-3">{item.prompt}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-stone-400 mr-1">Copy with --ar:</span>
                  {([{ label: "1:1 Feed", ar: "1:1" }, { label: "4:5 Portrait", ar: "4:5" }, { label: "9:16 Story/TikTok", ar: "9:16" }] as const).map(({ label, ar }) => (
                    <button key={ar} onClick={() => { navigator.clipboard.writeText(`${item.prompt} --ar ${ar}`); }}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors font-medium">
                      {label}
                    </button>
                  ))}
                  <button onClick={() => { navigator.clipboard.writeText(item.prompt); }}
                    className="text-[10px] px-2.5 py-1 rounded-lg bg-stone-200 text-stone-500 hover:bg-stone-300 transition-colors ml-auto">
                    Base prompt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div key={i} className="bg-stone-50 rounded-xl p-4 group relative">
                <div className="text-[10px] text-pink-500 font-bold uppercase tracking-wide mb-2">{item.angle}</div>
                <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">{item.concept}</p>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyBtn text={item.concept} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy All */}
      <div className="flex items-center justify-center pb-4">
        <button
          onClick={() => {
            const all = [
              `# ${pack.productName}`,
              ``,
              `## Marketing Hooks`,
              pack.hooks.map((h, i) => `${i + 1}. ${h}`).join("\n"),
              ``,
              `## Social Media Captions`,
              pack.captionFacebook ? `### Facebook\n${pack.captionFacebook}` : "",
              ``,
              pack.captionInstagram ? `### Instagram\n${pack.captionInstagram}` : "",
              ``,
              pack.captionLine ? `### LINE\n${pack.captionLine}` : "",
              ``,
              `## Ad Angles`,
              adAngles.map((a) => `### ${a.angle}\n**${a.headline}**\n${a.body}`).join("\n\n"),
              ``,
              `## UGC Video Script`,
              pack.ugcScript,
              ``,
              `## Thumbnail Text`,
              pack.thumbnailTexts.map((t, i) => `${i + 1}. ${t}`).join("\n"),
            ].filter((l) => l !== undefined).join("\n");
            copy(all);
          }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 py-2 rounded-xl font-medium transition-colors"
        >
          Copy All
        </button>
      </div>
    </div>
  );
}
