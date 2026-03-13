"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas-pro";

type Lang = "th" | "en";

export type AdImageDesignerProduct = {
  id: string;
  name: string | null;
  name_th?: string | null;
  shortDescription?: string | null;
  shortDescription_th?: string | null;
  price?: number | null;
  normalPrice?: number | null;
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

type BadgeItem = {
  id: string;
  text: string;
  icon: string;
  textColor: string;
  bgColor: string;
  x: number;
  y: number;
};

const BADGE_BG_OPTIONS = [
  { id: "white", label: "ขาว", cls: "bg-white/90", swatch: "bg-white border-stone-300" },
  { id: "dark", label: "ดำ", cls: "bg-black/75", swatch: "bg-stone-900 border-stone-900" },
  { id: "gray", label: "เทา", cls: "bg-stone-500", swatch: "bg-stone-500 border-stone-600" },
  { id: "yellow", label: "เหลือง", cls: "bg-yellow-400", swatch: "bg-yellow-400 border-yellow-500" },
  { id: "amber", label: "อำพัน", cls: "bg-amber-500", swatch: "bg-amber-500 border-amber-600" },
  { id: "orange", label: "ส้ม", cls: "bg-orange-500", swatch: "bg-orange-500 border-orange-600" },
  { id: "red", label: "แดง", cls: "bg-red-500", swatch: "bg-red-500 border-red-600" },
  { id: "rose", label: "โรส", cls: "bg-rose-400", swatch: "bg-rose-400 border-rose-500" },
  { id: "pink", label: "ชมพู", cls: "bg-pink-500", swatch: "bg-pink-500 border-pink-600" },
  { id: "fuchsia", label: "บานเย็น", cls: "bg-fuchsia-500", swatch: "bg-fuchsia-500 border-fuchsia-600" },
  { id: "purple", label: "ม่วง", cls: "bg-purple-500", swatch: "bg-purple-500 border-purple-600" },
  { id: "violet", label: "ไวโอเลต", cls: "bg-violet-500", swatch: "bg-violet-500 border-violet-600" },
  { id: "indigo", label: "คราม", cls: "bg-indigo-500", swatch: "bg-indigo-500 border-indigo-600" },
  { id: "blue", label: "ฟ้า", cls: "bg-sky-500", swatch: "bg-sky-500 border-sky-600" },
  { id: "cyan", label: "ฟ้าอ่อน", cls: "bg-cyan-400", swatch: "bg-cyan-400 border-cyan-500" },
  { id: "teal", label: "เทล", cls: "bg-teal-500", swatch: "bg-teal-500 border-teal-600" },
  { id: "green", label: "เขียว", cls: "bg-emerald-500", swatch: "bg-emerald-500 border-emerald-600" },
  { id: "lime", label: "เขียวอ่อน", cls: "bg-lime-400", swatch: "bg-lime-400 border-lime-500" },
];

const BADGE_TEXT_OPTIONS = [
  { id: "dark", label: "ดำ", cls: "text-stone-900", swatch: "bg-stone-900 border-stone-900" },
  { id: "white", label: "ขาว", cls: "text-white", swatch: "bg-white border-stone-300" },
  { id: "gray", label: "เทา", cls: "text-stone-500", swatch: "bg-stone-500 border-stone-600" },
  { id: "yellow", label: "เหลือง", cls: "text-yellow-400", swatch: "bg-yellow-400 border-yellow-500" },
  { id: "amber", label: "อำพัน", cls: "text-amber-600", swatch: "bg-amber-500 border-amber-600" },
  { id: "orange", label: "ส้ม", cls: "text-orange-600", swatch: "bg-orange-500 border-orange-600" },
  { id: "red", label: "แดง", cls: "text-red-600", swatch: "bg-red-500 border-red-600" },
  { id: "rose", label: "โรส", cls: "text-rose-500", swatch: "bg-rose-400 border-rose-500" },
  { id: "pink", label: "ชมพู", cls: "text-pink-600", swatch: "bg-pink-500 border-pink-600" },
  { id: "fuchsia", label: "บานเย็น", cls: "text-fuchsia-600", swatch: "bg-fuchsia-500 border-fuchsia-600" },
  { id: "purple", label: "ม่วง", cls: "text-purple-600", swatch: "bg-purple-500 border-purple-600" },
  { id: "violet", label: "ไวโอเลต", cls: "text-violet-600", swatch: "bg-violet-500 border-violet-600" },
  { id: "indigo", label: "คราม", cls: "text-indigo-600", swatch: "bg-indigo-500 border-indigo-600" },
  { id: "blue", label: "ฟ้า", cls: "text-sky-600", swatch: "bg-sky-500 border-sky-600" },
  { id: "cyan", label: "ฟ้าอ่อน", cls: "text-cyan-500", swatch: "bg-cyan-400 border-cyan-500" },
  { id: "teal", label: "เทล", cls: "text-teal-600", swatch: "bg-teal-500 border-teal-600" },
  { id: "green", label: "เขียว", cls: "text-emerald-600", swatch: "bg-emerald-500 border-emerald-600" },
  { id: "lime", label: "เขียวอ่อน", cls: "text-lime-500", swatch: "bg-lime-400 border-lime-500" },
];

let badgeIdCounter = 0;
const newBadgeId = () => `badge-${++badgeIdCounter}`;

export const AdImageDesignerModal: React.FC<Props> = ({ open, onClose, product, context, onSaved }) => {
  const [lang, setLang] = useState<Lang>("th");
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [bgPreset, setBgPreset] = useState<"brand" | "pink" | "blue" | "green" | "white" | "dark">("blue");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState("สั่งซื้อเลย");
  const [ctaColor, setCtaColor] = useState<string>("red");
  const [showLogo, setShowLogo] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [loadingField, setLoadingField] = useState<AiField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<"split" | "overlay">("split");
  const [textColor, setTextColor] = useState<string>("white");
  const [priceColor, setPriceColor] = useState<string>("white");
  const [priceBgEnabled, setPriceBgEnabled] = useState(true);
  const [priceBgColor, setPriceBgColor] = useState<string>("red");
  const [priceBgOpacity, setPriceBgOpacity] = useState(92);
  const [textShadow, setTextShadow] = useState<"none" | "soft" | "strong">("none");
  const [showDiscountBadge, setShowDiscountBadge] = useState(true);
  const [discountBadgeColor, setDiscountBadgeColor] = useState<string>("red");
  const [imageDim, setImageDim] = useState(100);
  const [textBgEnabled, setTextBgEnabled] = useState(false);
  const [textBgColor, setTextBgColor] = useState<string>("dark");
  const [textBgOpacity, setTextBgOpacity] = useState(92);
  const [showEyebrow, setShowEyebrow] = useState(true);
  const [showHeading, setShowHeading] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [imageScale, setImageScale] = useState(1);
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [textPositions, setTextPositions] = useState<{ eyebrow: { x: number; y: number }; heading: { x: number; y: number }; subtitle: { x: number; y: number } }>({
    eyebrow: { x: 0, y: 0 },
    heading: { x: 0, y: 0 },
    subtitle: { x: 0, y: 0 },
  });
  const [discountBadgePos, setDiscountBadgePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pricePos, setPricePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ctaPos, setCtaPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Unified drag system
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [loadingBadgeIcon, setLoadingBadgeIcon] = useState<string | null>(null);
  const loadingBadgeIconRef = useRef(false);

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
    () => (lang === "th" ? "ดีลพิเศษ" : "Special deal"),
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

  const fmt = (n: number) =>
    new Intl.NumberFormat("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const priceText = useMemo(() => {
    if (!product.price || product.price <= 0) return "";
    return `฿${fmt(product.price)}`;
  }, [product.price]);

  const normalPriceText = useMemo(() => {
    if (!product.normalPrice || product.normalPrice <= 0) return "";
    if (!product.price || product.normalPrice <= product.price) return "";
    return `฿${fmt(product.normalPrice)}`;
  }, [product.normalPrice, product.price]);

  const discountPct = useMemo(() => {
    if (!product.price || !product.normalPrice || product.normalPrice <= product.price) return 0;
    return Math.round(((product.normalPrice - product.price) / product.normalPrice) * 100);
  }, [product.price, product.normalPrice]);

  const DISCOUNT_BADGE_PRESETS: { id: string; label: string; swatch: string; cls: string }[] = [
    { id: "red", label: "แดง", swatch: "bg-red-500 border-red-600", cls: "bg-red-500 text-white" },
    { id: "orange", label: "ส้ม", swatch: "bg-orange-500 border-orange-600", cls: "bg-orange-500 text-white" },
    { id: "yellow", label: "เหลือง", swatch: "bg-yellow-400 border-yellow-500", cls: "bg-yellow-400 text-stone-900" },
    { id: "pink", label: "ชมพู", swatch: "bg-pink-500 border-pink-600", cls: "bg-pink-500 text-white" },
    { id: "dark", label: "ดำ", swatch: "bg-stone-900 border-stone-900", cls: "bg-black/80 text-white" },
    { id: "white", label: "ขาว", swatch: "bg-white border-stone-300", cls: "bg-white/90 text-stone-900" },
  ];

  const discountBadgeCls = (DISCOUNT_BADGE_PRESETS.find((p) => p.id === discountBadgeColor) ?? DISCOUNT_BADGE_PRESETS[0]!).cls;

  const TEXT_BG_PRESETS: { id: string; label: string; swatch: string; rgb: string }[] = [
    { id: "dark", label: "ดำ", swatch: "bg-stone-900 border-stone-900", rgb: "0,0,0" },
    { id: "white", label: "ขาว", swatch: "bg-white border-stone-300", rgb: "255,255,255" },
    { id: "yellow", label: "เหลือง", swatch: "bg-yellow-400 border-yellow-500", rgb: "250,204,21" },
    { id: "amber", label: "อำพัน", swatch: "bg-amber-500 border-amber-600", rgb: "245,158,11" },
    { id: "orange", label: "ส้ม", swatch: "bg-orange-500 border-orange-600", rgb: "249,115,22" },
    { id: "red", label: "แดง", swatch: "bg-red-500 border-red-600", rgb: "239,68,68" },
    { id: "rose", label: "โรส", swatch: "bg-rose-400 border-rose-500", rgb: "251,113,133" },
    { id: "pink", label: "ชมพู", swatch: "bg-pink-500 border-pink-600", rgb: "236,72,153" },
    { id: "fuchsia", label: "บานเย็น", swatch: "bg-fuchsia-500 border-fuchsia-600", rgb: "217,70,239" },
    { id: "purple", label: "ม่วง", swatch: "bg-purple-500 border-purple-600", rgb: "168,85,247" },
    { id: "violet", label: "ไวโอเลต", swatch: "bg-violet-500 border-violet-600", rgb: "139,92,246" },
    { id: "indigo", label: "คราม", swatch: "bg-indigo-500 border-indigo-600", rgb: "99,102,241" },
    { id: "blue", label: "ฟ้า", swatch: "bg-sky-500 border-sky-600", rgb: "14,165,233" },
    { id: "cyan", label: "ฟ้าอ่อน", swatch: "bg-cyan-400 border-cyan-500", rgb: "34,211,238" },
    { id: "teal", label: "เทล", swatch: "bg-teal-500 border-teal-600", rgb: "20,184,166" },
    { id: "green", label: "เขียว", swatch: "bg-emerald-500 border-emerald-600", rgb: "16,185,129" },
    { id: "lime", label: "เขียวอ่อน", swatch: "bg-lime-400 border-lime-500", rgb: "163,230,53" },
  ];

  const textBgStyle = useMemo<React.CSSProperties>(() => {
    if (!textBgEnabled) return {};
    const preset = TEXT_BG_PRESETS.find((p) => p.id === textBgColor) ?? TEXT_BG_PRESETS[0]!;
    return { backgroundColor: `rgba(${preset.rgb},${textBgOpacity / 100})` };
  }, [textBgEnabled, textBgColor, textBgOpacity]);

  const priceBgStyle = useMemo<React.CSSProperties>(() => {
    if (!priceBgEnabled) return {};
    const preset = TEXT_BG_PRESETS.find((p) => p.id === priceBgColor) ?? TEXT_BG_PRESETS[0]!;
    return { backgroundColor: `rgba(${preset.rgb},${priceBgOpacity / 100})`, borderRadius: "9999px", padding: "4px 14px" };
  }, [priceBgEnabled, priceBgColor, priceBgOpacity]);

  const aspectRatio = useMemo(() => {
    switch (aspect) {
      case "4:5":
        return "4/5";
      case "9:16":
        return "9/16";
      default:
        return "1/1";
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

  const TEXT_COLOR_PRESETS: { id: string; label: string; swatch: string; heading: string; eyebrow: string; body: string; price: string }[] = [
    { id: "white", label: "ขาว", swatch: "bg-white border-stone-300", heading: "text-white", eyebrow: "text-white/80", body: "text-white/90", price: "text-white" },
    { id: "dark", label: "ดำ", swatch: "bg-stone-900 border-stone-900", heading: "text-stone-900", eyebrow: "text-stone-600", body: "text-stone-800", price: "text-stone-900" },
    { id: "gray", label: "เทา", swatch: "bg-stone-500 border-stone-600", heading: "text-stone-500", eyebrow: "text-stone-400/90", body: "text-stone-400/90", price: "text-stone-500" },
    { id: "yellow", label: "เหลือง", swatch: "bg-yellow-300 border-yellow-400", heading: "text-yellow-300", eyebrow: "text-yellow-200/90", body: "text-yellow-100/90", price: "text-yellow-300" },
    { id: "amber", label: "อำพัน", swatch: "bg-amber-500 border-amber-600", heading: "text-amber-500", eyebrow: "text-amber-400/90", body: "text-amber-300/90", price: "text-amber-500" },
    { id: "orange", label: "ส้ม", swatch: "bg-orange-500 border-orange-600", heading: "text-orange-500", eyebrow: "text-orange-400/90", body: "text-orange-300/90", price: "text-orange-500" },
    { id: "red", label: "แดง", swatch: "bg-red-500 border-red-600", heading: "text-red-500", eyebrow: "text-red-400/90", body: "text-red-300/90", price: "text-red-500" },
    { id: "rose", label: "โรส", swatch: "bg-rose-400 border-rose-500", heading: "text-rose-400", eyebrow: "text-rose-300/90", body: "text-rose-200/90", price: "text-rose-400" },
    { id: "pink", label: "ชมพู", swatch: "bg-pink-400 border-pink-500", heading: "text-pink-400", eyebrow: "text-pink-300/90", body: "text-pink-200/90", price: "text-pink-400" },
    { id: "fuchsia", label: "บานเย็น", swatch: "bg-fuchsia-500 border-fuchsia-600", heading: "text-fuchsia-500", eyebrow: "text-fuchsia-400/90", body: "text-fuchsia-300/90", price: "text-fuchsia-500" },
    { id: "purple", label: "ม่วง", swatch: "bg-purple-500 border-purple-600", heading: "text-purple-500", eyebrow: "text-purple-400/90", body: "text-purple-300/90", price: "text-purple-500" },
    { id: "violet", label: "ไวโอเลต", swatch: "bg-violet-500 border-violet-600", heading: "text-violet-500", eyebrow: "text-violet-400/90", body: "text-violet-300/90", price: "text-violet-500" },
    { id: "indigo", label: "คราม", swatch: "bg-indigo-500 border-indigo-600", heading: "text-indigo-500", eyebrow: "text-indigo-400/90", body: "text-indigo-300/90", price: "text-indigo-500" },
    { id: "blue", label: "ฟ้า", swatch: "bg-sky-400 border-sky-500", heading: "text-sky-400", eyebrow: "text-sky-300/90", body: "text-sky-200/90", price: "text-sky-400" },
    { id: "cyan", label: "ฟ้าอ่อน", swatch: "bg-cyan-400 border-cyan-500", heading: "text-cyan-400", eyebrow: "text-cyan-300/90", body: "text-cyan-200/90", price: "text-cyan-400" },
    { id: "teal", label: "เทล", swatch: "bg-teal-500 border-teal-600", heading: "text-teal-500", eyebrow: "text-teal-400/90", body: "text-teal-300/90", price: "text-teal-500" },
    { id: "green", label: "เขียว", swatch: "bg-emerald-400 border-emerald-500", heading: "text-emerald-400", eyebrow: "text-emerald-300/90", body: "text-emerald-200/90", price: "text-emerald-400" },
    { id: "lime", label: "เขียวอ่อน", swatch: "bg-lime-400 border-lime-500", heading: "text-lime-400", eyebrow: "text-lime-300/90", body: "text-lime-200/90", price: "text-lime-400" },
  ];

  const PRICE_COLOR_PRESETS: { id: string; label: string; swatch: string; cls: string; strikeCls: string }[] = [
    { id: "auto", label: "ตามตัวหนังสือ", swatch: "bg-gradient-to-br from-stone-300 to-stone-500 border-stone-400", cls: "", strikeCls: "" },
    { id: "white", label: "ขาว", swatch: "bg-white border-stone-300", cls: "text-white", strikeCls: "text-white/60" },
    { id: "dark", label: "ดำ", swatch: "bg-stone-900 border-stone-900", cls: "text-stone-900", strikeCls: "text-stone-700/60" },
    { id: "yellow", label: "เหลือง", swatch: "bg-yellow-300 border-yellow-400", cls: "text-yellow-300", strikeCls: "text-yellow-200/60" },
    { id: "amber", label: "อำพัน", swatch: "bg-amber-500 border-amber-600", cls: "text-amber-500", strikeCls: "text-amber-400/60" },
    { id: "orange", label: "ส้ม", swatch: "bg-orange-500 border-orange-600", cls: "text-orange-500", strikeCls: "text-orange-400/60" },
    { id: "red", label: "แดง", swatch: "bg-red-500 border-red-600", cls: "text-red-500", strikeCls: "text-red-400/60" },
    { id: "rose", label: "โรส", swatch: "bg-rose-400 border-rose-500", cls: "text-rose-400", strikeCls: "text-rose-300/60" },
    { id: "pink", label: "ชมพู", swatch: "bg-pink-500 border-pink-600", cls: "text-pink-500", strikeCls: "text-pink-400/60" },
    { id: "fuchsia", label: "บานเย็น", swatch: "bg-fuchsia-500 border-fuchsia-600", cls: "text-fuchsia-500", strikeCls: "text-fuchsia-400/60" },
    { id: "purple", label: "ม่วง", swatch: "bg-purple-500 border-purple-600", cls: "text-purple-500", strikeCls: "text-purple-400/60" },
    { id: "violet", label: "ไวโอเลต", swatch: "bg-violet-500 border-violet-600", cls: "text-violet-500", strikeCls: "text-violet-400/60" },
    { id: "indigo", label: "คราม", swatch: "bg-indigo-500 border-indigo-600", cls: "text-indigo-500", strikeCls: "text-indigo-400/60" },
    { id: "blue", label: "ฟ้า", swatch: "bg-sky-400 border-sky-500", cls: "text-sky-400", strikeCls: "text-sky-300/60" },
    { id: "cyan", label: "ฟ้าอ่อน", swatch: "bg-cyan-400 border-cyan-500", cls: "text-cyan-400", strikeCls: "text-cyan-300/60" },
    { id: "teal", label: "เทล", swatch: "bg-teal-500 border-teal-600", cls: "text-teal-500", strikeCls: "text-teal-400/60" },
    { id: "green", label: "เขียว", swatch: "bg-emerald-500 border-emerald-600", cls: "text-emerald-500", strikeCls: "text-emerald-400/60" },
    { id: "lime", label: "เขียวสด", swatch: "bg-lime-400 border-lime-500", cls: "text-lime-400", strikeCls: "text-lime-300/60" },
  ];

  const activeColorPreset = TEXT_COLOR_PRESETS.find((p) => p.id === textColor) ?? TEXT_COLOR_PRESETS[0]!;
  const eyebrowColorClass = activeColorPreset.eyebrow;
  const headingColorClass = activeColorPreset.heading;
  const bodyColorClass = activeColorPreset.body;

  const activePricePreset = PRICE_COLOR_PRESETS.find((p) => p.id === priceColor);
  const priceColorClass = activePricePreset && activePricePreset.id !== "auto" ? activePricePreset.cls : activeColorPreset.price;
  const strikeColorClass = activePricePreset && activePricePreset.id !== "auto" ? activePricePreset.strikeCls : `${activeColorPreset.price} opacity-50`;

  const textShadowStyle = useMemo<React.CSSProperties>(() => {
    switch (textShadow) {
      case "soft":
        return { textShadow: "0 1px 4px rgba(0,0,0,0.35)" };
      case "strong":
        return { textShadow: "0 2px 8px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)" };
      default:
        return {};
    }
  }, [textShadow]);

  const CTA_COLOR_PRESETS: { id: string; label: string; swatch: string; cls: string }[] = [
    { id: "dark", label: "ดำ", swatch: "bg-stone-900 border-stone-900", cls: "bg-black/85 text-white" },
    { id: "white", label: "ขาว", swatch: "bg-white border-stone-300", cls: "bg-white/90 text-stone-900" },
    { id: "orange", label: "ส้ม", swatch: "bg-orange-500 border-orange-600", cls: "bg-orange-500 text-white" },
    { id: "red", label: "แดง", swatch: "bg-red-500 border-red-600", cls: "bg-red-500 text-white" },
    { id: "pink", label: "ชมพู", swatch: "bg-pink-500 border-pink-600", cls: "bg-pink-500 text-white" },
    { id: "blue", label: "ฟ้า", swatch: "bg-sky-500 border-sky-600", cls: "bg-sky-500 text-white" },
    { id: "green", label: "เขียว", swatch: "bg-emerald-500 border-emerald-600", cls: "bg-emerald-500 text-white" },
    { id: "yellow", label: "เหลือง", swatch: "bg-yellow-400 border-yellow-500", cls: "bg-yellow-400 text-stone-900" },
  ];

  const ctaBgClass = (CTA_COLOR_PRESETS.find((p) => p.id === ctaColor) ?? CTA_COLOR_PRESETS[0]!).cls;

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

        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        const dataUrl = canvas.toDataURL("image/png");

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
        console.error("[AdImageDesigner] export error", msg, err);
        setError(`ไม่สามารถสร้างภาพได้: ${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [aspect, context?.marketingPackId, lang, onSaved, product.id, saving]
  );

  const dragTargetRef = useRef<string | null>(null);

  const startDrag = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragTargetRef.current = targetId;
    setDragTarget(targetId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragTargetRef.current || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const target = dragTargetRef.current;

      if (target === "image") {
        setImageOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (target === "eyebrow" || target === "heading" || target === "subtitle") {
        setTextPositions((prev) => ({
          ...prev,
          [target]: { x: prev[target].x + dx, y: prev[target].y + dy },
        }));
      } else if (target === "discountBadge") {
        setDiscountBadgePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (target === "price") {
        setPricePos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (target === "cta") {
        setCtaPos((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (target.startsWith("badge-")) {
        setBadges((prev) =>
          prev.map((b) => (b.id === target ? { ...b, x: b.x + dx, y: b.y + dy } : b))
        );
      }
    };

    const handleMouseUp = () => {
      dragTargetRef.current = null;
      setDragTarget(null);
      dragStartRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const addBadge = () => {
    const newBadge: BadgeItem = {
      id: newBadgeId(),
      text: lang === "th" ? "ข้อความ badge" : "Badge text",
      icon: "",
      textColor: "dark",
      bgColor: "white",
      x: 16,
      y: 200 + badges.length * 35,
    };
    setBadges((prev) => [...prev, newBadge]);
    setEditingBadgeId(newBadge.id);
  };

  const removeBadge = (id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
    if (editingBadgeId === id) setEditingBadgeId(null);
  };

  const updateBadge = useCallback((id: string, updates: Partial<BadgeItem>) => {
    setBadges((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const suggestBadgeIcon = useCallback(async (badgeId: string, badgeText: string) => {
    if (loadingBadgeIconRef.current) return;
    loadingBadgeIconRef.current = true;
    setLoadingBadgeIcon(badgeId);
    try {
      const res = await fetch("/api/admin/ai/suggest-field", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "ad_badge_icon",
          lang,
          name: product.name,
          name_th: product.name_th,
          shortDescription: badgeText,
          shortDescription_th: null,
          price: product.price,
        }),
      });
      const data = (await res.json()) as { success?: boolean; value?: string };
      if (res.ok && data.success && data.value) {
        const raw = data.value.trim();
        const emojiMatch = raw.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u);
        setBadges((prev) => prev.map((b) => b.id === badgeId ? { ...b, icon: emojiMatch ? emojiMatch[0] : raw.slice(0, 2) } : b));
      }
    } catch { /* ignore */ } finally {
      loadingBadgeIconRef.current = false;
      setLoadingBadgeIcon(null);
    }
  }, [lang, product.name, product.name_th, product.price]);

  useEffect(() => {
    setImageOffset({ x: 0, y: 0 });
    setImageScale(1);
  }, [primaryImage]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] max-h-[95vh] flex flex-col">
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
          <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-stone-200 p-4 flex flex-col items-center justify-start gap-2 overflow-y-auto">
            <div className="flex items-center justify-between w-full">
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
              className={`relative w-full max-w-[420px] mx-auto shrink-0 rounded-[28px] overflow-hidden shadow-xl ${bgClass} cursor-move`}
              style={{ aspectRatio: aspect === "4:5" ? "4/5" : aspect === "9:16" ? "9/16" : "1/1" }}
              onMouseDown={(e) => startDrag("image", e)}
            >
              {layout === "overlay" ? (
                <>
                  {primaryImage && (
                    <div
                      className="absolute inset-0 z-[1] pointer-events-none"
                      style={{
                        transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                        transformOrigin: "center",
                      }}
                    >
                      <img src={primaryImage} alt="" className="w-full h-full object-cover" />
                      {imageDim < 100 && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(100 - imageDim) / 100})` }} />}
                    </div>
                  )}
                  <div className="absolute z-20 inset-0 p-4 flex flex-col pointer-events-none" style={textShadowStyle}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 max-w-[75%]">
                        {showEyebrow && (
                          <div
                            className={`inline-block self-start text-[11px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${eyebrowColorClass}`}
                            style={{ transform: `translate(${textPositions.eyebrow.x}px, ${textPositions.eyebrow.y}px)`, ...textBgStyle }}
                            onMouseDown={(e) => startDrag("eyebrow", e)}
                          >
                            {eyebrowText}
                          </div>
                        )}
                        {showHeading && (
                          <div
                            className={`inline-block self-start font-extrabold text-lg leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${headingColorClass}`}
                            style={{ transform: `translate(${textPositions.heading.x}px, ${textPositions.heading.y}px)`, ...textBgStyle }}
                            onMouseDown={(e) => startDrag("heading", e)}
                          >
                            {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                          </div>
                        )}
                        {showSubtitle && (
                          <div
                            className={`inline-block self-start text-[11px] leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${bodyColorClass}`}
                            style={{ transform: `translate(${textPositions.subtitle.x}px, ${textPositions.subtitle.y}px)`, ...textBgStyle }}
                            onMouseDown={(e) => startDrag("subtitle", e)}
                          >
                            {subtitle ||
                              defaultSubtitle ||
                              (lang === "th"
                                ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า"
                                : "Short line about the main benefits")}
                          </div>
                        )}
                      </div>
                      {showLogo && product.shopLogoUrl && (
                        <div className="shrink-0">
                          <img src={product.shopLogoUrl} alt="logo" className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80" />
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pointer-events-auto">
                      {showPrice && priceText && (
                        <div
                          className="inline-flex items-baseline gap-2 cursor-move"
                          style={{ ...priceBgStyle, transform: `translate(${pricePos.x}px, ${pricePos.y}px)` }}
                          onMouseDown={(e) => startDrag("price", e)}
                        >
                          <span className={`font-extrabold text-xl ${priceColorClass}`}>{priceText}</span>
                          {normalPriceText && (
                            <span className={`text-sm line-through ${strikeColorClass}`}>{normalPriceText}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {badges.map((b) => {
                    const bgCls = BADGE_BG_OPTIONS.find((o) => o.id === b.bgColor)?.cls ?? "bg-white/90";
                    const txtCls = BADGE_TEXT_OPTIONS.find((o) => o.id === b.textColor)?.cls ?? "text-stone-900";
                    return (
                      <div
                        key={b.id}
                        className={`absolute z-25 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm whitespace-nowrap cursor-move ${bgCls} ${txtCls}`}
                        style={{ left: b.x, top: b.y }}
                        onMouseDown={(e) => startDrag(b.id, e)}
                      >
                        {b.icon && <span>{b.icon}</span>}
                        {b.text}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="absolute inset-0 flex">
                {/* Text side */}
                <div className="relative z-20 w-[55%] p-4 flex flex-col" style={textShadowStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      {showEyebrow && (
                        <div
                          className={`inline-block self-start text-[11px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded cursor-move ${eyebrowColorClass}`}
                          style={{ transform: `translate(${textPositions.eyebrow.x}px, ${textPositions.eyebrow.y}px)`, ...textBgStyle }}
                          onMouseDown={(e) => startDrag("eyebrow", e)}
                        >
                          {eyebrowText}
                        </div>
                      )}
                      {showHeading && (
                        <div
                          className={`inline-block self-start font-extrabold text-lg leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move ${headingColorClass}`}
                          style={{ transform: `translate(${textPositions.heading.x}px, ${textPositions.heading.y}px)`, ...textBgStyle }}
                          onMouseDown={(e) => startDrag("heading", e)}
                        >
                          {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                        </div>
                      )}
                      {showSubtitle && (
                        <div
                          className={`inline-block self-start text-[11px] leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move ${bodyColorClass}`}
                          style={{ transform: `translate(${textPositions.subtitle.x}px, ${textPositions.subtitle.y}px)`, ...textBgStyle }}
                          onMouseDown={(e) => startDrag("subtitle", e)}
                        >
                          {subtitle ||
                            defaultSubtitle ||
                            (lang === "th"
                              ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า"
                              : "Short line about the main benefits")}
                        </div>
                      )}
                    </div>
                    {showLogo && product.shopLogoUrl && (
                      <div className="shrink-0">
                        <img src={product.shopLogoUrl} alt="logo" className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80" />
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    {showPrice && priceText && (
                      <div
                        className="inline-flex items-baseline gap-2 cursor-move"
                        style={{ ...priceBgStyle, transform: `translate(${pricePos.x}px, ${pricePos.y}px)` }}
                        onMouseDown={(e) => startDrag("price", e)}
                      >
                        <span className={`font-extrabold text-xl ${priceColorClass}`}>{priceText}</span>
                        {normalPriceText && (
                          <span className={`text-sm line-through ${strikeColorClass}`}>{normalPriceText}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {badges.map((b) => {
                    const bgCls = BADGE_BG_OPTIONS.find((o) => o.id === b.bgColor)?.cls ?? "bg-white/90";
                    const txtCls = BADGE_TEXT_OPTIONS.find((o) => o.id === b.textColor)?.cls ?? "text-stone-900";
                    return (
                      <div
                        key={b.id}
                        className={`absolute z-25 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold shadow-sm whitespace-nowrap cursor-move ${bgCls} ${txtCls}`}
                        style={{ left: b.x, top: b.y }}
                        onMouseDown={(e) => startDrag(b.id, e)}
                      >
                        {b.icon && <span>{b.icon}</span>}
                        {b.text}
                      </div>
                    );
                  })}
                </div>
                {/* Image side */}
                {primaryImage && (
                  <div
                    className="relative z-10 w-[45%] flex items-center justify-center cursor-move overflow-hidden"
                    onMouseDown={(e) => startDrag("image", e)}
                    style={{
                      transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                      transformOrigin: "center",
                    }}
                  >
                    <div className="relative w-full drop-shadow-xl pointer-events-none">
                      <div className="absolute inset-4 bg-black/10 blur-2xl rounded-full" />
                      <img src={primaryImage} alt="" className="relative w-full h-auto object-contain" style={imageDim < 100 ? { filter: `brightness(${imageDim / 100})` } : undefined} />
                    </div>
                  </div>
                )}
              </div>
              )}

              {showDiscountBadge && discountPct > 0 && (
                <div
                  className="absolute right-3 top-3 z-40 cursor-move"
                  style={{ transform: `translate(${discountBadgePos.x}px, ${discountBadgePos.y}px)` }}
                  onMouseDown={(e) => startDrag("discountBadge", e)}
                >
                  <div className={`px-3 py-1.5 rounded-full font-extrabold text-sm shadow-lg whitespace-nowrap ${discountBadgeCls}`}>
                    -{discountPct}%
                  </div>
                </div>
              )}

              {ctaText && (
                <div
                  className="absolute right-4 bottom-4 z-30 cursor-move"
                  style={{ transform: `translate(${ctaPos.x}px, ${ctaPos.y}px)` }}
                  onMouseDown={(e) => startDrag("cta", e)}
                >
                  <div className={`inline-flex items-center px-3.5 py-1.5 rounded-full ${ctaBgClass} text-[11px] font-semibold shadow-md`}>
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
          <div className="md:w-1/2 p-4 space-y-2 overflow-y-auto">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* ─── Group: Layout & Background ─── */}
            <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
              <legend className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1">Layout & Background</legend>
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  type="button"
                  onClick={() => setLayout("split")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    layout === "split"
                      ? "bg-orange-500 text-white border-orange-500 shadow"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  รูปขวา + ตัวหนังสือซ้าย
                </button>
                <button
                  type="button"
                  onClick={() => { setLayout("overlay"); setImageOffset({ x: 0, y: 0 }); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    layout === "overlay"
                      ? "bg-orange-500 text-white border-orange-500 shadow"
                      : "bg-white text-stone-600 border-stone-300"
                  }`}
                >
                  รูปเต็ม + Text overlay
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] text-stone-500 mr-1">Background</span>
                {(["brand", "pink", "blue", "green", "white", "dark"] as const).map((bg) => {
                  const styles: Record<string, string> = {
                    brand: "bg-linear-to-r from-orange-500 to-amber-400 text-white",
                    pink: "bg-linear-to-r from-fuchsia-500 to-rose-400 text-white",
                    blue: "bg-linear-to-r from-sky-500 to-indigo-500 text-white",
                    green: "bg-linear-to-r from-emerald-500 to-lime-400 text-white",
                    white: "bg-white text-stone-600 border-stone-300",
                    dark: "bg-stone-900 text-white",
                  };
                  const labels: Record<string, string> = { brand: "ส้ม", pink: "ชมพู", blue: "ฟ้า", green: "เขียว", white: "ขาว", dark: "ดำ" };
                  return (
                    <button key={bg} type="button" onClick={() => setBgPreset(bg)}
                      className={`px-2 py-0.5 rounded-full text-[10px] border ${styles[bg]} ${bgPreset === bg ? "shadow ring-1 ring-orange-400" : "opacity-70"}`}
                    >{labels[bg]}</button>
                  );
                })}
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-[11px] text-stone-500">ขนาดรูป</span>
                <input type="range" min={50} max={300} value={Math.round(imageScale * 100)} onChange={(e) => setImageScale(Number(e.target.value) / 100)} className="flex-1 accent-orange-500" />
                <span className="text-[11px] text-stone-500 ml-1">ความสว่าง</span>
                <input type="range" min={0} max={100} value={imageDim} onChange={(e) => setImageDim(Number(e.target.value))} className="w-16 accent-stone-500" />
                <button type="button" onClick={() => { setImageOffset({ x: 0, y: 0 }); setImageScale(1); setImageDim(100); setTextPositions({ eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } }); setDiscountBadgePos({ x: 0, y: 0 }); setPricePos({ x: 0, y: 0 }); setCtaPos({ x: 0, y: 0 }); }}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50">รีเซ็ต</button>
                <button type="button" onClick={() => { setLayout("overlay"); setImageOffset({ x: 0, y: 0 }); setImageScale(1.1); }}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100">เต็มพื้น</button>
              </div>
              <div className="flex gap-3 items-center flex-wrap">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} disabled={!product.shopLogoUrl} />
                  โลโก้ร้าน
                </label>
                {discountPct > 0 && (
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                    <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showDiscountBadge} onChange={(e) => setShowDiscountBadge(e.target.checked)} />
                    ลด -{discountPct}%
                  </label>
                )}
                {showDiscountBadge && discountPct > 0 && (
                  <div className="flex gap-1">
                    {DISCOUNT_BADGE_PRESETS.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => setDiscountBadgeColor(preset.id)} title={preset.label}
                        className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${discountBadgeColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </fieldset>

            {/* ─── Group: Text ─── */}
            <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
              <legend className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1">ข้อความ</legend>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mb-1">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} />
                  Eyebrow
                </label>
                <input type="text" value={eyebrowCustom} onChange={(e) => setEyebrowCustom(e.target.value)} placeholder={defaultEyebrow} className="input input-sm w-full" disabled={!showEyebrow} />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mb-1">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showHeading} onChange={(e) => setShowHeading(e.target.checked)} />
                  Title ({lang === "th" ? "TH" : "EN"})
                </label>
                <div className="flex gap-1.5">
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={displayName || (lang === "th" ? "หัวข้อหลัก" : "Headline")} className="input input-sm flex-1" />
                  <button type="button" onClick={() => callAi("ad_title")} disabled={loadingField === "ad_title"} className="text-xs px-2 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60">
                    {loadingField === "ad_title" ? "..." : "AI"}
                  </button>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 mb-1">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showSubtitle} onChange={(e) => setShowSubtitle(e.target.checked)} />
                  Subtitle ({lang === "th" ? "TH" : "EN"})
                </label>
                <div className="flex gap-1.5">
                  <textarea value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} placeholder={lang === "th" ? "ขยาย benefit 1–2 ประโยค" : "1–2 sentences"} className="input input-sm flex-1 min-h-[44px] resize-y" />
                  <button type="button" onClick={() => callAi("ad_subtitle")} disabled={loadingField === "ad_subtitle"} className="text-xs px-2 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 h-[44px]">
                    {loadingField === "ad_subtitle" ? "..." : "AI"}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                <div>
                  <span className="text-[11px] text-stone-500">สี</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {TEXT_COLOR_PRESETS.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => setTextColor(preset.id)} title={preset.label}
                        className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${textColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500">เงา</span>
                  {(["none", "soft", "strong"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setTextShadow(v)}
                      className={`px-2 py-0.5 rounded-full text-[10px] border ${textShadow === v ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-300"}`}
                    >{{ none: "ไม่มี", soft: "อ่อน", strong: "เข้ม" }[v]}</button>
                  ))}
                </div>
                <div>
                  <label className="inline-flex items-center gap-1 text-[11px] text-stone-700">
                    <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={textBgEnabled} onChange={(e) => setTextBgEnabled(e.target.checked)} />
                    กรอบสี
                  </label>
                  {textBgEnabled && (
                    <>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {TEXT_BG_PRESETS.map((preset) => (
                          <button key={preset.id} type="button" onClick={() => setTextBgColor(preset.id)} title={preset.label}
                            className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${textBgColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-stone-500">โปร่งใส</span>
                        <input type="range" min={10} max={100} value={textBgOpacity} onChange={(e) => setTextBgOpacity(Number(e.target.value))} className="flex-1 accent-orange-500" />
                        <span className="text-[10px] text-stone-500 w-7 text-right">{textBgOpacity}%</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </fieldset>

            {/* ─── Group: Badges ─── */}
            <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
              <legend className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1">Badges</legend>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-stone-400">ลากขยับได้บน canvas</span>
                <button type="button" onClick={addBadge} className="text-[11px] px-2.5 py-1 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100">+ เพิ่ม</button>
              </div>
              {badges.length === 0 && <p className="text-[11px] text-stone-400">ยังไม่มี badge</p>}
              <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                {badges.map((b) => {
                  const isEditing = editingBadgeId === b.id;
                  return (
                    <div key={b.id} className="border border-stone-200 rounded-lg p-1.5">
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "4px", alignItems: "center" }}>
                        {b.icon ? (
                          <button type="button" onClick={() => updateBadge(b.id, { icon: "" })} className="text-sm leading-none hover:opacity-60" title="กดเพื่อลบ emoji">{b.icon}</button>
                        ) : (
                          <span className="text-[9px] text-stone-300">✦</span>
                        )}
                        <input type="text" value={b.text} onChange={(e) => updateBadge(b.id, { text: e.target.value })} className="input input-xs text-[11px] h-5 min-w-0" placeholder="badge" />
                        <button type="button" onClick={() => suggestBadgeIcon(b.id, b.text)} disabled={loadingBadgeIcon === b.id}
                          className="text-[8px] px-1 h-5 rounded border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60">{loadingBadgeIcon === b.id ? ".." : "AI"}</button>
                        <button type="button" onClick={() => setEditingBadgeId(isEditing ? null : b.id)} className="text-[9px] w-5 h-5 flex items-center justify-center rounded border border-stone-300 text-stone-600 hover:bg-stone-50">🎨</button>
                        <button type="button" onClick={() => removeBadge(b.id)} className="text-[9px] w-5 h-5 flex items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50">✕</button>
                      </div>
                      {isEditing && (
                        <div className="space-y-1 pt-1 border-t border-stone-100">
                          <div className="flex items-start gap-1">
                            <span className="text-[9px] text-stone-500 shrink-0 pt-0.5 w-6">text</span>
                            <div className="flex flex-wrap gap-0.5">
                              {BADGE_TEXT_OPTIONS.map((opt) => (
                                <button key={opt.id} type="button" onClick={() => updateBadge(b.id, { textColor: opt.id })}
                                  className={`w-4 h-4 rounded-full border ${opt.swatch} ${b.textColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} title={opt.label} />
                              ))}
                            </div>
                          </div>
                          <div className="flex items-start gap-1">
                            <span className="text-[9px] text-stone-500 shrink-0 pt-0.5 w-6">พื้น</span>
                            <div className="flex flex-wrap gap-0.5">
                              {BADGE_BG_OPTIONS.map((opt) => (
                                <button key={opt.id} type="button" onClick={() => updateBadge(b.id, { bgColor: opt.id })}
                                  className={`w-4 h-4 rounded-full border ${opt.swatch} ${b.bgColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} title={opt.label} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {/* ─── Group: Price & CTA ─── */}
            <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
              <legend className="text-[11px] font-bold text-stone-500 uppercase tracking-wider px-1">ราคา & ปุ่ม CTA</legend>
              <div className="space-y-1.5">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                  ราคา ({priceText || "ไม่มี"}{normalPriceText ? ` ← ${normalPriceText}` : ""})
                </label>
                {showPrice && priceText && (
                  <div>
                    <span className="text-[10px] text-stone-500">สี:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {PRICE_COLOR_PRESETS.map((preset) => (
                        <button key={preset.id} type="button" onClick={() => setPriceColor(preset.id)} title={preset.label}
                          className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${priceColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                        >{preset.id === "auto" ? <span className="text-[7px] text-white font-bold">A</span> : null}</button>
                      ))}
                    </div>
                  </div>
                )}
                {showPrice && priceText && (
                  <div>
                    <label className="inline-flex items-center gap-1 text-[11px] text-stone-700">
                      <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={priceBgEnabled} onChange={(e) => setPriceBgEnabled(e.target.checked)} />
                      กรอบสี
                    </label>
                    {priceBgEnabled && (
                      <>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {TEXT_BG_PRESETS.map((preset) => (
                            <button key={preset.id} type="button" onClick={() => setPriceBgColor(preset.id)} title={preset.label}
                              className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${priceBgColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-stone-500">โปร่งใส</span>
                          <input type="range" min={10} max={100} value={priceBgOpacity} onChange={(e) => setPriceBgOpacity(Number(e.target.value))} className="flex-1 accent-orange-500" />
                          <span className="text-[10px] text-stone-500 w-7 text-right">{priceBgOpacity}%</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <span className="text-[11px] text-stone-500 mb-0.5 block">CTA</span>
                  <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="input input-sm w-full" />
                </div>
                <div className="flex gap-1 pb-0.5">
                  {CTA_COLOR_PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => setCtaColor(preset.id)} title={preset.label}
                      className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${ctaColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}
                    />
                  ))}
                </div>
              </div>
            </fieldset>

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

