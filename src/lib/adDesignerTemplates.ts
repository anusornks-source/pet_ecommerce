/**
 * Preset templates for Ads Creator. Product name, price, image come from product; template sets layout and default copy/positions.
 */

export type AdTemplateBadge = {
  id: string;
  text: string;
  icon: string;
  textColor: string;
  bgColor: string;
  x: number;
  y: number;
  shape?: "rectangle" | "pill" | "circle";
  padding?: number;
  borderRadius?: number;
  fontFamily?: string;
  fontSize?: "sm" | "base" | "lg";
  fontWeight?: "normal" | "semibold" | "bold";
};

export type AdTemplateState = {
  layout: "split" | "overlay";
  aspect: "1:1" | "4:5" | "9:16";
  bgPreset: string;
  textPositions: { eyebrow: { x: number; y: number }; heading: { x: number; y: number }; subtitle: { x: number; y: number } };
  pricePos: { x: number; y: number };
  ctaPos: { x: number; y: number };
  discountBadgePos: { x: number; y: number };
  badges: AdTemplateBadge[];
  ctaText: string;
  ctaColor: string;
  ctaBgColor?: string;
  ctaTextColor?: string;
  ctaFontFamily?: string;
  ctaFontSize?: "sm" | "base" | "lg";
  ctaFontWeight?: string;
  ctaShape?: "rectangle" | "pill" | "circle";
  ctaPadding?: number;
  ctaBorderRadius?: number;
  priceFontFamily?: string;
  priceFontSize?: "sm" | "base" | "lg";
  priceFontWeight?: string;
  priceShape?: "rectangle" | "pill" | "circle";
  pricePadding?: number;
  priceBorderRadius?: number;
  showPrice: boolean;
  showLogo: boolean;
  showEyebrow: boolean;
  showHeading: boolean;
  showSubtitle: boolean;
  showDiscountBadge: boolean;
  discountBadgeShape?: "rectangle" | "pill" | "circle";
  discountBadgePadding?: number;
  discountBadgeBorderRadius?: number;
  discountBadgeBgColor?: string;
  discountBadgeTextColor?: string;
  discountBadgeFontFamily?: string;
  discountBadgeFontSize?: "sm" | "base" | "lg";
  discountBadgeFontWeight?: string;
  overlayType?: "none" | "gradient" | "dark";
  overlayOpacity?: number;
  logoPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  productCutoutStyle?: boolean;
  defaultTitle?: string;
  defaultSubtitle?: string;
  defaultEyebrow?: string;
};

export type AdTemplate = {
  id: string;
  labelTh: string;
  labelEn: string;
  state: AdTemplateState;
};

export const AD_TEMPLATES: AdTemplate[] = [
  {
    id: "sale",
    labelTh: "โปรลดราคา",
    labelEn: "Sale promo",
    state: {
      layout: "overlay",
      aspect: "1:1",
      bgPreset: "brand",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [
        { id: "t1", text: "โปรลดราคา", icon: "🏷️", textColor: "white", bgColor: "red", x: 20, y: 120, shape: "pill", padding: 12, borderRadius: 8 },
      ],
      ctaText: "สั่งซื้อเลย",
      ctaColor: "red",
      showPrice: true,
      showLogo: true,
      showEyebrow: true,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: true,
      overlayType: "gradient",
      logoPosition: "top-right",
      defaultEyebrow: "โปรโมชั่น",
      defaultSubtitle: "ของดีราคาพิเศษ",
    },
  },
  {
    id: "freeshipping",
    labelTh: "โปรส่งฟรี",
    labelEn: "Free shipping",
    state: {
      layout: "split",
      aspect: "4:5",
      bgPreset: "blue",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [
        { id: "t2", text: "ส่งฟรี", icon: "🚚", textColor: "white", bgColor: "blue", x: 16, y: 180, shape: "pill", padding: 12, borderRadius: 8 },
      ],
      ctaText: "หยิบใส่ตะกร้า",
      ctaColor: "blue",
      showPrice: true,
      showLogo: true,
      showEyebrow: true,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: false,
      logoPosition: "top-right",
      defaultEyebrow: "จัดส่งฟรี",
      defaultSubtitle: "ซื้อครบส่งฟรีทุกออเดอร์",
    },
  },
  {
    id: "new",
    labelTh: "สินค้าใหม่",
    labelEn: "New arrival",
    state: {
      layout: "overlay",
      aspect: "1:1",
      bgPreset: "green",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [
        { id: "t3", text: "ใหม่", icon: "✨", textColor: "white", bgColor: "green", x: 20, y: 100, shape: "circle", padding: 12, borderRadius: 8 },
      ],
      ctaText: "ดูสินค้า",
      ctaColor: "green",
      showPrice: true,
      showLogo: true,
      showEyebrow: true,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: false,
      overlayType: "none",
      logoPosition: "top-left",
      defaultEyebrow: "New",
      defaultSubtitle: "สินค้าใหม่ล่าสุด",
    },
  },
  {
    id: "bestseller",
    labelTh: "รีวิวดี / ขายดี",
    labelEn: "Best seller",
    state: {
      layout: "split",
      aspect: "4:5",
      bgPreset: "brand",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [
        { id: "t4", text: "ขายดี", icon: "🔥", textColor: "white", bgColor: "orange", x: 16, y: 160, shape: "pill", padding: 12, borderRadius: 8 },
      ],
      ctaText: "สั่งซื้อเลย",
      ctaColor: "red",
      showPrice: true,
      showLogo: true,
      showEyebrow: true,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: false,
      logoPosition: "top-right",
      defaultEyebrow: "ลูกค้าชอบมาก",
      defaultSubtitle: "ขายดีอันดับต้น",
    },
  },
  {
    id: "flash",
    labelTh: "Flash sale",
    labelEn: "Flash sale",
    state: {
      layout: "overlay",
      aspect: "9:16",
      bgPreset: "dark",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [
        { id: "t5", text: "Flash Sale", icon: "⚡", textColor: "white", bgColor: "red", x: 20, y: 80, shape: "rectangle", padding: 10, borderRadius: 6 },
      ],
      ctaText: "ซื้อเลย",
      ctaColor: "red",
      showPrice: true,
      showLogo: false,
      showEyebrow: true,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: true,
      overlayType: "dark",
      overlayOpacity: 0.3,
      logoPosition: "top-right",
      defaultEyebrow: "จำกัดเวลา",
      defaultSubtitle: "ราคาพิเศษวันนี้เท่านั้น",
    },
  },
  {
    id: "product",
    labelTh: "โปรโมทสินค้า",
    labelEn: "Product promo",
    state: {
      layout: "split",
      aspect: "1:1",
      bgPreset: "white",
      textPositions: { eyebrow: { x: 0, y: 0 }, heading: { x: 0, y: 0 }, subtitle: { x: 0, y: 0 } },
      pricePos: { x: 0, y: 0 },
      ctaPos: { x: 0, y: 0 },
      discountBadgePos: { x: 0, y: 0 },
      badges: [],
      ctaText: "สั่งซื้อเลย",
      ctaColor: "red",
      showPrice: true,
      showLogo: true,
      showEyebrow: false,
      showHeading: true,
      showSubtitle: true,
      showDiscountBadge: false,
      logoPosition: "top-right",
      productCutoutStyle: true,
    },
  },
];
