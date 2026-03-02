import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const banners = await prisma.heroBanner.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ success: true, data: banners });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const {
    imageUrl, badge, title, titleHighlight, subtitle,
    ctaLabel, ctaUrl, secondaryCtaLabel, secondaryCtaUrl, order, active,
  } = body;

  if (!imageUrl?.trim()) {
    return NextResponse.json({ success: false, error: "กรุณาใส่รูปภาพ" }, { status: 400 });
  }

  const banner = await prisma.heroBanner.create({
    data: {
      imageUrl: imageUrl.trim(),
      badge: badge?.trim() || null,
      title: title?.trim() || null,
      titleHighlight: titleHighlight?.trim() || null,
      subtitle: subtitle?.trim() || null,
      ctaLabel: ctaLabel?.trim() || null,
      ctaUrl: ctaUrl?.trim() || null,
      secondaryCtaLabel: secondaryCtaLabel?.trim() || null,
      secondaryCtaUrl: secondaryCtaUrl?.trim() || null,
      order: parseInt(order) || 0,
      active: active !== false,
    },
  });

  return NextResponse.json({ success: true, data: banner });
}
