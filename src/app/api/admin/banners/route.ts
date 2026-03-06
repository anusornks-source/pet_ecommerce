import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const banners = await prisma.heroBanner.findMany({ where: shopId === "all" ? {} : { shopId }, orderBy: { order: "asc" } });
  return NextResponse.json({ success: true, data: banners });
}

export async function POST(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const body = await request.json();
  const {
    imageUrl, badge, badge_th, title, title_th, titleHighlight, titleHighlight_th,
    subtitle, subtitle_th, ctaLabel, ctaLabel_th, ctaUrl,
    secondaryCtaLabel, secondaryCtaLabel_th, secondaryCtaUrl, order, active,
  } = body;

  if (!imageUrl?.trim()) {
    return NextResponse.json({ success: false, error: "กรุณาใส่รูปภาพ" }, { status: 400 });
  }

  const banner = await prisma.heroBanner.create({
    data: {
      shopId,
      imageUrl: imageUrl.trim(),
      badge: badge?.trim() || null,
      badge_th: badge_th?.trim() || null,
      title: title?.trim() || null,
      title_th: title_th?.trim() || null,
      titleHighlight: titleHighlight?.trim() || null,
      titleHighlight_th: titleHighlight_th?.trim() || null,
      subtitle: subtitle?.trim() || null,
      subtitle_th: subtitle_th?.trim() || null,
      ctaLabel: ctaLabel?.trim() || null,
      ctaLabel_th: ctaLabel_th?.trim() || null,
      ctaUrl: ctaUrl?.trim() || null,
      secondaryCtaLabel: secondaryCtaLabel?.trim() || null,
      secondaryCtaLabel_th: secondaryCtaLabel_th?.trim() || null,
      secondaryCtaUrl: secondaryCtaUrl?.trim() || null,
      order: parseInt(order) || 0,
      active: active !== false,
    },
  });

  return NextResponse.json({ success: true, data: banner });
}
