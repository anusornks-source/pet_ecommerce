"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useLocale } from "@/context/LocaleContext";

interface Banner {
  id: string;
  imageUrl: string;
  badge: string | null;
  badge_th: string | null;
  title: string | null;
  title_th: string | null;
  titleHighlight: string | null;
  titleHighlight_th: string | null;
  subtitle: string | null;
  subtitle_th: string | null;
  ctaLabel: string | null;
  ctaLabel_th: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaLabel_th: string | null;
  secondaryCtaUrl: string | null;
  feat1Enabled: boolean;
  feat1Icon: string | null;
  feat1Label: string | null;
  feat1Label_th: string | null;
  feat2Enabled: boolean;
  feat2Icon: string | null;
  feat2Label: string | null;
  feat2Label_th: string | null;
  feat3Enabled: boolean;
  feat3Icon: string | null;
  feat3Label: string | null;
  feat3Label_th: string | null;
}

const DEFAULT_BANNER: Banner = {
  id: "default",
  imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400",
  badge: "🎉 Welcome to PetShop",
  badge_th: "🎉 ยินดีต้อนรับสู่ PetShop",
  title: "Everything your",
  title_th: "ทุกสิ่งที่",
  titleHighlight: "Pet needs,\nright here!",
  titleHighlight_th: "น้องรัก\nต้องการ ที่นี่ครบ!",
  subtitle: "Quality pet products — food, toys, and accessories — delivered nationwide.",
  subtitle_th: "คัดสรรสัตว์เลี้ยงคุณภาพ พร้อมอาหาร ของเล่น และอุปกรณ์ครบครัน จัดส่งถึงบ้านทั่วประเทศ",
  ctaLabel: "Shop Now 🛒",
  ctaLabel_th: "ช้อปเลย 🛒",
  ctaUrl: "/products",
  secondaryCtaLabel: "View Pets",
  secondaryCtaLabel_th: "ดูสัตว์เลี้ยง",
  secondaryCtaUrl: "/products?category=dogs",
  feat1Enabled: true,
  feat1Icon: "✅",
  feat1Label: "Quality Products",
  feat1Label_th: "สินค้าคุณภาพ",
  feat2Enabled: true,
  feat2Icon: "🚚",
  feat2Label: "Nationwide Shipping",
  feat2Label_th: "จัดส่งทั่วไทย",
  feat3Enabled: true,
  feat3Icon: "💬",
  feat3Label: "After Sales",
  feat3Label_th: "ดูแลหลังขาย",
};

interface Props {
  banners: Banner[];
}

const AUTOPLAY_INTERVAL = 5000;

export default function HeroSlider({ banners }: Props) {
  const slides = banners.length > 0 ? banners : [DEFAULT_BANNER];
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const { pick } = useLocale();

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Autoplay
  useEffect(() => {
    if (paused || slides.length <= 1) return;
    timerRef.current = setTimeout(next, AUTOPLAY_INTERVAL);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, paused, next, slides.length]);

  // Touch/swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
    touchStartX.current = null;
  };

  const slide = slides[current];

  const badge = pick(slide.badge_th, slide.badge);
  const title = pick(slide.title_th, slide.title);
  const titleHighlightRaw = pick(slide.titleHighlight_th, slide.titleHighlight);
  const subtitle = pick(slide.subtitle_th, slide.subtitle);
  const ctaLabel = pick(slide.ctaLabel_th, slide.ctaLabel);
  const secondaryCtaLabel = pick(slide.secondaryCtaLabel_th, slide.secondaryCtaLabel);

  // Split titleHighlight by newline for multi-line rendering
  const highlightLines = titleHighlightRaw?.split("\n") ?? [];

  return (
    <section
      className="relative overflow-hidden h-120 md:h-140 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      {slides.map((s, idx) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
        >
          <Image
            src={s.imageUrl}
            alt={s.title ?? "Banner"}
            fill
            className="object-cover"
            priority={idx === 0}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-r from-black/65 via-black/30 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 h-full flex items-center">
        <div className="max-w-lg space-y-6">
          {badge && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30">
              {badge}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-md">
            {title && <span>{title} </span>}
            {highlightLines.map((line, i) => (
              <span key={i}>
                <span className="text-orange-300">{line}</span>
                {i < highlightLines.length - 1 && <br />}
              </span>
            ))}
            {!title && highlightLines.length === 0 && <span>PetShop</span>}
          </h1>

          {subtitle && (
            <p className="text-white/85 text-lg leading-relaxed">{subtitle}</p>
          )}

          {(ctaLabel || secondaryCtaLabel) && (
            <div className="flex flex-wrap gap-3">
              {ctaLabel && slide.ctaUrl && (
                <Link href={slide.ctaUrl} className="btn-primary px-8 py-3 text-base">
                  {ctaLabel}
                </Link>
              )}
              {secondaryCtaLabel && slide.secondaryCtaUrl && (
                <Link
                  href={slide.secondaryCtaUrl}
                  className="bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 transition-colors px-8 py-3 text-base rounded-xl font-medium"
                >
                  {secondaryCtaLabel}
                </Link>
              )}
            </div>
          )}

          {(slide.feat1Enabled || slide.feat2Enabled || slide.feat3Enabled) && (
            <div className="flex items-center gap-6 text-sm text-white/80">
              {slide.feat1Enabled && (
                <div className="flex items-center gap-1.5">
                  {slide.feat1Icon} {pick(slide.feat1Label_th, slide.feat1Label)}
                </div>
              )}
              {slide.feat2Enabled && (
                <div className="flex items-center gap-1.5">
                  {slide.feat2Icon} {pick(slide.feat2Label_th, slide.feat2Label)}
                </div>
              )}
              {slide.feat3Enabled && (
                <div className="flex items-center gap-1.5">
                  {slide.feat3Icon} {pick(slide.feat3Label_th, slide.feat3Label)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prev / Next arrows — only if multiple slides */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
            aria-label="Next"
          >
            ›
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goTo(idx)}
                className={`transition-all duration-300 rounded-full ${
                  idx === current
                    ? "w-6 h-2 bg-white"
                    : "w-2 h-2 bg-white/50 hover:bg-white/80"
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* Floating badges - hidden */}
    </section>
  );
}
