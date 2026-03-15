"use client";

import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { Sarabun, Prompt, Kanit, Mitr, Bai_Jamjuree } from "next/font/google";
import html2canvas from "html2canvas-pro";
import { AD_TEMPLATES } from "@/lib/adDesignerTemplates";
import type { AdTemplateState } from "@/lib/adDesignerTemplates";

const sarabun = Sarabun({ subsets: ["thai"], weight: ["400", "600", "700"] });
const prompt = Prompt({ subsets: ["thai"], weight: ["400", "600", "700"] });
const kanit = Kanit({ subsets: ["thai"], weight: ["400", "600", "700"] });
const mitr = Mitr({ subsets: ["thai"], weight: ["400", "600", "700"] });
const baiJamjuree = Bai_Jamjuree({ subsets: ["thai"], weight: ["400", "600", "700"] });

const FONT_OPTIONS = [
  { id: "sans", label: "System" },
  { id: "Sarabun", label: "Sarabun (TH)" },
  { id: "Prompt", label: "Prompt (TH)" },
  { id: "Kanit", label: "Kanit (TH)" },
  { id: "Mitr", label: "Mitr (TH)" },
  { id: "Bai_Jamjuree", label: "Bai Jamjuree (TH)" },
] as const;

function getFontClassName(fontId: string): string {
  switch (fontId) {
    case "Sarabun": return sarabun.className;
    case "Prompt": return prompt.className;
    case "Kanit": return kanit.className;
    case "Mitr": return mitr.className;
    case "Bai_Jamjuree": return baiJamjuree.className;
    default: return "";
  }
}

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
  product: AdImageDesignerProduct;
  context?: AdImageDesignerContext;
  onSaved?: () => void;
  backHref?: string;
  initialTemplateId?: string | null;
  initialTemplateState?: AdTemplateState | null;
  /** โหลด Ad Design จาก DB — แสดงปุ่ม อัปเดต / บันทึกชื่อ+หมายเหตุ / ลบ */
  initialAdDesignId?: string | null;
  initialAdDesignName?: string | null;
  initialAdDesignNote?: string | null;
  onSaveAdDesign?: (payload: { name: string; state: AdTemplateState }) => void | Promise<void>;
  onUpdateAdDesign?: (payload: { id: string; state: AdTemplateState }) => void | Promise<void>;
  onUpdateAdDesignMeta?: (id: string, payload: { name: string; note: string | null }) => void | Promise<void>;
  onDeleteAdDesign?: (id: string) => void | Promise<void>;
};

type AiField = "ad_title" | "ad_subtitle" | "ad_badge";

type BadgeShape = "rectangle" | "pill" | "circle";

type BadgeItem = {
  id: string;
  text: string;
  icon: string;
  textColor: string;
  bgColor: string;
  x: number;
  y: number;
  shape?: BadgeShape;
  padding?: number;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg";
  fontWeight?: "normal" | "semibold" | "bold";
};

const BADGE_PRESETS: { id: string; labelTh: string; labelEn: string; icon: string; bgColor: string; textColor: string; buttonClass: string }[] = [
  { id: "sale", labelTh: "โปรลดราคา", labelEn: "Sale", icon: "🏷️", bgColor: "red", textColor: "white", buttonClass: "bg-red-500 border-red-600 text-white hover:bg-red-600" },
  { id: "new", labelTh: "ใหม่", labelEn: "New", icon: "✨", bgColor: "green", textColor: "white", buttonClass: "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600" },
  { id: "bestseller", labelTh: "ขายดี", labelEn: "Best Seller", icon: "🔥", bgColor: "orange", textColor: "white", buttonClass: "bg-orange-500 border-orange-600 text-white hover:bg-orange-600" },
  { id: "freeshipping", labelTh: "ส่งฟรี", labelEn: "Free Shipping", icon: "🚚", bgColor: "blue", textColor: "white", buttonClass: "bg-sky-500 border-sky-600 text-white hover:bg-sky-600" },
  { id: "limited", labelTh: "จำนวนจำกัด", labelEn: "Limited", icon: "⏰", bgColor: "dark", textColor: "white", buttonClass: "bg-stone-800 border-stone-900 text-white hover:bg-stone-900" },
];

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

type BgPresetId =
  | "brand" | "pink" | "blue" | "green" | "white" | "dark"
  | "coral" | "red" | "rose" | "violet" | "purple" | "indigo" | "teal" | "cyan" | "lime" | "yellow" | "amber"
  | "slate" | "stone" | "navy" | "sunset" | "mint" | "lavender" | "peach" | "ocean" | "forest" | "berry" | "gold" | "gray" | "lightGray" | "cream" | "midnight";

const BG_PRESETS: { id: BgPresetId; label: string; canvasClass: string; buttonClass: string }[] = [
  { id: "brand", label: "ส้ม", canvasClass: "bg-linear-to-br from-orange-500 via-orange-400 to-amber-300", buttonClass: "bg-linear-to-r from-orange-500 to-amber-400 text-white" },
  { id: "pink", label: "ชมพู", canvasClass: "bg-linear-to-br from-fuchsia-500 via-pink-500 to-rose-400", buttonClass: "bg-linear-to-r from-fuchsia-500 to-rose-400 text-white" },
  { id: "blue", label: "ฟ้า", canvasClass: "bg-linear-to-br from-sky-500 via-blue-500 to-indigo-500", buttonClass: "bg-linear-to-r from-sky-500 to-indigo-500 text-white" },
  { id: "green", label: "เขียว", canvasClass: "bg-linear-to-br from-emerald-500 via-lime-500 to-amber-300", buttonClass: "bg-linear-to-r from-emerald-500 to-lime-400 text-white" },
  { id: "white", label: "ขาว", canvasClass: "bg-white", buttonClass: "bg-white text-stone-600 border-stone-300" },
  { id: "dark", label: "ดำ", canvasClass: "bg-stone-900", buttonClass: "bg-stone-900 text-white" },
  { id: "coral", label: "โครัล", canvasClass: "bg-linear-to-br from-red-400 via-orange-400 to-amber-400", buttonClass: "bg-linear-to-r from-red-400 to-orange-400 text-white" },
  { id: "red", label: "แดง", canvasClass: "bg-linear-to-br from-red-500 via-rose-500 to-pink-500", buttonClass: "bg-linear-to-r from-red-500 to-rose-500 text-white" },
  { id: "rose", label: "โรส", canvasClass: "bg-linear-to-br from-rose-500 via-pink-500 to-fuchsia-400", buttonClass: "bg-linear-to-r from-rose-500 to-pink-400 text-white" },
  { id: "violet", label: "ไวโอเลต", canvasClass: "bg-linear-to-br from-violet-500 via-purple-500 to-fuchsia-500", buttonClass: "bg-linear-to-r from-violet-500 to-purple-500 text-white" },
  { id: "purple", label: "ม่วง", canvasClass: "bg-linear-to-br from-purple-500 via-fuchsia-500 to-pink-500", buttonClass: "bg-linear-to-r from-purple-500 to-fuchsia-500 text-white" },
  { id: "indigo", label: "คราม", canvasClass: "bg-linear-to-br from-indigo-500 via-blue-500 to-sky-500", buttonClass: "bg-linear-to-r from-indigo-500 to-blue-500 text-white" },
  { id: "teal", label: "เทล", canvasClass: "bg-linear-to-br from-teal-500 via-cyan-500 to-sky-400", buttonClass: "bg-linear-to-r from-teal-500 to-cyan-500 text-white" },
  { id: "cyan", label: "ฟ้าอ่อน", canvasClass: "bg-linear-to-br from-cyan-400 via-sky-400 to-blue-400", buttonClass: "bg-linear-to-r from-cyan-400 to-sky-400 text-white" },
  { id: "lime", label: "ไลม์", canvasClass: "bg-linear-to-br from-lime-400 via-green-400 to-emerald-500", buttonClass: "bg-linear-to-r from-lime-400 to-green-400 text-white" },
  { id: "yellow", label: "เหลือง", canvasClass: "bg-linear-to-br from-yellow-400 via-amber-400 to-orange-400", buttonClass: "bg-linear-to-r from-yellow-400 to-amber-400 text-stone-800" },
  { id: "amber", label: "อำพัน", canvasClass: "bg-linear-to-br from-amber-500 via-orange-400 to-red-400", buttonClass: "bg-linear-to-r from-amber-500 to-orange-400 text-white" },
  { id: "slate", label: "สเลต", canvasClass: "bg-linear-to-br from-slate-600 via-slate-700 to-slate-800", buttonClass: "bg-linear-to-r from-slate-600 to-slate-800 text-white" },
  { id: "stone", label: "สโตน", canvasClass: "bg-linear-to-br from-stone-500 via-stone-600 to-stone-700", buttonClass: "bg-linear-to-r from-stone-500 to-stone-700 text-white" },
  { id: "navy", label: "เนวี", canvasClass: "bg-linear-to-br from-blue-900 via-indigo-900 to-slate-900", buttonClass: "bg-linear-to-r from-blue-900 to-indigo-900 text-white" },
  { id: "sunset", label: "ซันเซ็ต", canvasClass: "bg-linear-to-br from-orange-400 via-pink-500 to-rose-600", buttonClass: "bg-linear-to-r from-orange-400 via-pink-500 to-rose-600 text-white" },
  { id: "mint", label: "มินต์", canvasClass: "bg-linear-to-br from-emerald-300 via-teal-300 to-cyan-300", buttonClass: "bg-linear-to-r from-emerald-300 to-teal-300 text-stone-800" },
  { id: "lavender", label: "ลาเวนเดอร์", canvasClass: "bg-linear-to-br from-violet-300 via-purple-300 to-fuchsia-300", buttonClass: "bg-linear-to-r from-violet-300 to-purple-400 text-stone-800" },
  { id: "peach", label: "พีช", canvasClass: "bg-linear-to-br from-orange-300 via-rose-300 to-pink-300", buttonClass: "bg-linear-to-r from-orange-300 to-rose-300 text-stone-800" },
  { id: "ocean", label: "โอเชียน", canvasClass: "bg-linear-to-br from-cyan-500 via-blue-600 to-indigo-700", buttonClass: "bg-linear-to-r from-cyan-500 via-blue-600 to-indigo-700 text-white" },
  { id: "forest", label: "ฟอเรสต์", canvasClass: "bg-linear-to-br from-green-700 via-emerald-800 to-teal-900", buttonClass: "bg-linear-to-r from-green-700 to-emerald-900 text-white" },
  { id: "berry", label: "เบอร์รี่", canvasClass: "bg-linear-to-br from-fuchsia-600 via-purple-600 to-violet-700", buttonClass: "bg-linear-to-r from-fuchsia-600 to-purple-700 text-white" },
  { id: "gold", label: "ทอง", canvasClass: "bg-linear-to-br from-amber-400 via-yellow-500 to-amber-600", buttonClass: "bg-linear-to-r from-amber-400 to-yellow-500 text-stone-900" },
  { id: "gray", label: "เทา", canvasClass: "bg-stone-600", buttonClass: "bg-stone-600 text-white" },
  { id: "lightGray", label: "เทาอ่อน", canvasClass: "bg-stone-300", buttonClass: "bg-stone-300 text-stone-800" },
  { id: "cream", label: "ครีม", canvasClass: "bg-amber-50", buttonClass: "bg-amber-50 text-stone-700 border-stone-200" },
  { id: "midnight", label: "มิดไนท์", canvasClass: "bg-linear-to-br from-indigo-950 via-slate-900 to-stone-900", buttonClass: "bg-linear-to-r from-indigo-950 to-slate-900 text-white" },
];

