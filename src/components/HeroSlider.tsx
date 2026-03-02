"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";

interface Banner {
  id: string;
  imageUrl: string;
  badge: string | null;
  title: string | null;
  titleHighlight: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
}

const DEFAULT_BANNER: Banner = {
  id: "default",
  imageUrl: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=1400",
  badge: "🎉 ยินดีต้อนรับสู่ PetShop",
  title: "ทุกสิ่งที่",
  titleHighlight: "น้องรัก\nต้องการ ที่นี่ครบ!",
  subtitle: "คัดสรรสัตว์เลี้ยงคุณภาพ พร้อมอาหาร ของเล่น และอุปกรณ์ครบครัน จัดส่งถึงบ้านทั่วประเทศ",
  ctaLabel: "ช้อปเลย 🛒",
  ctaUrl: "/products",
  secondaryCtaLabel: "ดูสัตว์เลี้ยง",
  secondaryCtaUrl: "/products?category=dogs",
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

  // Split titleHighlight by newline for multi-line rendering
  const highlightLines = slide.titleHighlight?.split("\n") ?? [];

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
          {slide.badge && (
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30">
              {slide.badge}
            </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight drop-shadow-md">
            {slide.title && <span>{slide.title} </span>}
            {highlightLines.map((line, i) => (
              <span key={i}>
                <span className="text-orange-300">{line}</span>
                {i < highlightLines.length - 1 && <br />}
              </span>
            ))}
            {!slide.title && !slide.titleHighlight && <span>PetShop</span>}
          </h1>

          {slide.subtitle && (
            <p className="text-white/85 text-lg leading-relaxed">{slide.subtitle}</p>
          )}

          {(slide.ctaLabel || slide.secondaryCtaLabel) && (
            <div className="flex flex-wrap gap-3">
              {slide.ctaLabel && slide.ctaUrl && (
                <Link href={slide.ctaUrl} className="btn-primary px-8 py-3 text-base">
                  {slide.ctaLabel}
                </Link>
              )}
              {slide.secondaryCtaLabel && slide.secondaryCtaUrl && (
                <Link
                  href={slide.secondaryCtaUrl}
                  className="bg-white/20 backdrop-blur-sm border border-white/40 text-white hover:bg-white/30 transition-colors px-8 py-3 text-base rounded-xl font-medium"
                >
                  {slide.secondaryCtaLabel}
                </Link>
              )}
            </div>
          )}

          <div className="flex items-center gap-6 text-sm text-white/80">
            <div className="flex items-center gap-1.5">✅ สินค้าคุณภาพ</div>
            <div className="flex items-center gap-1.5">🚚 จัดส่งทั่วไทย</div>
            <div className="flex items-center gap-1.5">💬 ดูแลหลังขาย</div>
          </div>
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

      {/* Floating badges */}
      <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex items-center gap-2 z-20">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-xs text-stone-500">ความพึงพอใจ</p>
          <p className="font-bold text-stone-800">4.9/5.0</p>
        </div>
      </div>
      <div className="absolute top-6 right-6 bg-orange-500/90 backdrop-blur-sm text-white rounded-2xl shadow-lg p-3 z-20 text-center">
        <p className="text-xs font-medium">สินค้ามากกว่า</p>
        <p className="text-2xl font-bold">500+</p>
        <p className="text-xs">รายการ</p>
      </div>
    </section>
  );
}
