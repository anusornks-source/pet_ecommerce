"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { toPng } from "html-to-image";

type Lang = "th" | "en";

export type AdImageDesignerProduct = {
  id: string;
  name: string | null;
  name_th?: string | null;
  shortDescription?: string | null;
  shortDescription_th?: string | null;
  price?: number | null;
  images: string[];
  shopLogoUrl?: string | null;
};

type Aspect = "1:1" | "4:5" | "9:16";

export type AdImageDesignerContext = {
  marketingPackId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  product: AdImageDesignerProduct;
  context?: AdImageDesignerContext;
  onSaved?: () => void;
};

type AiField = "ad_title" | "ad_subtitle" | "ad_badge";

export const AdImageDesignerModal: React.FC<Props> = ({ open, onClose, product, context, onSaved }) => {
  const [lang, setLang] = useState<Lang>("th");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [bgPreset, setBgPreset] = useState<"brand" | "pink" | "blue" | "green" | "white" | "dark">("brand");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badge, setBadge] = useState("");
  const [ctaText, setCtaText] = useState("สั่งซื้อเลย");
  const [showLogo, setShowLogo] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [loadingField, setLoadingField] = useState<AiField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<"split" | "overlay">("split");
  const [textColor, setTextColor] = useState<"light" | "dark">("light");
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);

  const images = product.images?.filter((u) => !!u && u.trim().length > 0) ?? [];

  const primaryImage = useMemo(() => {
    if (activeImage) return activeImage;
    if (images.length > 0) return images[0]!;
    return null;
  }, [activeImage, images]);

  const displayName = useMemo(() => {
    if (lang === "th") {
      return product.name_th || product.name || "";
    }
    return product.name || product.name_th || "";
  }, [lang, product.name, product.name_th]);

  const [eyebrowCustom, setEyebrowCustom] = useState<string>("");

  const defaultEyebrow = useMemo(
    () => (lang === "th" ? "ดีลพิเศษสำหรับสัตว์เลี้ยง" : "Special deal for pets"),
    [lang]
  );

  const eyebrowText = useMemo(
    () => (eyebrowCustom.trim().length > 0 ? eyebrowCustom : defaultEyebrow),
    [defaultEyebrow, eyebrowCustom]
  );

  const defaultSubtitle = useMemo(() => {
    if (lang === "th") {
      return product.shortDescription_th || product.shortDescription || "";
    }
    return product.shortDescription || product.shortDescription_th || "";
  }, [lang, product.shortDescription, product.shortDescription_th]);

  const priceText = useMemo(() => {
    if (!product.price || product.price <= 0) return "";
    const formatted = new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(product.price);
    return `฿${formatted}`;
  }, [product.price]);

  const aspectClass = useMemo(() => {
    switch (aspect) {
      case "4:5":
        return "aspect-[4/5]";
      case "9:16":
        return "aspect-[9/16]";
      default:
        return "aspect-square";
    }
  }, [aspect]);

  const bgClass = useMemo(() => {
    switch (bgPreset) {
      case "brand":
        return "bg-linear-to-br from-orange-500 via-orange-400 to-amber-300";
      case "pink":
        return "bg-linear-to-br from-fuchsia-500 via-pink-500 to-rose-400";
      case "blue":
        return "bg-linear-to-br from-sky-500 via-blue-500 to-indigo-500";
      case "green":
        return "bg-linear-to-br from-emerald-500 via-lime-500 to-amber-300";
      case "white":
        return "bg-white";
      case "dark":
        return "bg-stone-900";
      default:
        return "bg-linear-to-br from-orange-500 via-orange-400 to-amber-300";
    }
  }, [bgPreset]);

  const eyebrowColorClass =
    textColor === "dark" ? "text-stone-600" : "text-white/80";
  const headingColorClass =
    textColor === "dark" ? "text-stone-900" : "text-white";
  const bodyColorClass =
    textColor === "dark" ? "text-stone-800" : "text-white/90";
  const priceColorClass =
    textColor === "dark" ? "text-stone-900" : "text-white";

  const handleClose = () => {
    if (saving) return;
    setError(null);
    onClose();
  };

  const callAi = useCallback(
    async (field: AiField) => {
      if (loadingField) return;
      setLoadingField(field);
      setError(null);
      try {
        const res = await fetch("/api/admin/ai/suggest-field", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            field,
            lang,
            name: product.name,
            name_th: product.name_th,
            shortDescription: product.shortDescription,
            shortDescription_th: product.shortDescription_th,
            sourceDescription: null,
            price: product.price,
          }),
        });
        if (!res.ok) {
          throw new Error(`AI error ${res.status}`);
        }
        const data = (await res.json()) as { success?: boolean; value?: string; error?: string };
        if (!data.success || !data.value) {
          throw new Error(data.error || "AI response invalid");
        }
        if (field === "ad_title") setTitle(data.value.trim());
        if (field === "ad_subtitle") setSubtitle(data.value.trim());
        if (field === "ad_badge") setBadge(data.value.trim());
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AdImageDesigner] AI error", msg);
        setError("ไม่สามารถใช้ AI เขียนข้อความได้");
      } finally {
        setLoadingField(null);
      }
    },
    [lang, loadingField, product.name, product.name_th, product.shortDescription, product.shortDescription_th, product.price]
  );

  const handleExport = useCallback(
    async (mode: "download" | "save") => {
      if (!canvasRef.current || saving) return;
      setSaving(true);
      setError(null);
      try {
        const node = canvasRef.current;
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
        });

        if (mode === "download") {
          const a = document.createElement("a");
          a.href = dataUrl;
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          a.download = `ad-${product.id}-${ts}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // upload to /api/upload then save as marketing asset
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const fd = new FormData();
          fd.append("file", blob, `ad-${product.id}.png`);
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: fd,
          });
          if (!uploadRes.ok) throw new Error("Upload failed");
          const uploadData = (await uploadRes.json()) as { success?: boolean; url?: string; error?: string };
          if (!uploadData.success || !uploadData.url) {
            throw new Error(uploadData.error || "Upload invalid");
          }

          const saveRes = await fetch("/api/admin/marketing-assets/save-from-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: uploadData.url,
              productId: product.id,
              marketingPackId: context?.marketingPackId,
              prompt: `ad-designer:${lang}:${aspect}`,
              angle: null,
            }),
          });
          if (!saveRes.ok) throw new Error("Save asset failed");
          const saveData = (await saveRes.json()) as { success?: boolean; error?: string };
          if (!saveData.success) {
            throw new Error(saveData.error || "Save asset invalid");
          }
          if (onSaved) onSaved();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AdImageDesigner] export error", msg);
        setError("ไม่สามารถสร้างภาพได้ กรุณาลองใหม่");
      } finally {
        setSaving(false);
      }
    },
    [aspect, context?.marketingPackId, lang, onSaved, product.id, saving]
  );

  const handleImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingImage(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingImage || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setImageOffset((prev) => {
      let nextX = prev.x + dx;
      let nextY = prev.y + dy;

      // ใน layout split ไม่ให้รูปเลื่อนทับฝั่ง text (ห้ามเลื่อนไปทางซ้าย)
      if (layout === "split" && nextX < 0) nextX = 0;

      return { x: nextX, y: nextY };
    });
  };

  const handleImageMouseUp = () => {
    setIsDraggingImage(false);
    dragStartRef.current = null;
  };

  // รีเซ็ต offset/scale เมื่อเปลี่ยนรูปหลัก
  useEffect(() => {
    setImageOffset({ x: 0, y: 0 });
    setImageScale(1);
  }, [primaryImage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200">
          <div>
            <h2 className="text-base font-semibold text-stone-800">สร้างภาพ Ads</h2>
            <p className="text-xs text-stone-500">
              {displayName || "เลือกสินค้า"} • เลือก layout แล้วปรับข้อความเพื่อใช้ใน Shopee / Lazada / Social
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 hover:bg-stone-100 text-stone-500"
          >
            <span className="sr-only">ปิด</span>
            ✕
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Preview */}
          <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-stone-200 p-4 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center justify-between w-full mb-1">
              <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                <button
                  type="button"
                  onClick={() => setAspect("1:1")}
                  className={`px-2 py-0.5 rounded-full ${
                    aspect === "1:1" ? "bg-white shadow text-stone-900" : "opacity-70"
                  }`}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setAspect("4:5")}
                  className={`px-2 py-0.5 rounded-full ${
                    aspect === "4:5" ? "bg-white shadow text-stone-900" : "opacity-70"
                  }`}
                >
                  4:5
                </button>
                <button
                  type="button"
                  onClick={() => setAspect("9:16")}
                  className={`px-2 py-0.5 rounded-full ${
                    aspect === "9:16" ? "bg-white shadow text-stone-900" : "opacity-70"
                  }`}
                >
                  9:16
                </button>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
                <button
                  type="button"
                  onClick={() => setLang("th")}
                  className={`px-2 py-0.5 rounded-full ${
                    lang === "th" ? "bg-white shadow text-stone-900" : "opacity-70"
                  }`}
                >
                  TH
                </button>
                <button
                  type="button"
                  onClick={() => setLang("en")}
                  className={`px-2 py-0.5 rounded-full ${
                    lang === "en" ? "bg-white shadow text-stone-900" : "opacity-70"
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            <div
              ref={canvasRef}
              className={`relative w-full max-w-[420px] mx-auto ${aspectClass} rounded-[28px] overflow-hidden shadow-xl ${bgClass}`}
              onMouseMove={handleImageMouseMove}
              onMouseUp={handleImageMouseUp}
              onMouseLeave={handleImageMouseUp}
            >
              {layout === "overlay" ? (
                <>
                  {primaryImage && (
                    <div
                      className="absolute inset-0 cursor-move z-0"
                      onMouseDown={handleImageMouseDown}
                      style={{
                        transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                        transformOrigin: "center",
                      }}
                    >
                      <img src={primaryImage} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/35" />
                    </div>
                  )}
                  <div className="relative z-20 inset-0 p-4 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 max-w-[80%]">
                      <div
                        className={`text-[11px] uppercase tracking-wide font-semibold ${eyebrowColorClass}`}
                      >
                        {eyebrowText}
                      </div>
                        <div
                          className={`font-extrabold text-lg leading-snug line-clamp-3 drop-shadow ${headingColorClass}`}
                        >
                          {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                        </div>
                        <div
                          className={`text-[11px] leading-snug line-clamp-3 mt-0.5 ${bodyColorClass}`}
                        >
                          {subtitle ||
                            defaultSubtitle ||
                            (lang === "th"
                              ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า"
                              : "Short line about the main benefits")}
                        </div>
                      </div>
                      {showLogo && product.shopLogoUrl && (
                        <div className="shrink-0">
                          <img
                            src={product.shopLogoUrl}
                            alt="logo"
                            className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80"
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-2 pr-16">
                      <div className="flex flex-col gap-1">
                        {badge && (
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/92 text-[11px] font-semibold text-orange-600 shadow-sm max-w-[80%]">
                            {badge}
                          </div>
                        )}
                        {showPrice && priceText && (
                          <div
                            className={`mt-1 font-extrabold text-xl drop-shadow ${priceColorClass}`}
                          >
                            {priceText}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 p-4 flex flex-col z-20">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 max-w-[68%]">
                      <div
                        className={`text-[11px] uppercase tracking-wide font-semibold ${eyebrowColorClass}`}
                      >
                        {eyebrowText}
                      </div>
                      <div
                        className={`font-extrabold text-lg leading-snug line-clamp-3 drop-shadow-sm ${headingColorClass}`}
                      >
                        {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                      </div>
                      <div
                        className={`text-[11px] leading-snug line-clamp-3 mt-0.5 ${bodyColorClass}`}
                      >
                        {subtitle ||
                          defaultSubtitle ||
                          (lang === "th"
                            ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า"
                            : "Short line about the main benefits")}
                      </div>
                    </div>
                    {showLogo && product.shopLogoUrl && (
                      <div className="shrink-0">
                        <img
                          src={product.shopLogoUrl}
                          alt="logo"
                          className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-end justify-between gap-2 pr-16">
                    <div className="flex flex-col gap-1">
                      {badge && (
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/90 text-[11px] font-semibold text-orange-600 shadow-sm max-w-[80%]">
                          {badge}
                        </div>
                      )}
                      {showPrice && priceText && (
                        <div
                          className={`mt-1 font-extrabold text-xl drop-shadow-sm ${priceColorClass}`}
                        >
                          {priceText}
                        </div>
                      )}
                    </div>
                  </div>
                  {primaryImage && (
                    <div
                      className="absolute right-0 inset-y-8 w-[52%] flex items-center justify-center cursor-move z-0"
                      onMouseDown={handleImageMouseDown}
                      style={{
                        transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                        transformOrigin: "center",
                      }}
                    >
                      <div className="relative w-full drop-shadow-xl pointer-events-none">
                        <div className="absolute inset-4 bg-black/10 blur-2xl rounded-full" />
                        <img src={primaryImage} alt="" className="relative w-full h-auto object-contain" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {ctaText && (
                <div className="pointer-events-none absolute right-4 bottom-4 z-30">
                  <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-black/85 text-white text-[11px] font-semibold shadow-md">
                    {ctaText}
                  </div>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="mt-2 w-full max-w-[420px] flex flex-wrap gap-1.5">
                {images.slice(0, 8).map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(img)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 ${
                      (activeImage ?? images[0]) === img
                        ? "border-orange-500"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="md:w-1/2 p-4 space-y-3 overflow-y-auto">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Eyebrow / บรรทัดบนเล็ก ๆ
                </label>
                <input
                  type="text"
                  value={eyebrowCustom}
                  onChange={(e) => setEyebrowCustom(e.target.value)}
                  placeholder={defaultEyebrow}
                  className="input input-sm w-full"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Title ({lang === "th" ? "TH" : "EN"})
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={displayName || (lang === "th" ? "หัวข้อหลักดึงดูดสายตา" : "Catchy headline")}
                    className="input input-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => callAi("ad_title")}
                    disabled={loadingField === "ad_title"}
                    className="text-xs px-2.5 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                  >
                    {loadingField === "ad_title" ? "AI..." : "AI"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                Subtitle ({lang === "th" ? "TH" : "EN"})
              </label>
              <div className="flex gap-1.5">
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  rows={2}
                  placeholder={lang === "th" ? "ขยาย benefit หลัก 1–2 ประโยค" : "1–2 sentences about key benefits"}
                  className="input input-sm flex-1 min-h-[52px] resize-y"
                />
                <button
                  type="button"
                  onClick={() => callAi("ad_subtitle")}
                  disabled={loadingField === "ad_subtitle"}
                  className="text-xs px-2.5 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 h-[52px]"
                >
                  {loadingField === "ad_subtitle" ? "AI..." : "AI"}
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-stone-600 mb-1">Badge</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder={lang === "th" ? "เช่น ลดการหลุดร่วง" : "e.g. Reduce shedding"}
                    className="input input-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => callAi("ad_badge")}
                    disabled={loadingField === "ad_badge"}
                    className="text-xs px-2.5 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60"
                  >
                    {loadingField === "ad_badge" ? "AI..." : "AI"}
                  </button>
                </div>
              </div>
              <div className="w-32">
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  CTA
                </label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  className="input input-sm w-full"
                />
              </div>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs font-semibold text-stone-600">Layout</span>
              <button
                type="button"
                onClick={() => setLayout("split")}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  layout === "split"
                    ? "bg-white text-stone-900 border-stone-400 shadow"
                    : "bg-white text-stone-600 border-stone-300"
                }`}
              >
                รูปขวา + ตัวหนังสือซ้าย
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayout("overlay");
                  setImageOffset({ x: 0, y: 0 });
                }}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  layout === "overlay"
                    ? "bg-stone-900 text-white border-stone-900 shadow"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                รูปเต็ม + Text overlay
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs font-semibold text-stone-600 whitespace-nowrap">สีตัวหนังสือ</span>
              <button
                type="button"
                onClick={() => setTextColor("light")}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  textColor === "light"
                    ? "bg-stone-900 text-white border-stone-900 shadow"
                    : "bg-white text-stone-700 border-stone-300"
                }`}
              >
                ขาว (สำหรับพื้นเข้ม)
              </button>
              <button
                type="button"
                onClick={() => setTextColor("dark")}
                className={`px-2.5 py-1 rounded-full text-[11px] border ${
                  textColor === "dark"
                    ? "bg-white text-stone-900 border-stone-400 shadow"
                    : "bg-white text-stone-600 border-stone-300"
                }`}
              >
                ดำ (สำหรับพื้นอ่อน)
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <span className="text-xs font-semibold text-stone-600 whitespace-nowrap">ขนาดรูป</span>
              <input
                type="range"
                min={80}
                max={140}
                value={Math.round(imageScale * 100)}
                onChange={(e) => setImageScale(Number(e.target.value) / 100)}
                className="flex-1 accent-orange-500"
              />
              <button
                type="button"
                onClick={() => {
                  setImageOffset({ x: 0, y: 0 });
                  setImageScale(1);
                }}
                className="text-[11px] px-2 py-1 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50"
              >
                รีเซ็ต
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayout("overlay");
                  setImageOffset({ x: 0, y: 0 });
                  setImageScale(1.1);
                }}
                className="text-[11px] px-2 py-1 rounded-full border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100"
              >
                เต็มพื้น
              </button>
            </div>

            <div className="flex gap-3 items-center">
              <label className="inline-flex items-center gap-1.5 text-xs text-stone-700">
                <input
                  type="checkbox"
                  className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                />
                แสดงราคา ({priceText || "ไม่มีราคา"})
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs text-stone-700">
                <input
                  type="checkbox"
                  className="rounded border-stone-300 text-orange-600 focus:ring-orange-500"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                  disabled={!product.shopLogoUrl}
                />
                แสดงโลโก้ร้าน
              </label>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-xs font-semibold text-stone-600">Background</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBgPreset("brand")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border bg-linear-to-r from-orange-500 to-amber-400 text-white ${
                    bgPreset === "brand" ? "shadow border-orange-600" : "border-transparent opacity-80"
                  }`}
                >
                  ส้ม CartNova
                </button>
                <button
                  type="button"
                  onClick={() => setBgPreset("pink")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border bg-linear-to-r from-fuchsia-500 to-rose-400 text-white ${
                    bgPreset === "pink" ? "shadow border-fuchsia-600" : "border-transparent opacity-80"
                  }`}
                >
                  ชมพู
                </button>
                <button
                  type="button"
                  onClick={() => setBgPreset("blue")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border bg-linear-to-r from-sky-500 to-indigo-500 text-white ${
                    bgPreset === "blue" ? "shadow border-sky-700" : "border-transparent opacity-80"
                  }`}
                >
                  ฟ้า
                </button>
                <button
                  type="button"
                  onClick={() => setBgPreset("green")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border bg-linear-to-r from-emerald-500 to-lime-400 text-white ${
                    bgPreset === "green" ? "shadow border-emerald-700" : "border-transparent opacity-80"
                  }`}
                >
                  เขียว
                </button>
                <button
                  type="button"
                  onClick={() => setBgPreset("white")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${
                    bgPreset === "white"
                      ? "bg-white text-stone-900 border-stone-400 shadow"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  ขาว
                </button>
                <button
                  type="button"
                  onClick={() => setBgPreset("dark")}
                  className={`px-2.5 py-1 rounded-full text-[11px] border ${
                    bgPreset === "dark"
                      ? "bg-stone-900 text-white border-stone-900 shadow"
                      : "bg-stone-900 text-white border-stone-700 opacity-80"
                  }`}
                >
                  ดำ
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-stone-200 px-5 py-3 flex items-center justify-between">
          <div className="text-[11px] text-stone-500">
            ภาพที่สร้างจะเหมาะกับ{" "}
            {aspect === "1:1" ? "Shopee / Lazada square" : aspect === "4:5" ? "Facebook / IG feed" : "Story / Reel"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport("download")}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60"
            >
              ดาวน์โหลด PNG
            </button>
            <button
              type="button"
              onClick={() => handleExport("save")}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกเข้า Marketing Assets"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