function getBadgeContainerProps(b: BadgeItem, bgCls: string, txtCls: string): { className: string; style: React.CSSProperties } {
  const shape = b.shape ?? "pill";
  const padding = b.padding ?? 12;
  const borderRadius = b.borderRadius ?? 8;
  const base = "absolute z-25 inline-flex items-center justify-center gap-1 shadow-sm whitespace-nowrap cursor-move";
  if (shape === "circle") {
    const size = Math.max(32, padding * 2 + 14);
    return {
      className: `${base} rounded-full ${bgCls} ${txtCls}`,
      style: { left: b.x, top: b.y, padding: 0, width: size, height: size, minWidth: size, minHeight: size },
    };
  }
  if (shape === "rectangle") {
    return {
      className: `${base} ${bgCls} ${txtCls}`,
      style: { left: b.x, top: b.y, padding, borderRadius },
    };
  }
  return {
    className: `${base} rounded-full ${bgCls} ${txtCls}`,
    style: { left: b.x, top: b.y, padding },
  };
}

export const AdImageDesigner: React.FC<Props> = ({
  product,
  context,
  onSaved,
  backHref,
  initialTemplateId,
  initialTemplateState,
  initialAdDesignId,
  initialAdDesignName,
  initialAdDesignNote,
  onSaveAdDesign,
  onUpdateAdDesign,
  onUpdateAdDesignMeta,
  onDeleteAdDesign,
}) => {
  const [lang, setLang] = useState<Lang>("th");
  const [showSnapLines, setShowSnapLines] = useState(false);
  const [aspect, setAspect] = useState<Aspect>("1:1");
  const [bgPreset, setBgPreset] = useState<BgPresetId>("blue");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [ctaText, setCtaText] = useState("สั่งซื้อเลย");
  const [ctaColor, setCtaColor] = useState<string>("red");
  const [ctaBgColor, setCtaBgColor] = useState<string>("red");
  const [ctaTextColor, setCtaTextColor] = useState<string>("white");
  const [ctaFontFamily, setCtaFontFamily] = useState<string>("Prompt");
  const [ctaFontSize, setCtaFontSize] = useState<"sm" | "base" | "lg">("base");
  const [ctaFontWeight, setCtaFontWeight] = useState<"normal" | "semibold" | "bold">("semibold");
  const [ctaShape, setCtaShape] = useState<"rectangle" | "pill" | "circle">("pill");
  const [ctaPadding, setCtaPadding] = useState(14);
  const [ctaBorderRadius, setCtaBorderRadius] = useState(8);
  const [showLogo, setShowLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("top-right");
  const [overlayType, setOverlayType] = useState<"none" | "gradient" | "dark">("none");
  const [overlayOpacity, setOverlayOpacity] = useState(0.4);
  const [productCutoutStyle, setProductCutoutStyle] = useState(false);
  const [showPrice, setShowPrice] = useState(true);
  const [loadingField, setLoadingField] = useState<AiField | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({
    layout: true,
    image: true,
    discount: true,
    text: true,
    badges: true,
    price: true,
  });
  const toggleSection = (key: string) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [layout, setLayout] = useState<"split" | "overlay">("split");
  const [textColor, setTextColor] = useState<string>("white");
  const [priceColor, setPriceColor] = useState<string>("white");
  const [priceBgEnabled, setPriceBgEnabled] = useState(true);
  const [priceBgColor, setPriceBgColor] = useState<string>("red");
  const [priceBgOpacity, setPriceBgOpacity] = useState(92);
  const [priceFontFamily, setPriceFontFamily] = useState<string>("Prompt");
  const [priceFontSize, setPriceFontSize] = useState<"sm" | "base" | "lg">("lg");
  const [priceFontWeight, setPriceFontWeight] = useState<"normal" | "semibold" | "bold">("bold");
  const [priceShape, setPriceShape] = useState<"rectangle" | "pill" | "circle">("pill");
  const [pricePadding, setPricePadding] = useState(14);
  const [priceBorderRadius, setPriceBorderRadius] = useState(8);
  const [textShadow, setTextShadow] = useState<"none" | "soft" | "strong" | "stroke">("none");
  const [fontFamily, setFontFamily] = useState<string>("Prompt");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg">("base");
  const [titleFontSize, setTitleFontSize] = useState<"sm" | "base" | "lg">("lg");
  const [subtitleFontSize, setSubtitleFontSize] = useState<"sm" | "base" | "lg">("sm");
  const [titleFontFamily, setTitleFontFamily] = useState<string>("Prompt");
  const [subtitleFontFamily, setSubtitleFontFamily] = useState<string>("Prompt");
  const [fontWeight, setFontWeight] = useState<"normal" | "semibold" | "bold">("bold");
  const [titleFontWeight, setTitleFontWeight] = useState<"normal" | "semibold" | "bold">("bold");
  const [subtitleFontWeight, setSubtitleFontWeight] = useState<"normal" | "semibold" | "bold">("normal");
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">("left");
  const [layerZIndices, setLayerZIndices] = useState<Record<string, number>>({});
  const [showDiscountBadge, setShowDiscountBadge] = useState(true);
  const [discountBadgeColor, setDiscountBadgeColor] = useState<string>("red");
  const [discountBadgeTextColor, setDiscountBadgeTextColor] = useState<string>("white");
  const [discountBadgeFontFamily, setDiscountBadgeFontFamily] = useState<string>("Prompt");
  const [discountBadgeFontSize, setDiscountBadgeFontSize] = useState<"sm" | "base" | "lg">("base");
  const [discountBadgeFontWeight, setDiscountBadgeFontWeight] = useState<"normal" | "semibold" | "bold">("bold");
  const [discountBadgeShape, setDiscountBadgeShape] = useState<"rectangle" | "pill" | "circle">("pill");
  const [discountBadgePadding, setDiscountBadgePadding] = useState(12);
  const [discountBadgeBorderRadius, setDiscountBadgeBorderRadius] = useState(8);
  const [imageDim, setImageDim] = useState(100);
  const [textBgEnabled, setTextBgEnabled] = useState(false);
  const [textBgColor, setTextBgColor] = useState<string>("dark");
  const [textBgOpacity, setTextBgOpacity] = useState(92);
  const [showEyebrow, setShowEyebrow] = useState(true);
  const [showHeading, setShowHeading] = useState(true);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [imageScale, setImageScale] = useState(1);
  const [editableAdDesignName, setEditableAdDesignName] = useState(initialAdDesignName ?? "");
  const [editableAdDesignNote, setEditableAdDesignNote] = useState(initialAdDesignNote ?? "");
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [textPositions, setTextPositions] = useState<{ eyebrow: { x: number; y: number }; heading: { x: number; y: number }; subtitle: { x: number; y: number } }>({
    eyebrow: { x: 0, y: 0 },
    heading: { x: 0, y: 0 },
    subtitle: { x: 0, y: 0 },
  });
  // ส่วนลดใช้ right-4 top-4 (16px) ตรงเส้น — default เล็กน้อยเข้าในเพื่อกัน shadow (2px)
  // ตำแหน่งเริ่มต้น: 0,0 = ขอบขวา/บน ชิดเส้น content (right-4 top-4)
  const [discountBadgePos, setDiscountBadgePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pricePos, setPricePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [ctaPos, setCtaPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragInitialRef = useRef<{ x: number; y: number } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [loadingBadgeIcon, setLoadingBadgeIcon] = useState<string | null>(null);
  const loadingBadgeIconRef = useRef(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textSectionRef = useRef<HTMLFieldSetElement | null>(null);
  const badgesSectionRef = useRef<HTMLFieldSetElement | null>(null);
  const priceSectionRef = useRef<HTMLFieldSetElement | null>(null);
  const eyebrowInputRef = useRef<HTMLInputElement | null>(null);
  const headingInputRef = useRef<HTMLInputElement | null>(null);
  const subtitleInputRef = useRef<HTMLTextAreaElement | null>(null);

  const CLICK_THRESHOLD = 6;
  const SNAP_THRESHOLD = 6;
  const SNAP_THRESHOLD_TEXT = 4; // เล็ก — ต้องเข้าใกล้เส้นจริงๆ ถึง snap ไม่ติดเส้นอื่นก่อนถึง safe area
  const CONTENT_EDGE_PX = 16; // ตรงกับ left-4/right-4/top-4/bottom-4 ที่แสดงเป็นเส้น snap
  const DISCOUNT_SNAP_INSET = 2; // ส่วนลดใช้ right-4 top-4 (16px) เหมือนเส้น — inset เล็กน้อยกัน shadow
  const SAFE_AREA_MARGIN = 0.08;

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

  /** ขนาดเล็ก/กลาง/ใหญ่ ใช้ร่วมกันทุกที่: badge, ราคา, ส่วนลด, CTA */
  const sizeMap = { sm: "0.75rem", base: "1rem", lg: "1.25rem" } as const;
  const weightMap = { normal: 400, semibold: 600, bold: 700 };

  const discountBadgeBgCls = BADGE_BG_OPTIONS.find((o) => o.id === discountBadgeColor)?.cls ?? "bg-red-500";
  const discountBadgeTextCls = BADGE_TEXT_OPTIONS.find((o) => o.id === discountBadgeTextColor)?.cls ?? "text-white";
  const discountBadgeFontClassName = getFontClassName(discountBadgeFontFamily);
  const discountBadgeStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: sizeMap[discountBadgeFontSize],
    fontWeight: weightMap[discountBadgeFontWeight],
  }), [discountBadgeFontSize, discountBadgeFontWeight]);
  const discountBadgeContainerProps = useMemo((): { className: string; style: React.CSSProperties } => {
    const base = "inline-flex items-center justify-center shadow whitespace-nowrap";
    const bgCls = discountBadgeBgCls;
    const txtCls = discountBadgeTextCls;
    if (discountBadgeShape === "circle") {
      const size = Math.max(32, discountBadgePadding * 2 + 14);
      return {
        className: `${base} rounded-full ${bgCls} ${txtCls}`,
        style: { padding: 0, width: size, height: size, minWidth: size, minHeight: size },
      };
    }
    if (discountBadgeShape === "rectangle") {
      return {
        className: `${base} ${bgCls} ${txtCls}`,
        style: { padding: discountBadgePadding, borderRadius: discountBadgeBorderRadius },
      };
    }
    return {
      className: `${base} rounded-full ${bgCls} ${txtCls}`,
      style: { padding: discountBadgePadding },
    };
  }, [discountBadgeShape, discountBadgePadding, discountBadgeBorderRadius, discountBadgeColor, discountBadgeTextColor]);

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
    const bg = { backgroundColor: `rgba(${preset.rgb},${priceBgOpacity / 100})` };
    if (priceShape === "circle") {
      const size = Math.max(36, pricePadding * 2 + 20);
      return { ...bg, padding: 0, width: size, height: size, minWidth: size, minHeight: size, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" };
    }
    if (priceShape === "rectangle") {
      return { ...bg, padding: pricePadding, borderRadius: priceBorderRadius };
    }
    return { ...bg, padding: pricePadding, borderRadius: 9999 };
  }, [priceBgEnabled, priceBgColor, priceBgOpacity, priceShape, pricePadding, priceBorderRadius]);

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
    const preset = BG_PRESETS.find((p) => p.id === bgPreset);
    return preset?.canvasClass ?? "bg-linear-to-br from-sky-500 via-blue-500 to-indigo-500";
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
      case "stroke":
        return { textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" };
      default:
        return {};
    }
  }, [textShadow]);

  const textStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: sizeMap[fontSize],
    fontWeight: weightMap[fontWeight],
    textAlign,
  }), [fontSize, fontWeight, textAlign]);

  const headingTextStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: sizeMap[titleFontSize],
    fontWeight: weightMap[titleFontWeight],
    textAlign,
  }), [titleFontSize, titleFontWeight, textAlign]);

  const subtitleTextStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: sizeMap[subtitleFontSize],
    fontWeight: weightMap[subtitleFontWeight],
    textAlign,
  }), [subtitleFontSize, subtitleFontWeight, textAlign]);

  const fontClassName = getFontClassName(fontFamily);
  const headingFontClassName = getFontClassName(titleFontFamily);
  const subtitleFontClassName = getFontClassName(subtitleFontFamily);

  const allLayerIds = useMemo(() => {
    const ids = ["eyebrow", "heading", "subtitle", "price", "cta", "discountBadge", ...badges.map((b) => b.id)];
    return ids;
  }, [badges]);

  const getZIndex = useCallback(
    (id: string) => {
      if (layerZIndices[id] !== undefined) return layerZIndices[id]!;
      const defaultZ: Record<string, number> = {
        eyebrow: 10,
        heading: 11,
        subtitle: 12,
        price: 13,
        cta: 20,
        discountBadge: 21,
      };
      if (defaultZ[id] !== undefined) return defaultZ[id]!;
      return 14;
    },
    [layerZIndices, badges]
  );

  const bringToFront = () => {
    if (!selectedElementId) return;
    const current = allLayerIds.map((id) => getZIndex(id));
    const maxZ = Math.max(...current, 21);
    setLayerZIndices((prev) => ({ ...prev, [selectedElementId]: maxZ + 1 }));
  };

  const sendToBack = () => {
    if (!selectedElementId) return;
    const current = allLayerIds.map((id) => getZIndex(id));
    const minZ = Math.min(...current, 10);
    setLayerZIndices((prev) => ({ ...prev, [selectedElementId]: minZ - 1 }));
  };

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

  const ctaBgCls = BADGE_BG_OPTIONS.find((o) => o.id === ctaBgColor)?.cls ?? "bg-red-500";
  const ctaTextCls = BADGE_TEXT_OPTIONS.find((o) => o.id === ctaTextColor)?.cls ?? "text-white";
  const ctaFontClassName = getFontClassName(ctaFontFamily);
  const ctaFontStyle = useMemo<React.CSSProperties>(() => ({ fontSize: sizeMap[ctaFontSize], fontWeight: weightMap[ctaFontWeight] }), [ctaFontSize, ctaFontWeight]);
  const priceFontClassName = getFontClassName(priceFontFamily);
  const priceFontStyle = useMemo<React.CSSProperties>(() => ({ fontSize: sizeMap[priceFontSize], fontWeight: weightMap[priceFontWeight] }), [priceFontSize, priceFontWeight]);

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

  const getCurrentTemplateState = useCallback((): AdTemplateState => {
    return {
      layout,
      aspect,
      bgPreset,
      textPositions,
      pricePos,
      ctaPos,
      discountBadgePos,
      badges: badges.map((b) => ({
        id: b.id,
        text: b.text,
        icon: b.icon,
        textColor: b.textColor,
        bgColor: b.bgColor,
        x: b.x,
        y: b.y,
        shape: b.shape,
        padding: b.padding,
        borderRadius: b.borderRadius,
        fontFamily: b.fontFamily,
        fontSize: b.fontSize,
        fontWeight: b.fontWeight,
      })),
      ctaText,
      ctaColor,
      ctaBgColor,
      ctaTextColor,
      ctaFontFamily,
      ctaFontSize,
      ctaFontWeight,
      ctaShape,
      ctaPadding,
      ctaBorderRadius,
      priceFontFamily,
      priceFontSize,
      priceFontWeight,
      priceShape,
      pricePadding,
      priceBorderRadius,
      showPrice,
      showLogo,
      showEyebrow,
      showHeading,
      showSubtitle,
      showDiscountBadge,
      discountBadgeShape,
      discountBadgePadding,
      discountBadgeBorderRadius,
      discountBadgeBgColor: discountBadgeColor,
      discountBadgeTextColor,
      discountBadgeFontFamily,
      discountBadgeFontSize,
      discountBadgeFontWeight,
      overlayType,
      overlayOpacity,
      logoPosition,
      productCutoutStyle,
      defaultTitle: title || undefined,
      defaultSubtitle: subtitle || undefined,
      defaultEyebrow: eyebrowCustom || undefined,
    };
  }, [layout, aspect, bgPreset, textPositions, pricePos, ctaPos, discountBadgePos, badges, ctaText, ctaColor, ctaBgColor, ctaTextColor, ctaFontFamily, ctaFontSize, ctaFontWeight, ctaShape, ctaPadding, ctaBorderRadius, priceFontFamily, priceFontSize, priceFontWeight, priceShape, pricePadding, priceBorderRadius, showPrice, showLogo, showEyebrow, showHeading, showSubtitle, showDiscountBadge, discountBadgeShape, discountBadgePadding, discountBadgeBorderRadius, discountBadgeColor, discountBadgeTextColor, discountBadgeFontFamily, discountBadgeFontSize, discountBadgeFontWeight, overlayType, overlayOpacity, logoPosition, productCutoutStyle, title, subtitle, eyebrowCustom]);

  const handleExport = useCallback(
    async (mode: "download" | "save", filenameSuffix?: string) => {
      if (!canvasRef.current || saving) return;
      setSaving(true);
      setError(null);
      try {
        const node = canvasRef.current;
        const guides = node.querySelectorAll("[data-ad-snap-guide]");
        guides.forEach((el) => { (el as HTMLElement).style.visibility = "hidden"; });

        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: null,
        });
        guides.forEach((el) => { (el as HTMLElement).style.visibility = ""; });

        const dataUrl = canvas.toDataURL("image/png");

        if (mode === "download") {
          const a = document.createElement("a");
          a.href = dataUrl;
          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          a.download = filenameSuffix ? `ad-${product.id}-${filenameSuffix}-${ts}.png` : `ad-${product.id}-${ts}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const fd = new FormData();
          fd.append("file", blob, `ad-${product.id}.png`);
          fd.append("productId", product.id);
          if (context?.marketingPackId) fd.append("marketingPackId", context.marketingPackId);
          fd.append("prompt", `ad-designer:${lang}:${aspect}`);

          const saveRes = await fetch("/api/admin/marketing-assets/upload-direct", {
            method: "POST",
            body: fd,
          });
          if (!saveRes.ok) throw new Error("Upload failed");
          const saveData = (await saveRes.json()) as { success?: boolean; error?: string };
          if (!saveData.success) {
            throw new Error(saveData.error || "Save asset invalid");
          }
          // ถามว่าจะ save Ad Design ลง DB ด้วยไหม — ถ้ากดยกเลิก อยู่หน้าเดิมไม่ redirect
          if (onSaveAdDesign && typeof window !== "undefined" && window.confirm("บันทึกภาพเข้า Marketing Assets แล้ว — จะบันทึก Ad Design ลง DB ด้วยไหม? (เพื่อโหลดกลับมาแก้ต่อได้)")) {
            const name = `Design ${new Date().toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`;
            await onSaveAdDesign({ name, state: getCurrentTemplateState() });
            if (onSaved) onSaved();
          }
          // กดยกเลิก = ไม่ redirect อยู่หน้า ad designer ต่อ
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[AdImageDesigner] export error", msg, err);
        setError(`ไม่สามารถสร้างภาพได้: ${msg}`);
      } finally {
        setSaving(false);
      }
    },
    [aspect, context?.marketingPackId, getCurrentTemplateState, lang, onSaveAdDesign, onSaved, product.id, saving]
  );

  const dragTargetRef = useRef<string | null>(null);
  const ctaElRef = useRef<HTMLDivElement | null>(null);
  const discountBadgeElRef = useRef<HTMLDivElement | null>(null);
  const dragBadgeElRef = useRef<HTMLDivElement | null>(null);
  const priceElRef = useRef<HTMLDivElement | null>(null);

  const startDrag = (targetId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragTargetRef.current = targetId;
    setDragTarget(targetId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragInitialRef.current = { x: e.clientX, y: e.clientY };
    if (targetId.startsWith("badge-")) {
      dragBadgeElRef.current = e.currentTarget as HTMLDivElement;
      priceElRef.current = null;
    } else if (targetId === "price") {
      priceElRef.current = e.currentTarget as HTMLDivElement;
      dragBadgeElRef.current = null;
    } else {
      dragBadgeElRef.current = null;
      priceElRef.current = null;
    }
  };

  const snapToGuides = (val: number, targets: number[], threshold: number) => {
    for (const t of targets) {
      if (Math.abs(val - t) <= threshold) return t;
    }
    return val;
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragTargetRef.current || !dragStartRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      const target = dragTargetRef.current;

      const cx = rect ? rect.width / 2 : 0;
      const cy = rect ? rect.height / 2 : 0;
      const edge = CONTENT_EDGE_PX;
      const leftEdge = edge;
      const rightEdge = rect ? rect.width - edge : 400 - edge;
      const topEdge = edge;
      const bottomEdge = rect ? rect.height - edge : 400 - edge;
      const outerRight = rect ? rect.width : 400;
      const outerBottom = rect ? rect.height : 400;
      // Safe area = 8% จากขอบ (ตรงกับเส้น rounded dashed บน canvas)
      const leftSafe = rect ? rect.width * SAFE_AREA_MARGIN : 400 * SAFE_AREA_MARGIN;
      const rightSafe = rect ? rect.width * (1 - SAFE_AREA_MARGIN) : 400 * (1 - SAFE_AREA_MARGIN);
      const topSafe = rect ? rect.height * SAFE_AREA_MARGIN : 400 * SAFE_AREA_MARGIN;
      const bottomSafe = rect ? rect.height * (1 - SAFE_AREA_MARGIN) : 400 * (1 - SAFE_AREA_MARGIN);
      // Text + Price อยู่ใน div p-4 → จุดเริ่ม = (edge, edge) → snap ขอบกล่อง (ใส่กรอบแล้วกรอบไม่เกินเข้าไป)
      const snapXText = [-edge, 0, leftSafe - edge, cx - edge, rightSafe - edge, rightEdge - edge, outerRight - edge];
      const snapYText = [-edge, 0, topSafe - edge, cy - edge, bottomSafe - edge, bottomEdge - edge, outerBottom - edge];
      // Badge ใช้ left/top ใน canvas โดยตรง → ใช้พิกัด canvas
      const snapXBadge = [0, leftEdge, leftSafe, cx, rightSafe, rightEdge, outerRight];
      const snapYBadge = [0, topEdge, topSafe, cy, bottomSafe, bottomEdge, outerBottom];

      if (target === "image") {
        setImageOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      } else if (target === "eyebrow" || target === "heading" || target === "subtitle") {
        setTextPositions((prev) => {
          const next = { x: prev[target].x + dx, y: prev[target].y + dy };
          next.x = snapToGuides(next.x, snapXText, SNAP_THRESHOLD_TEXT);
          next.y = snapToGuides(next.y, snapYText, SNAP_THRESHOLD_TEXT);
          return { ...prev, [target]: next };
        });
      } else if (target === "discountBadge") {
        const el = discountBadgeElRef.current;
        const w = el ? el.getBoundingClientRect().width : 0;
        const h = el ? el.getBoundingClientRect().height : 0;
        // ใช้ edge เดียวกับเส้น snap (right-4 top-4 = CONTENT_EDGE_PX) — เปลี่ยนขนาด canvas ก็ยังคำนวณจาก rect
        const offR = edge;
        const offT = edge;
        const rightEdgeAtGuide = rect ? rightEdge - (rect.width - offR) - DISCOUNT_SNAP_INSET : -DISCOUNT_SNAP_INSET;
        const topEdgeAtGuide = topEdge - offT + DISCOUNT_SNAP_INSET;
        // ส่วนลด right-4 top-4: กรอบใน + Safe area + กรอบนอก
        const outerRightDiscount = offR;
        const outerLeftDiscount = rect ? offR - rect.width + w : -400 + w;
        const outerTopDiscount = -offT;
        const outerBottomDiscount = rect ? rect.height - offT - h : 400 - offT - h;
        const safeRightDiscount = rect ? rightSafe - (rect.width - offR) : rightSafe - 400 + offR;
        const safeLeftDiscount = rect ? leftSafe - (rect.width - offR - w) : leftSafe - 400 + offR + w;
        const safeTopDiscount = topSafe - offT;
        const safeBottomDiscount = rect ? bottomSafe - offT - h : bottomSafe - offT - h;
        const snapX = rect
          ? [0, rightEdgeAtGuide, outerRightDiscount, safeRightDiscount, leftEdge - (rect.width - offR - w), safeLeftDiscount, outerLeftDiscount, cx - (rect.width - offR - w), rightEdge - (rect.width - offR - w)]
          : snapXBadge;
        const snapY = rect ? [0, topEdgeAtGuide, outerTopDiscount, safeTopDiscount, cy - offT, bottomEdge - offT - h, safeBottomDiscount, outerBottomDiscount] : snapYBadge;
        setDiscountBadgePos((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy };
          next.x = snapToGuides(next.x, snapX, SNAP_THRESHOLD_TEXT);
          next.y = snapToGuides(next.y, snapY, SNAP_THRESHOLD_TEXT);
          return next;
        });
      } else if (target === "price") {
        const el = priceElRef.current;
        const pw = el ? el.getBoundingClientRect().width : 0;
        const ph = el ? el.getBoundingClientRect().height : 0;
        // X: content-relative เหมือน text + จุดขอบขวาชิดเส้น
        const snapXPrice = [...snapXText, rightSafe - edge - pw, rightEdge - edge - pw, outerRight - edge - pw];
        // ราคาอยู่ใน mt-auto → จุดเริ่มอยู่ล่าง → y เป็น offset จากล่าง ต้องคำนวณจุด snap ด้านบนแยก (ขอบบนชิดเส้น = defaultPriceTop + y = targetTop → y = targetTop - defaultPriceTop)
        const defaultPriceTop = rect ? rect.height - edge - ph : 400 - edge - ph;
        const snapYPrice = rect
          ? [
              // ขอบบนชิดเส้น: บนนอก, กรอบใน, safe, กลาง
              0 - defaultPriceTop,
              topEdge - defaultPriceTop,
              topSafe - defaultPriceTop,
              cy - defaultPriceTop,
              // ขอบล่างชิดเส้น
              bottomSafe - ph - defaultPriceTop,
              bottomEdge - ph - defaultPriceTop,
              outerBottom - ph - defaultPriceTop,
            ]
          : snapYText;
        setPricePos((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy };
          next.x = snapToGuides(next.x, snapXPrice, SNAP_THRESHOLD_TEXT);
          next.y = snapToGuides(next.y, snapYPrice, SNAP_THRESHOLD_TEXT);
          return next;
        });
      } else if (target === "cta") {
        const el = ctaElRef.current;
        const w = el ? el.getBoundingClientRect().width : 0;
        const h = el ? el.getBoundingClientRect().height : 0;
        const offR = edge;
        const offB = edge; // right-4 bottom-4 = CONTENT_EDGE_PX
        // CTA: กรอบใน + Safe area + กรอบนอก
        const ctaOuterRight = offR;
        const ctaOuterLeft = rect ? offR - rect.width + w : -400 + w;
        const ctaOuterTop = rect ? offB - rect.height + h : -400 + h;
        const ctaOuterBottom = offB;
        const ctaSafeRight = rect ? rightSafe - (rect.width - offR) : rightSafe - 400 + offR;
        const ctaSafeLeft = rect ? leftSafe - (rect.width - offR - w) : leftSafe - 400 + offR + w;
        const ctaSafeTop = rect ? topSafe - (rect.height - offB - h) : topSafe - 400 + offB + h;
        const ctaSafeBottom = rect ? bottomSafe - (rect.height - offB) : bottomSafe - 400 + offB;
        const snapX = rect
          ? [0, ctaOuterRight, ctaOuterLeft, ctaSafeRight, ctaSafeLeft, leftEdge - (rect.width - offR - w), cx - (rect.width - offR - w), rightEdge - (rect.width - offR - w)]
          : snapXBadge;
        const snapY = rect
          ? [0, ctaOuterBottom, ctaOuterTop, ctaSafeBottom, ctaSafeTop, topEdge - (rect.height - offB - h), cy - (rect.height - offB - h), bottomEdge - (rect.height - offB - h)]
          : snapYBadge;
        setCtaPos((prev) => {
          const next = { x: prev.x + dx, y: prev.y + dy };
          next.x = snapToGuides(next.x, snapX, SNAP_THRESHOLD_TEXT);
          next.y = snapToGuides(next.y, snapY, SNAP_THRESHOLD_TEXT);
          return next;
        });
      } else if (target.startsWith("badge-")) {
        const el = dragBadgeElRef.current;
        const bw = el ? el.getBoundingClientRect().width : 0;
        const bh = el ? el.getBoundingClientRect().height : 0;
        // badge มุมซ้ายบน → เพิ่มจุดขวา/ล่าง: กรอบใน + Safe area + กรอบนอก
        const snapXBadgeWithRight = rect ? [...snapXBadge, rightSafe - bw, rightEdge - bw, outerRight - bw] : snapXBadge;
        const snapYBadgeWithBottom = rect ? [...snapYBadge, bottomSafe - bh, bottomEdge - bh, outerBottom - bh] : snapYBadge;
        setBadges((prev) =>
          prev.map((b) => {
            if (b.id !== target) return b;
            let nx = b.x + dx;
            let ny = b.y + dy;
            nx = snapToGuides(nx, snapXBadgeWithRight, SNAP_THRESHOLD_TEXT);
            ny = snapToGuides(ny, snapYBadgeWithBottom, SNAP_THRESHOLD_TEXT);
            return { ...b, x: nx, y: ny };
          })
        );
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const target = dragTargetRef.current;
      const initial = dragInitialRef.current;
      const totalMoved = initial
        ? Math.hypot(e.clientX - initial.x, e.clientY - initial.y)
        : 999;
      if (target && totalMoved < CLICK_THRESHOLD) {
        setSelectedElementId(target);
      }
      dragTargetRef.current = null;
      setDragTarget(null);
      dragStartRef.current = null;
      dragInitialRef.current = null;
      dragBadgeElRef.current = null;
      priceElRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const addBadge = () => {
    const newId = newBadgeId();
    const newBadge: BadgeItem = {
      id: newId,
      text: lang === "th" ? "ข้อความ badge" : "Badge text",
      icon: "",
      textColor: "dark",
      bgColor: "white",
      x: 16,
      y: 200 + badges.length * 35,
      shape: "pill",
      padding: 12,
      borderRadius: 8,
      fontFamily: "Prompt",
      fontSize: "base",
      fontWeight: "semibold",
    };
    setBadges((prev) => [...prev, newBadge]);
    const maxZ = Math.max(...allLayerIds.map((id) => getZIndex(id)), 21);
    setLayerZIndices((prev) => ({ ...prev, [newId]: maxZ + 1 }));
    setEditingBadgeId(newBadge.id);
  };

  const addBadgeFromPreset = (presetId: string) => {
    const preset = BADGE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const label = lang === "th" ? preset.labelTh : preset.labelEn;
    const newId = newBadgeId();
    const newBadge: BadgeItem = {
      id: newId,
      text: label,
      icon: preset.icon,
      textColor: preset.textColor,
      bgColor: preset.bgColor,
      x: 16,
      y: 200 + badges.length * 35,
      shape: "pill",
      padding: 12,
      borderRadius: 8,
      fontFamily: "Prompt",
      fontSize: "base",
      fontWeight: "semibold",
    };
    setBadges((prev) => [...prev, newBadge]);
    const maxZ = Math.max(...allLayerIds.map((id) => getZIndex(id)), 21);
    setLayerZIndices((prev) => ({ ...prev, [newId]: maxZ + 1 }));
    setEditingBadgeId(newBadge.id);
  };

  const removeBadge = (id: string) => {
    setBadges((prev) => prev.filter((b) => b.id !== id));
    if (editingBadgeId === id) setEditingBadgeId(null);
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const duplicateElement = () => {
    if (!selectedElementId) return;
    if (selectedElementId.startsWith("badge-")) {
      const b = badges.find((x) => x.id === selectedElementId);
      if (!b) return;
      const newBadge: BadgeItem = { ...b, id: newBadgeId(), x: b.x + 12, y: b.y + 12 };
      setBadges((prev) => [...prev, newBadge]);
      setSelectedElementId(newBadge.id);
      setEditingBadgeId(newBadge.id);
    }
  };

  const deleteElement = () => {
    if (!selectedElementId) return;
    if (selectedElementId.startsWith("badge-")) {
      removeBadge(selectedElementId);
      return;
    }
    switch (selectedElementId) {
      case "eyebrow":
        setShowEyebrow(false);
        break;
      case "heading":
        setShowHeading(false);
        break;
      case "subtitle":
        setShowSubtitle(false);
        break;
      case "price":
        setShowPrice(false);
        break;
      case "cta":
        setCtaText("");
        break;
      case "discountBadge":
        setShowDiscountBadge(false);
        break;
      default:
        break;
    }
    setSelectedElementId(null);
  };

  useEffect(() => {
    if (!selectedElementId || !panelRef.current) return;
    const section =
      selectedElementId === "eyebrow" || selectedElementId === "heading" || selectedElementId === "subtitle"
        ? textSectionRef.current
        : selectedElementId.startsWith("badge-")
          ? badgesSectionRef.current
          : priceSectionRef.current;
    section?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedElementId]);

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

  const exportAllSizes = useCallback(async () => {
    if (saving) return;
    const aspects: Aspect[] = ["1:1", "4:5", "9:16"];
    const original = aspect;
    for (let i = 0; i < aspects.length; i++) {
      const a = aspects[i]!;
      setAspect(a);
      await new Promise((r) => setTimeout(r, 350));
      await handleExport("download", a.replace(":", "-"));
    }
    setAspect(original);
  }, [aspect, saving, handleExport]);

  const applyTemplateState = useCallback((s: AdTemplateState) => {
    setLayout(s.layout);
    setAspect(s.aspect);
    setBgPreset((s.bgPreset as BgPresetId) || "blue");
    setTextPositions(s.textPositions);
    setPricePos(s.pricePos);
    setCtaPos(s.ctaPos);
    setDiscountBadgePos(s.discountBadgePos);
    const ext = s as Record<string, unknown>;
    if (ext.discountBadgeShape != null) setDiscountBadgeShape(ext.discountBadgeShape as "rectangle" | "pill" | "circle");
    if (ext.discountBadgePadding != null) setDiscountBadgePadding(Number(ext.discountBadgePadding));
    if (ext.discountBadgeBorderRadius != null) setDiscountBadgeBorderRadius(Number(ext.discountBadgeBorderRadius));
    if (ext.discountBadgeBgColor != null) setDiscountBadgeColor(ext.discountBadgeBgColor as string);
    if (ext.discountBadgeTextColor != null) setDiscountBadgeTextColor(ext.discountBadgeTextColor as string);
    if (ext.discountBadgeFontFamily != null) setDiscountBadgeFontFamily(ext.discountBadgeFontFamily as string);
    if (ext.discountBadgeFontSize != null) setDiscountBadgeFontSize(ext.discountBadgeFontSize as "sm" | "base" | "lg");
    if (ext.discountBadgeFontWeight != null) setDiscountBadgeFontWeight(ext.discountBadgeFontWeight as "normal" | "semibold" | "bold");
    setBadges(
      s.badges.map((b) => ({
        ...b,
        id: newBadgeId(),
        shape: b.shape ?? "pill",
        padding: b.padding ?? 12,
        borderRadius: b.borderRadius ?? 8,
      }))
    );
    setCtaText(s.ctaText);
    setCtaColor(s.ctaColor);
    if (ext.ctaBgColor != null) setCtaBgColor(ext.ctaBgColor as string);
    else if (s.ctaColor) setCtaBgColor(s.ctaColor);
    if (ext.ctaTextColor != null) setCtaTextColor(ext.ctaTextColor as string);
    else if (s.ctaColor) setCtaTextColor("white");
    if (ext.ctaFontFamily != null) setCtaFontFamily(ext.ctaFontFamily as string);
    if (ext.ctaFontSize != null) setCtaFontSize(ext.ctaFontSize as "sm" | "base" | "lg");
    if (ext.ctaFontWeight != null) setCtaFontWeight(ext.ctaFontWeight as "normal" | "semibold" | "bold");
    if (ext.ctaShape != null) setCtaShape(ext.ctaShape as "rectangle" | "pill" | "circle");
    if (ext.ctaPadding != null) setCtaPadding(Number(ext.ctaPadding));
    if (ext.ctaBorderRadius != null) setCtaBorderRadius(Number(ext.ctaBorderRadius));
    if (ext.priceFontFamily != null) setPriceFontFamily(ext.priceFontFamily as string);
    if (ext.priceFontSize != null) setPriceFontSize(ext.priceFontSize as "sm" | "base" | "lg");
    if (ext.priceFontWeight != null) setPriceFontWeight(ext.priceFontWeight as "normal" | "semibold" | "bold");
    if (ext.priceShape != null) setPriceShape(ext.priceShape as "rectangle" | "pill" | "circle");
    if (ext.pricePadding != null) setPricePadding(Number(ext.pricePadding));
    if (ext.priceBorderRadius != null) setPriceBorderRadius(Number(ext.priceBorderRadius));
    setShowPrice(s.showPrice);
    setShowLogo(s.showLogo);
    setShowEyebrow(s.showEyebrow);
    setShowHeading(s.showHeading);
    setShowSubtitle(s.showSubtitle);
    setShowDiscountBadge(s.showDiscountBadge);
    if (s.overlayType !== undefined) setOverlayType(s.overlayType);
    if (s.overlayOpacity !== undefined) setOverlayOpacity(s.overlayOpacity);
    if (s.logoPosition) setLogoPosition(s.logoPosition);
    if (s.productCutoutStyle !== undefined) setProductCutoutStyle(s.productCutoutStyle);
    if (s.defaultEyebrow) setEyebrowCustom(s.defaultEyebrow);
    if (s.defaultSubtitle) setSubtitle(s.defaultSubtitle);
    if (s.defaultTitle) setTitle(s.defaultTitle);
  }, []);

  useEffect(() => {
    if (initialTemplateState) {
      applyTemplateState(initialTemplateState);
      return;
    }
    if (!initialTemplateId) return;
    const template = AD_TEMPLATES.find((t) => t.id === initialTemplateId);
    if (!template) return;
    applyTemplateState(template.state);
  }, [initialTemplateId, initialTemplateState, applyTemplateState]);

  useEffect(() => {
    setEditableAdDesignName(initialAdDesignName ?? "");
    setEditableAdDesignNote(initialAdDesignNote ?? "");
  }, [initialAdDesignId, initialAdDesignName, initialAdDesignNote]);

  return (
    <div className="h-full bg-white rounded-2xl shadow-xl w-full max-w-[1400px] flex flex-col border border-stone-200 min-h-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-stone-200 bg-white rounded-t-2xl shrink-0">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="rounded-full p-1.5 hover:bg-stone-100 text-stone-500 shrink-0"
              title="กลับ"
            >
              ←
            </Link>
          )}
          <div>
            <h2 className="text-base font-semibold text-stone-800">Ads Creator</h2>
            <p className="text-xs text-stone-500">
              {displayName || "เลือกสินค้า"} • เลือก layout แล้วปรับข้อความเพื่อใช้ใน Shopee / Lazada / Social
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        {/* Preview - sticky so canvas stays visible when scrolling right panel */}
        <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-stone-200 p-4 flex flex-col items-center justify-start gap-2 overflow-y-auto min-h-0 shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
              <button
                type="button"
                onClick={() => setAspect("1:1")}
                className={`px-2 py-0.5 rounded-full ${aspect === "1:1" ? "bg-white shadow text-stone-900" : "opacity-70"}`}
              >
                1:1
              </button>
              <button
                type="button"
                onClick={() => setAspect("4:5")}
                className={`px-2 py-0.5 rounded-full ${aspect === "4:5" ? "bg-white shadow text-stone-900" : "opacity-70"}`}
              >
                4:5
              </button>
              <button
                type="button"
                onClick={() => setAspect("9:16")}
                className={`px-2 py-0.5 rounded-full ${aspect === "9:16" ? "bg-white shadow text-stone-900" : "opacity-70"}`}
              >
                9:16
              </button>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-600">
              <button
                type="button"
                onClick={() => setLang("th")}
                className={`px-2 py-0.5 rounded-full ${lang === "th" ? "bg-white shadow text-stone-900" : "opacity-70"}`}
              >
                TH
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded-full ${lang === "en" ? "bg-white shadow text-stone-900" : "opacity-70"}`}
              >
                EN
              </button>
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-600 cursor-pointer">
              <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showSnapLines} onChange={(e) => setShowSnapLines(e.target.checked)} />
              เส้น snap
            </label>
          </div>

          <div
            ref={canvasRef}
            className={`relative w-full max-w-[420px] mx-auto shrink-0 rounded-[28px] overflow-hidden shadow-xl ${bgClass} cursor-move`}
            style={{ aspectRatio: aspect === "4:5" ? "4/5" : aspect === "9:16" ? "9/16" : "1/1" }}
            onMouseDown={(e) => startDrag("image", e)}
          >
            {/* Snap guide lines — แนวขอบเนื้อหา (p-4 = 16px) ซ้าย ขวา บน ล่าง — title จะ snap เมื่อขอบซ้ายชนเส้น */}
            {showSnapLines && (
              <>
                <div data-ad-snap-guide className="absolute left-4 top-0 bottom-0 w-0 border-l border-dashed border-white/50 pointer-events-none z-[9999]" aria-hidden />
                <div data-ad-snap-guide className="absolute right-4 top-0 bottom-0 w-0 border-r border-dashed border-white/50 pointer-events-none z-[9999]" aria-hidden />
                <div data-ad-snap-guide className="absolute top-4 left-0 right-0 h-0 border-t border-dashed border-white/50 pointer-events-none z-[9999]" aria-hidden />
                <div data-ad-snap-guide className="absolute bottom-4 left-0 right-0 h-0 border-b border-dashed border-white/50 pointer-events-none z-[9999]" aria-hidden />
              </>
            )}
            {layout === "overlay" ? (
              <>
                {primaryImage && (
                  <div
                    className={`absolute inset-0 z-[1] pointer-events-none ${productCutoutStyle ? "rounded-2xl overflow-hidden" : ""}`}
                    style={{
                      transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                      transformOrigin: "center",
                      boxShadow: productCutoutStyle ? "0 25px 50px -12px rgba(0,0,0,0.25)" : undefined,
                    }}
                  >
                    <img src={primaryImage} alt="" className="w-full h-full object-cover" />
                    {imageDim < 100 && <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${(100 - imageDim) / 100})` }} />}
                  </div>
                )}
                {overlayType !== "none" && (
                  <div
                    className="absolute inset-0 z-[5] pointer-events-none"
                    style={
                      overlayType === "gradient"
                        ? { background: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 100%)" }
                        : { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }
                    }
                  />
                )}
                {showLogo && product.shopLogoUrl && (
                  <div
                    className={`absolute z-[15] shrink-0 pointer-events-none ${
                      logoPosition === "top-left" ? "top-4 left-4" : logoPosition === "top-right" ? "top-4 right-4" : logoPosition === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4"
                    }`}
                  >
                    <img src={product.shopLogoUrl} alt="logo" className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 p-4 flex flex-col pointer-events-none" style={{ ...textShadowStyle, zIndex: 9 }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 max-w-[75%]">
                      {showEyebrow && (
                        <div
                          className={`inline-block self-start text-[11px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${fontClassName} ${eyebrowColorClass} ${selectedElementId === "eyebrow" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.eyebrow.x}px, ${textPositions.eyebrow.y}px)`, ...textBgStyle, ...textStyle, zIndex: getZIndex("eyebrow") }}
                          onMouseDown={(e) => startDrag("eyebrow", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); eyebrowInputRef.current?.focus(); }}
                        >
                          {eyebrowText}
                        </div>
                      )}
                      {showHeading && (
                        <div
                          className={`inline-block self-start leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${headingFontClassName} ${headingColorClass} ${selectedElementId === "heading" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.heading.x}px, ${textPositions.heading.y}px)`, ...textBgStyle, ...headingTextStyle, zIndex: getZIndex("heading") }}
                          onMouseDown={(e) => startDrag("heading", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); headingInputRef.current?.focus(); }}
                        >
                          {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                        </div>
                      )}
                      {showSubtitle && (
                        <div
                          className={`inline-block self-start leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move pointer-events-auto ${subtitleFontClassName} ${bodyColorClass} ${selectedElementId === "subtitle" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.subtitle.x}px, ${textPositions.subtitle.y}px)`, ...textBgStyle, ...subtitleTextStyle, zIndex: getZIndex("subtitle") }}
                          onMouseDown={(e) => startDrag("subtitle", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); subtitleInputRef.current?.focus(); }}
                        >
                          {subtitle ||
                            defaultSubtitle ||
                            (lang === "th" ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า" : "Short line about the main benefits")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto pointer-events-auto">
                    {showPrice && priceText && (
                      <div
                        ref={priceElRef}
                        className={`inline-flex items-baseline gap-2 cursor-move ${priceFontClassName} ${selectedElementId === "price" ? "ring-2 ring-orange-400 ring-offset-1 rounded" : ""}`}
                        style={{ ...priceBgStyle, ...priceFontStyle, transform: `translate(${pricePos.x}px, ${pricePos.y}px)`, zIndex: getZIndex("price") }}
                        onMouseDown={(e) => startDrag("price", e)}
                      >
                        <span className={priceColorClass}>{priceText}</span>
                        {normalPriceText && (
                          <span className={`line-through ${strikeColorClass}`} style={{ fontSize: "0.875rem" }}>{normalPriceText}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {badges.map((b) => {
                  const bgCls = BADGE_BG_OPTIONS.find((o) => o.id === b.bgColor)?.cls ?? "bg-white/90";
                  const txtCls = BADGE_TEXT_OPTIONS.find((o) => o.id === b.textColor)?.cls ?? "text-stone-900";
                  const { className, style } = getBadgeContainerProps(b, bgCls, txtCls);
const badgeFontClassName = getFontClassName(b.fontFamily ?? "Prompt");
                    const badgeFontStyle: React.CSSProperties = { fontSize: sizeMap[b.fontSize ?? "base"], fontWeight: weightMap[b.fontWeight ?? "semibold"] };
                    return (
                    <div key={b.id} className={`${className} ${badgeFontClassName} ${selectedElementId === b.id ? "ring-2 ring-orange-400 ring-offset-1" : ""}`} style={{ ...style, ...badgeFontStyle, zIndex: getZIndex(b.id) }} onMouseDown={(e) => startDrag(b.id, e)}>
                      {b.icon && <span>{b.icon}</span>}
                      {b.text}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="absolute inset-0 flex">
                {showLogo && product.shopLogoUrl && (
                  <div
                    className={`absolute z-[25] shrink-0 ${
                      logoPosition === "top-left" ? "top-4 left-4" : logoPosition === "top-right" ? "top-4 right-4" : logoPosition === "bottom-left" ? "bottom-4 left-4" : "bottom-4 right-4"
                    }`}
                  >
                    <img src={product.shopLogoUrl} alt="logo" className="w-10 h-10 rounded-full border border-white/70 shadow-sm object-cover bg-white/80" />
                  </div>
                )}
                <div className="relative w-[55%] p-4 flex flex-col" style={textShadowStyle}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      {showEyebrow && (
                        <div
                          className={`inline-block self-start text-[11px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded cursor-move ${fontClassName} ${eyebrowColorClass} ${selectedElementId === "eyebrow" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.eyebrow.x}px, ${textPositions.eyebrow.y}px)`, ...textBgStyle, ...textStyle, zIndex: getZIndex("eyebrow") }}
                          onMouseDown={(e) => startDrag("eyebrow", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); eyebrowInputRef.current?.focus(); }}
                        >
                          {eyebrowText}
                        </div>
                      )}
                      {showHeading && (
                        <div
                          className={`inline-block self-start leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move ${headingFontClassName} ${headingColorClass} ${selectedElementId === "heading" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.heading.x}px, ${textPositions.heading.y}px)`, ...textBgStyle, ...headingTextStyle, zIndex: getZIndex("heading") }}
                          onMouseDown={(e) => startDrag("heading", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); headingInputRef.current?.focus(); }}
                        >
                          {title || displayName || (lang === "th" ? "ชื่อสินค้า" : "Product name")}
                        </div>
                      )}
                      {showSubtitle && (
                        <div
                          className={`inline-block self-start leading-snug line-clamp-3 px-1.5 py-0.5 rounded cursor-move ${subtitleFontClassName} ${bodyColorClass} ${selectedElementId === "subtitle" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
                          style={{ transform: `translate(${textPositions.subtitle.x}px, ${textPositions.subtitle.y}px)`, ...textBgStyle, ...subtitleTextStyle, zIndex: getZIndex("subtitle") }}
                          onMouseDown={(e) => startDrag("subtitle", e)}
                          onDoubleClick={(e) => { e.stopPropagation(); subtitleInputRef.current?.focus(); }}
                        >
                          {subtitle ||
                            defaultSubtitle ||
                            (lang === "th" ? "ข้อความสั้น ๆ เกี่ยวกับ benefit ของสินค้า" : "Short line about the main benefits")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto">
                    {showPrice && priceText && (
                      <div
                        ref={priceElRef}
                        className={`inline-flex items-baseline gap-2 cursor-move ${priceFontClassName} ${selectedElementId === "price" ? "ring-2 ring-orange-400 ring-offset-1 rounded" : ""}`}
                        style={{ ...priceBgStyle, ...priceFontStyle, transform: `translate(${pricePos.x}px, ${pricePos.y}px)`, zIndex: getZIndex("price") }}
                        onMouseDown={(e) => startDrag("price", e)}
                      >
                        <span className={priceColorClass}>{priceText}</span>
                        {normalPriceText && (
                          <span className={`line-through ${strikeColorClass}`} style={{ fontSize: "0.875rem" }}>{normalPriceText}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {badges.map((b) => {
                    const bgCls = BADGE_BG_OPTIONS.find((o) => o.id === b.bgColor)?.cls ?? "bg-white/90";
                    const txtCls = BADGE_TEXT_OPTIONS.find((o) => o.id === b.textColor)?.cls ?? "text-stone-900";
                    const { className, style } = getBadgeContainerProps(b, bgCls, txtCls);
                    const badgeFontClassName = getFontClassName(b.fontFamily ?? "Prompt");
                    const badgeFontStyle: React.CSSProperties = { fontSize: sizeMap[b.fontSize ?? "base"], fontWeight: weightMap[b.fontWeight ?? "semibold"] };
                    return (
                      <div key={b.id} className={`${className} ${badgeFontClassName} ${selectedElementId === b.id ? "ring-2 ring-orange-400 ring-offset-1" : ""}`} style={{ ...style, ...badgeFontStyle, zIndex: getZIndex(b.id) }} onMouseDown={(e) => startDrag(b.id, e)}>
                        {b.icon && <span>{b.icon}</span>}
                        {b.text}
                      </div>
                    );
                  })}
                </div>
                {primaryImage && (
                  <div
                    className="relative z-10 w-[45%] flex items-center justify-center cursor-move overflow-hidden"
                    onMouseDown={(e) => startDrag("image", e)}
                    style={{
                      transform: `translate(${imageOffset.x}px, ${imageOffset.y}px) scale(${imageScale})`,
                      transformOrigin: "center",
                    }}
                  >
                    <div className={`relative w-full pointer-events-none ${productCutoutStyle ? "rounded-2xl overflow-hidden drop-shadow-2xl" : "drop-shadow-xl"}`}>
                      {!productCutoutStyle && <div className="absolute inset-4 bg-black/10 blur-2xl rounded-full" />}
                      <img src={primaryImage} alt="" className="relative w-full h-auto object-contain" style={imageDim < 100 ? { filter: `brightness(${imageDim / 100})` } : undefined} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {showDiscountBadge && discountPct > 0 && (
              <div
                ref={discountBadgeElRef}
                className={`absolute right-4 top-4 cursor-move ${selectedElementId === "discountBadge" ? "ring-2 ring-orange-400 ring-offset-1 rounded" : ""}`}
                style={{ transform: `translate(${discountBadgePos.x}px, ${discountBadgePos.y}px)`, zIndex: getZIndex("discountBadge") }}
                onMouseDown={(e) => { e.stopPropagation(); startDrag("discountBadge", e); }}
              >
                <div className={`${discountBadgeContainerProps.className} ${discountBadgeFontClassName}`} style={{ ...discountBadgeContainerProps.style, ...discountBadgeStyle }}>
                  -{discountPct}%
                </div>
              </div>
            )}

            {ctaText && (
              <div
                ref={ctaElRef}
                className={`absolute right-4 bottom-4 cursor-move ${selectedElementId === "cta" ? "ring-2 ring-orange-400 ring-offset-1 rounded" : ""}`}
                style={{ transform: `translate(${ctaPos.x}px, ${ctaPos.y}px)`, zIndex: getZIndex("cta") }}
                onMouseDown={(e) => { e.stopPropagation(); startDrag("cta", e); }}
              >
                <div
                  className={`inline-flex items-center justify-center shadow-md whitespace-nowrap ${ctaBgCls} ${ctaTextCls} ${ctaFontClassName}`}
                  style={{
                    ...ctaFontStyle,
                    padding: ctaShape === "circle" ? 0 : ctaPadding,
                    borderRadius: ctaShape === "pill" ? 9999 : ctaShape === "circle" ? "50%" : ctaBorderRadius,
                    ...(ctaShape === "circle" ? { width: Math.max(36, ctaPadding * 2 + 14), height: Math.max(36, ctaPadding * 2 + 14), minWidth: Math.max(36, ctaPadding * 2 + 14), minHeight: Math.max(36, ctaPadding * 2 + 14) } : {}),
                  }}
                >
                  {ctaText}
                </div>
              </div>
            )}

            {showSnapLines && (
              <>
                <div data-ad-snap-guide className="absolute top-0 bottom-0 w-0 border-l border-dashed border-white/50 pointer-events-none z-[50]" style={{ left: `${SAFE_AREA_MARGIN * 100}%` }} aria-hidden />
                <div data-ad-snap-guide className="absolute top-0 bottom-0 w-0 border-r border-dashed border-white/50 pointer-events-none z-[50]" style={{ right: `${SAFE_AREA_MARGIN * 100}%` }} aria-hidden />
                <div data-ad-snap-guide className="absolute left-0 right-0 h-0 border-t border-dashed border-white/50 pointer-events-none z-[50]" style={{ top: `${SAFE_AREA_MARGIN * 100}%` }} aria-hidden />
                <div data-ad-snap-guide className="absolute left-0 right-0 h-0 border-b border-dashed border-white/50 pointer-events-none z-[50]" style={{ bottom: `${SAFE_AREA_MARGIN * 100}%` }} aria-hidden />
              </>
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
                    (activeImage ?? images[0]) === img ? "border-orange-500" : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controls - same as modal */}
        <div ref={panelRef} className="md:w-1/2 p-4 space-y-2 overflow-y-auto min-h-0 flex-1">
          {selectedElementId && (
            <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-orange-50 border border-orange-100 flex-wrap">
              <span className="text-[11px] text-stone-600 truncate flex-1 min-w-0">เลือก: {selectedElementId.startsWith("badge-") ? "Badge" : selectedElementId}</span>
              <button type="button" onClick={bringToFront} className="text-[10px] px-2 py-0.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50" title="Bring to front">
                ↑
              </button>
              <button type="button" onClick={sendToBack} className="text-[10px] px-2 py-0.5 rounded border border-stone-200 bg-white text-stone-600 hover:bg-stone-50" title="Send to back">
                ↓
              </button>
              {selectedElementId.startsWith("badge-") && (
                <button type="button" onClick={duplicateElement} className="text-[10px] px-2 py-0.5 rounded border border-orange-300 bg-white text-orange-700 hover:bg-orange-50">
                  Duplicate
                </button>
              )}
              <button type="button" onClick={deleteElement} className="text-[10px] px-2 py-0.5 rounded border border-red-200 bg-white text-red-600 hover:bg-red-50">
                Delete
              </button>
              <button type="button" onClick={() => setSelectedElementId(null)} className="text-[10px] px-2 py-0.5 rounded border border-stone-200 text-stone-600 hover:bg-stone-50">
                ✕
              </button>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
            <button type="button" onClick={() => toggleSection("layout")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Layout & Background</span>
              <span className="text-stone-400 text-xs">{sectionOpen.layout ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.layout && (
            <>
            <div className="flex gap-2 items-center flex-wrap pt-1">
              <button
                type="button"
                onClick={() => setLayout("split")}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${layout === "split" ? "bg-orange-500 text-white border-orange-500 shadow" : "bg-white text-stone-600 border-stone-300"}`}
              >
                รูปขวา + ตัวหนังสือซ้าย
              </button>
              <button
                type="button"
                onClick={() => { setLayout("overlay"); setImageOffset({ x: 0, y: 0 }); }}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${layout === "overlay" ? "bg-orange-500 text-white border-orange-500 shadow" : "bg-white text-stone-600 border-stone-300"}`}
              >
                รูปเต็ม + Text overlay
              </button>
            </div>
            <div className="flex flex-wrap gap-0.5 items-center">
              <span className="text-[11px] text-stone-500 mr-1">Background</span>
              {BG_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setBgPreset(p.id)}
                  className={`w-5 h-5 rounded-full border ${p.buttonClass} ${bgPreset === p.id ? "shadow ring-2 ring-orange-400 ring-offset-0.5" : "opacity-80 hover:opacity-100"}`}
                  title={p.label}
                />
              ))}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-[11px] text-stone-500">Overlay:</span>
              {(["none", "gradient", "dark"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setOverlayType(t)} className={`text-[10px] px-2 py-0.5 rounded border ${overlayType === t ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                  {t === "none" ? "ไม่มี" : t === "gradient" ? "ไล่สี" : "ดำ"}
                </button>
              ))}
              {overlayType === "dark" && (
                <>
                  <span className="text-[9px] text-stone-500">ความเข้ม</span>
                  <input type="range" min={0.2} max={0.6} step={0.05} value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} className="w-20 accent-stone-500" />
                </>
              )}
            </div>
            </>
            )}
          </fieldset>

          <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
            <button type="button" onClick={() => toggleSection("image")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">รูปภาพ</span>
              <span className="text-stone-400 text-xs">{sectionOpen.image ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.image && (
            <>
            <div className="flex gap-2 items-center flex-wrap pt-1">
              <span className="text-[11px] text-stone-500">ขนาดรูป</span>
              <input type="range" min={50} max={300} value={Math.round(imageScale * 100)} onChange={(e) => setImageScale(Number(e.target.value) / 100)} className="flex-1 accent-orange-500" />
              <span className="text-[11px] text-stone-500 ml-1">ความสว่าง</span>
              <input type="range" min={0} max={100} value={imageDim} onChange={(e) => setImageDim(Number(e.target.value))} className="w-16 accent-stone-500" />
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <button type="button" onClick={() => { setImageOffset({ x: 0, y: 0 }); setImageScale(1); setImageDim(100); setTextPositions({ eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } }); setDiscountBadgePos({ x: 0, y: 0 }); setPricePos({ x: 0, y: 0 }); setCtaPos({ x: 0, y: 0 }); }} className="text-[10px] px-2 py-0.5 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50">
                รีเซ็ต
              </button>
              <button type="button" onClick={() => { setLayout("overlay"); setImageOffset({ x: 0, y: 0 }); setImageScale(1.1); }} className="text-[10px] px-2 py-0.5 rounded-full border border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100">
                เต็มพื้น
              </button>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showLogo} onChange={(e) => setShowLogo(e.target.checked)} disabled={!product.shopLogoUrl} />
                โลโก้ร้าน
              </label>
              {showLogo && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-stone-500">ตำแหน่ง:</span>
                  {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((pos) => (
                    <button key={pos} type="button" onClick={() => setLogoPosition(pos)} title={pos} className={`text-[9px] px-1 py-0.5 rounded border ${logoPosition === pos ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>
                      {pos === "top-left" ? "↖" : pos === "top-right" ? "↗" : pos === "bottom-left" ? "↙" : "↘"}
                    </button>
                  ))}
                </div>
              )}
              <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={productCutoutStyle} onChange={(e) => setProductCutoutStyle(e.target.checked)} />
                Product cutout style
              </label>
            </div>
            </>
            )}
          </fieldset>

          <fieldset className="border border-stone-200 rounded-xl p-3 space-y-2">
            <button type="button" onClick={() => toggleSection("discount")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">ลดราคา</span>
              <span className="text-stone-400 text-xs">{sectionOpen.discount ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.discount && (
            <>
            {discountPct > 0 ? (
              <>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                  <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showDiscountBadge} onChange={(e) => setShowDiscountBadge(e.target.checked)} />
                  แสดง ลด -{discountPct}%
                </label>
                {showDiscountBadge && (
                  <div className="space-y-2 pl-0">
                    <div className="flex flex-wrap gap-0.5 items-center">
                      <span className="text-[11px] text-stone-500 mr-1">สีตัวอักษร</span>
                      {BADGE_TEXT_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setDiscountBadgeTextColor(opt.id)} title={opt.label} className={`w-4 h-4 rounded-full border ${opt.swatch} ${discountBadgeTextColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-0.5 items-center">
                      <span className="text-[11px] text-stone-500 mr-1">พื้นหลัง</span>
                      {BADGE_BG_OPTIONS.map((opt) => (
                        <button key={opt.id} type="button" onClick={() => setDiscountBadgeColor(opt.id)} title={opt.label} className={`w-5 h-5 rounded-full border ${opt.swatch} ${discountBadgeColor === opt.id ? "ring-2 ring-orange-400 ring-offset-0.5" : "opacity-80 hover:opacity-100"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-stone-500 shrink-0">รูปร่าง</span>
                      {(["rectangle", "pill", "circle"] as const).map((s) => (
                        <button key={s} type="button" onClick={() => setDiscountBadgeShape(s)} className={`text-[10px] px-1.5 py-0.5 rounded border ${discountBadgeShape === s ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                          {s === "rectangle" ? "□" : s === "pill" ? "⎯" : "○"}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-stone-500 shrink-0">padding</span>
                      <input type="range" min={4} max={24} value={discountBadgePadding} onChange={(e) => setDiscountBadgePadding(Number(e.target.value))} className="flex-1 h-1.5 accent-orange-500" />
                      <span className="text-[10px] text-stone-400 w-5">{discountBadgePadding}</span>
                    </div>
                    {discountBadgeShape === "rectangle" && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-stone-500 shrink-0">มุม</span>
                        <input type="range" min={0} max={24} value={discountBadgeBorderRadius} onChange={(e) => setDiscountBadgeBorderRadius(Number(e.target.value))} className="flex-1 h-1.5 accent-orange-500" />
                        <span className="text-[10px] text-stone-400 w-5">{discountBadgeBorderRadius}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center">
                      <span className="text-[11px] text-stone-500">ฟอนต์</span>
                      <select value={discountBadgeFontFamily} onChange={(e) => setDiscountBadgeFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
                        {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                      <span className="text-[11px] text-stone-500">ขนาด</span>
                      {(["sm", "base", "lg"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setDiscountBadgeFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${discountBadgeFontSize === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                          {v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}
                        </button>
                      ))}
                      <span className="text-[11px] text-stone-500">น้ำหนัก</span>
                      {(["normal", "semibold", "bold"] as const).map((v) => (
                        <button key={v} type="button" onClick={() => setDiscountBadgeFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${discountBadgeFontWeight === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                          {v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-[11px] text-stone-500">ไม่มีส่วนลด (ราคาปกติเท่ากับราคาขาย)</p>
            )}
            </>
            )}
          </fieldset>

          <fieldset ref={textSectionRef} className="border border-stone-200 rounded-xl p-3 space-y-3">
            <button type="button" onClick={() => toggleSection("text")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">ข้อความ</span>
              <span className="text-stone-400 text-xs">{sectionOpen.text ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.text && (
            <>
            <div className="space-y-1 pt-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showEyebrow} onChange={(e) => setShowEyebrow(e.target.checked)} />
                Eyebrow
              </label>
              <input ref={eyebrowInputRef} type="text" value={eyebrowCustom} onChange={(e) => setEyebrowCustom(e.target.value)} placeholder={defaultEyebrow} className="input input-sm w-full" disabled={!showEyebrow} />
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-0.5">
                <span className="text-[10px] text-stone-400">Eyebrow:</span>
                <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {(["sm", "base", "lg"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${fontSize === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}</button>
                ))}
                <span className="text-[10px] text-stone-400 ml-0.5">น้ำหนัก</span>
                {(["normal", "semibold", "bold"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${fontWeight === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showHeading} onChange={(e) => setShowHeading(e.target.checked)} />
                Title ({lang === "th" ? "TH" : "EN"})
              </label>
              <div className="flex gap-1.5">
                <input ref={headingInputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={displayName || (lang === "th" ? "หัวข้อหลัก" : "Headline")} className="input input-sm flex-1" />
                <button type="button" onClick={() => callAi("ad_title")} disabled={loadingField === "ad_title"} className="text-xs px-2 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60">
                  {loadingField === "ad_title" ? "..." : "AI"}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-0.5">
                <span className="text-[10px] text-stone-400">Title:</span>
                <select value={titleFontFamily} onChange={(e) => setTitleFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {(["sm", "base", "lg"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setTitleFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${titleFontSize === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}</button>
                ))}
                <span className="text-[10px] text-stone-400 ml-0.5">น้ำหนัก</span>
                {(["normal", "semibold", "bold"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setTitleFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${titleFontWeight === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}</button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-600">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showSubtitle} onChange={(e) => setShowSubtitle(e.target.checked)} />
                Subtitle ({lang === "th" ? "TH" : "EN"}) <span className="text-[10px] font-normal text-stone-400">— เล็กกว่า Title by default</span>
              </label>
              <div className="flex gap-1.5">
                <textarea ref={subtitleInputRef} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} rows={2} placeholder={lang === "th" ? "ขยาย benefit 1–2 ประโยค" : "1–2 sentences"} className="input input-sm flex-1 min-h-[44px] resize-y" />
                <button type="button" onClick={() => callAi("ad_subtitle")} disabled={loadingField === "ad_subtitle"} className="text-xs px-2 py-1 rounded-md border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60 h-[44px]">
                  {loadingField === "ad_subtitle" ? "..." : "AI"}
                </button>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center pt-0.5">
                <span className="text-[10px] text-stone-400">Subtitle:</span>
                <select value={subtitleFontFamily} onChange={(e) => setSubtitleFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {(["sm", "base", "lg"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setSubtitleFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${subtitleFontSize === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}</button>
                ))}
                <span className="text-[10px] text-stone-400 ml-0.5">น้ำหนัก</span>
                {(["normal", "semibold", "bold"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setSubtitleFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${subtitleFontWeight === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}</button>
                ))}
              </div>
            </div>

            <div className="border-t border-stone-100 pt-2 space-y-2">
              <span className="text-[10px] font-medium text-stone-500 uppercase tracking-wide">ใช้ร่วมกัน</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                <div>
                  <span className="text-[11px] text-stone-500">สี</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {TEXT_COLOR_PRESETS.map((preset) => (
                      <button key={preset.id} type="button" onClick={() => setTextColor(preset.id)} title={preset.label} className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${textColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500">เงา</span>
                  {(["none", "soft", "strong", "stroke"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setTextShadow(v)} className={`px-2 py-0.5 rounded-full text-[10px] border ${textShadow === v ? "bg-stone-800 text-white border-stone-800" : "bg-white text-stone-600 border-stone-300"}`}>
                      {{ none: "ไม่มี", soft: "อ่อน", strong: "เข้ม", stroke: "ขอบดำ" }[v]}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-stone-500">จัด</span>
                  {(["left", "center", "right"] as const).map((v) => (
                    <button key={v} type="button" onClick={() => setTextAlign(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${textAlign === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                      {v === "left" ? "ซ้าย" : v === "center" ? "กลาง" : "ขวา"}
                    </button>
                  ))}
                </div>
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
                        <button key={preset.id} type="button" onClick={() => setTextBgColor(preset.id)} title={preset.label} className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${textBgColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
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
            </>
            )}
          </fieldset>

          <fieldset ref={badgesSectionRef} className="border border-stone-200 rounded-xl p-3 space-y-2">
            <button type="button" onClick={() => toggleSection("badges")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Badges</span>
              <span className="text-stone-400 text-xs">{sectionOpen.badges ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.badges && (
            <div className="pt-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-stone-400">ลากขยับได้บน canvas</span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-stone-400">จาก preset:</span>
                {BADGE_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => addBadgeFromPreset(p.id)} title={lang === "th" ? p.labelTh : p.labelEn} className={`text-[10px] px-1.5 py-0.5 rounded border ${p.buttonClass}`}>
                    {p.icon}
                  </button>
                ))}
                <button type="button" onClick={addBadge} className="text-[11px] px-2.5 py-1 rounded-lg border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100">
                  + เพิ่ม
                </button>
              </div>
            </div>
            {badges.length === 0 && <p className="text-[11px] text-stone-400">ยังไม่มี badge</p>}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
              {badges.map((b) => {
                const isEditing = editingBadgeId === b.id;
                return (
                  <div key={b.id} className="border border-stone-200 rounded-lg p-1.5">
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", gap: "4px", alignItems: "center" }}>
                      {b.icon ? (
                        <button type="button" onClick={() => updateBadge(b.id, { icon: "" })} className="text-sm leading-none hover:opacity-60" title="กดเพื่อลบ emoji">
                          {b.icon}
                        </button>
                      ) : (
                        <span className="text-[9px] text-stone-300">✦</span>
                      )}
                      <input type="text" value={b.text} onChange={(e) => updateBadge(b.id, { text: e.target.value })} className="input input-xs text-[11px] h-5 min-w-0" placeholder="badge" />
                      <button type="button" onClick={() => suggestBadgeIcon(b.id, b.text)} disabled={loadingBadgeIcon === b.id} className="text-[8px] px-1 h-5 rounded border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 disabled:opacity-60">
                        {loadingBadgeIcon === b.id ? ".." : "AI"}
                      </button>
                      <button type="button" onClick={() => setEditingBadgeId(isEditing ? null : b.id)} className="text-[9px] w-5 h-5 flex items-center justify-center rounded border border-stone-300 text-stone-600 hover:bg-stone-50">
                        🎨
                      </button>
                      <button type="button" onClick={() => removeBadge(b.id)} className="text-[9px] w-5 h-5 flex items-center justify-center rounded border border-red-200 text-red-500 hover:bg-red-50">
                        ✕
                      </button>
                    </div>
                    {isEditing && (
                      <div className="space-y-1 pt-1 border-t border-stone-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] text-stone-500 shrink-0">ฟอนต์</span>
                          <select value={b.fontFamily ?? "Prompt"} onChange={(e) => updateBadge(b.id, { fontFamily: e.target.value })} className="text-[10px] border border-stone-300 rounded px-1.5 py-0.5">
                            {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                          </select>
                          <span className="text-[9px] text-stone-500 shrink-0">ขนาด</span>
                          {(["sm", "base", "lg"] as const).map((v) => (
                            <button key={v} type="button" onClick={() => updateBadge(b.id, { fontSize: v })} className={`text-[9px] px-1.5 py-0.5 rounded border ${(b.fontSize ?? "base") === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                              {v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}
                            </button>
                          ))}
                          <span className="text-[9px] text-stone-500 shrink-0">น้ำหนัก</span>
                          {(["normal", "semibold", "bold"] as const).map((v) => (
                            <button key={v} type="button" onClick={() => updateBadge(b.id, { fontWeight: v })} className={`text-[9px] px-1.5 py-0.5 rounded border ${(b.fontWeight ?? "semibold") === v ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                              {v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-stone-500 shrink-0">รูปร่าง</span>
                          {(["rectangle", "pill", "circle"] as const).map((s) => (
                            <button key={s} type="button" onClick={() => updateBadge(b.id, { shape: s })} className={`text-[9px] px-1.5 py-0.5 rounded border ${(b.shape ?? "pill") === s ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                              {s === "rectangle" ? "□" : s === "pill" ? "⎯" : "○"}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-stone-500 shrink-0">padding</span>
                          <input type="range" min={4} max={24} value={b.padding ?? 12} onChange={(e) => updateBadge(b.id, { padding: Number(e.target.value) })} className="flex-1 h-1.5" />
                          <span className="text-[9px] text-stone-400 w-5">{b.padding ?? 12}</span>
                        </div>
                        {(b.shape ?? "pill") === "rectangle" && (
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] text-stone-500 shrink-0">มุม</span>
                            <input type="range" min={0} max={24} value={b.borderRadius ?? 8} onChange={(e) => updateBadge(b.id, { borderRadius: Number(e.target.value) })} className="flex-1 h-1.5" />
                            <span className="text-[9px] text-stone-400 w-5">{b.borderRadius ?? 8}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1">
                          <span className="text-[9px] text-stone-500 shrink-0 pt-0.5 w-6">text</span>
                          <div className="flex flex-wrap gap-0.5">
                            {BADGE_TEXT_OPTIONS.map((opt) => (
                              <button key={opt.id} type="button" onClick={() => updateBadge(b.id, { textColor: opt.id })} className={`w-4 h-4 rounded-full border ${opt.swatch} ${b.textColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} title={opt.label} />
                            ))}
                          </div>
                        </div>
                        <div className="flex items-start gap-1">
                          <span className="text-[9px] text-stone-500 shrink-0 pt-0.5 w-6">พื้น</span>
                          <div className="flex flex-wrap gap-0.5">
                            {BADGE_BG_OPTIONS.map((opt) => (
                              <button key={opt.id} type="button" onClick={() => updateBadge(b.id, { bgColor: opt.id })} className={`w-4 h-4 rounded-full border ${opt.swatch} ${b.bgColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} title={opt.label} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            )}
          </fieldset>

          <fieldset ref={priceSectionRef} className="border border-stone-200 rounded-xl p-3 space-y-3">
            <button type="button" onClick={() => toggleSection("price")} className="w-full flex items-center justify-between text-left px-1 -mx-1 rounded hover:bg-stone-50 py-0.5">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">ราคา & ปุ่ม CTA</span>
              <span className="text-stone-400 text-xs">{sectionOpen.price ? "ซ่อน" : "แสดง"}</span>
            </button>
            {sectionOpen.price && (
            <div className="pt-1 space-y-3">
            <div className="space-y-1.5">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-stone-700">
                <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                ราคา ({priceText || "ไม่มี"}
                {normalPriceText ? ` ← ${normalPriceText}` : ""})
              </label>
              {showPrice && priceText && (
                <>
                  <div>
                    <span className="text-[10px] text-stone-500">สีตัวอักษร:</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {PRICE_COLOR_PRESETS.map((preset) => (
                        <button key={preset.id} type="button" onClick={() => setPriceColor(preset.id)} title={preset.label} className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${priceColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`}>
                          {preset.id === "auto" ? <span className="text-[7px] text-white font-bold">A</span> : null}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                    <span className="text-[10px] text-stone-500">ฟอนต์</span>
                    <select value={priceFontFamily} onChange={(e) => setPriceFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
{FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {(["sm", "base", "lg"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setPriceFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${priceFontSize === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}</button>
                    ))}
                    {(["normal", "semibold", "bold"] as const).map((v) => (
                      <button key={v} type="button" onClick={() => setPriceFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${priceFontWeight === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}</button>
                    ))}
                  </div>
                  <div>
                    <label className="inline-flex items-center gap-1 text-[11px] text-stone-700">
                      <input type="checkbox" className="rounded border-stone-300 text-orange-600 focus:ring-orange-500" checked={priceBgEnabled} onChange={(e) => setPriceBgEnabled(e.target.checked)} />
                      กรอบสี
                    </label>
                    {priceBgEnabled && (
                      <>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {TEXT_BG_PRESETS.map((preset) => (
                            <button key={preset.id} type="button" onClick={() => setPriceBgColor(preset.id)} title={preset.label} className={`w-5 h-5 rounded-full border-2 ${preset.swatch} ${priceBgColor === preset.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
                          ))}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] text-stone-500">โปร่งใส</span>
                          <input type="range" min={10} max={100} value={priceBgOpacity} onChange={(e) => setPriceBgOpacity(Number(e.target.value))} className="flex-1 accent-orange-500" />
                          <span className="text-[10px] text-stone-500 w-7 text-right">{priceBgOpacity}%</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          <span className="text-[10px] text-stone-500 shrink-0">รูปร่าง</span>
                          {(["rectangle", "pill", "circle"] as const).map((s) => (
                            <button key={s} type="button" onClick={() => setPriceShape(s)} className={`text-[10px] px-1.5 py-0.5 rounded border ${priceShape === s ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                              {s === "rectangle" ? "□" : s === "pill" ? "⎯" : "○"}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-stone-500 shrink-0">padding</span>
                          <input type="range" min={4} max={24} value={pricePadding} onChange={(e) => setPricePadding(Number(e.target.value))} className="flex-1 h-1.5 accent-orange-500" />
                          <span className="text-[10px] text-stone-400 w-5">{pricePadding}</span>
                        </div>
                        {priceShape === "rectangle" && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-stone-500 shrink-0">มุม</span>
                            <input type="range" min={0} max={24} value={priceBorderRadius} onChange={(e) => setPriceBorderRadius(Number(e.target.value))} className="flex-1 h-1.5 accent-orange-500" />
                            <span className="text-[10px] text-stone-400 w-5">{priceBorderRadius}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5 border-t border-stone-100 pt-2">
              <span className="text-[11px] text-stone-500 block">CTA</span>
              <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="input input-sm w-full" placeholder="สั่งซื้อเลย" />
              <div className="flex flex-wrap gap-0.5 items-center">
                <span className="text-[10px] text-stone-500 mr-1">สีตัวอักษร</span>
                {BADGE_TEXT_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => setCtaTextColor(opt.id)} title={opt.label} className={`w-4 h-4 rounded-full border ${opt.swatch} ${ctaTextColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-0.5 items-center">
                <span className="text-[10px] text-stone-500 mr-1">พื้นหลัง</span>
                {BADGE_BG_OPTIONS.map((opt) => (
                  <button key={opt.id} type="button" onClick={() => setCtaBgColor(opt.id)} title={opt.label} className={`w-4 h-4 rounded-full border ${opt.swatch} ${ctaBgColor === opt.id ? "ring-2 ring-orange-400 ring-offset-1" : "opacity-60 hover:opacity-100"}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                <span className="text-[10px] text-stone-500">ฟอนต์</span>
                <select value={ctaFontFamily} onChange={(e) => setCtaFontFamily(e.target.value)} className="text-[11px] border border-stone-300 rounded px-2 py-0.5">
                  {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                {(["sm", "base", "lg"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setCtaFontSize(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${ctaFontSize === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "sm" ? "เล็ก" : v === "base" ? "กลาง" : "ใหญ่"}</button>
                ))}
                {(["normal", "semibold", "bold"] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setCtaFontWeight(v)} className={`px-1.5 py-0.5 rounded text-[10px] border ${ctaFontWeight === v ? "border-orange-400 bg-orange-50" : "border-stone-200"}`}>{v === "normal" ? "ปกติ" : v === "semibold" ? "กลาง" : "หนา"}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-stone-500">รูปร่าง</span>
                {(["rectangle", "pill", "circle"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setCtaShape(s)} className={`text-[10px] px-1.5 py-0.5 rounded border ${ctaShape === s ? "border-orange-400 bg-orange-50 text-orange-700" : "border-stone-200 text-stone-600"}`}>
                    {s === "rectangle" ? "□" : s === "pill" ? "⎯" : "○"}
                  </button>
                ))}
                <span className="text-[10px] text-stone-500">padding</span>
                <input type="range" min={6} max={24} value={ctaPadding} onChange={(e) => setCtaPadding(Number(e.target.value))} className="w-20 h-1.5" />
                <span className="text-[10px] text-stone-400 w-5">{ctaPadding}</span>
                {ctaShape === "rectangle" && (
                  <>
                    <span className="text-[10px] text-stone-500">มุม</span>
                    <input type="range" min={0} max={24} value={ctaBorderRadius} onChange={(e) => setCtaBorderRadius(Number(e.target.value))} className="w-16 h-1.5" />
                    <span className="text-[10px] text-stone-400 w-5">{ctaBorderRadius}</span>
                  </>
                )}
              </div>
            </div>
            </div>
            )}
          </fieldset>
        </div>
      </div>

      <div className="border-t border-stone-200 px-5 py-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-[11px] text-stone-500">
            ภาพที่สร้างจะเหมาะกับ {aspect === "1:1" ? "Shopee / Lazada square" : aspect === "4:5" ? "Facebook / IG feed" : "Story / Reel"}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400">Responsive preview:</span>
            {(["1:1", "4:5", "9:16"] as const).map((a) => (
              <button key={a} type="button" onClick={() => setAspect(a)} className={`px-2 py-0.5 rounded text-[10px] border ${aspect === a ? "bg-orange-50 border-orange-300 text-orange-700" : "border-stone-200 text-stone-600 hover:bg-stone-50"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={() => handleExport("download")} disabled={saving} className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60">
            ดาวน์โหลด PNG
          </button>
          <button type="button" onClick={() => handleExport("save")} disabled={saving} className="px-3.5 py-1.5 rounded-lg bg-orange-500 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
            {saving ? "กำลังบันทึก..." : "บันทึกเข้า Marketing Assets"}
          </button>
          <button type="button" onClick={exportAllSizes} disabled={saving} className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs text-stone-700 hover:bg-stone-50 disabled:opacity-60" title="Export 1:1, 4:5, 9:16">
            Export all sizes
          </button>
          {onSaveAdDesign && !initialAdDesignId && (
            <button
              type="button"
              onClick={() => {
                const name = typeof window !== "undefined" ? window.prompt("ชื่อ Ad Design", "Design 1") : null;
                if (!name?.trim()) return;
                onSaveAdDesign({ name: name.trim(), state: getCurrentTemplateState() });
              }}
              className="px-3 py-1.5 rounded-lg border border-violet-300 text-xs text-violet-700 hover:bg-violet-50"
            >
              บันทึกเป็น Ad Design
            </button>
          )}
          {initialAdDesignId && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-500 shrink-0">ชื่อ:</span>
                  <input
                    type="text"
                    value={editableAdDesignName}
                    onChange={(e) => setEditableAdDesignName(e.target.value)}
                    placeholder="ชื่อ Ad Design"
                    className="w-32 min-w-0 px-2 py-1 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-400"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-xs text-stone-500 shrink-0">หมายเหตุ:</span>
                  <textarea
                    rows={2}
                    value={editableAdDesignNote}
                    onChange={(e) => setEditableAdDesignNote(e.target.value)}
                    placeholder="ถ้ามี"
                    className="w-40 min-w-0 px-2 py-1 text-xs rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-violet-300 focus:border-violet-400 resize-y"
                  />
                </label>
                {onUpdateAdDesignMeta && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!editableAdDesignName.trim()) return;
                      onUpdateAdDesignMeta(initialAdDesignId, {
                        name: editableAdDesignName.trim(),
                        note: editableAdDesignNote.trim() || null,
                      });
                    }}
                    disabled={!editableAdDesignName.trim()}
                    className="px-3 py-1.5 rounded-lg border border-violet-300 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    บันทึก
                  </button>
                )}
              </div>
              {onUpdateAdDesign && (
                <button
                  type="button"
                  onClick={() => onUpdateAdDesign({ id: initialAdDesignId, state: getCurrentTemplateState() })}
                  className="px-3 py-1.5 rounded-lg border border-violet-300 text-xs text-violet-700 hover:bg-violet-50"
                >
                  อัปเดต design
                </button>
              )}
              {onDeleteAdDesign && (
                <button type="button" onClick={() => onDeleteAdDesign(initialAdDesignId)} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50">
                  ลบ
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
