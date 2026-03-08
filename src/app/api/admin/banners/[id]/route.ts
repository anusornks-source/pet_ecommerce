import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  const body = await request.json();
  const {
    imageUrl, badge, badge_th, title, title_th, titleHighlight, titleHighlight_th,
    subtitle, subtitle_th, ctaLabel, ctaLabel_th, ctaUrl,
    secondaryCtaLabel, secondaryCtaLabel_th, secondaryCtaUrl, order, active,
    feat1Enabled, feat1Icon, feat1Label, feat1Label_th,
    feat2Enabled, feat2Icon, feat2Label, feat2Label_th,
    feat3Enabled, feat3Icon, feat3Label, feat3Label_th,
  } = body;

  // Verify banner belongs to this shop
  const existingBanner = await prisma.heroBanner.findFirst({ where: { id, shopId } });
  if (!existingBanner) {
    return NextResponse.json({ success: false, error: "ไม่พบแบนเนอร์" }, { status: 404 });
  }

  const banner = await prisma.heroBanner.update({
    where: { id },
    data: {
      ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() }),
      ...(badge !== undefined && { badge: badge?.trim() || null }),
      ...(badge_th !== undefined && { badge_th: badge_th?.trim() || null }),
      ...(title !== undefined && { title: title?.trim() || null }),
      ...(title_th !== undefined && { title_th: title_th?.trim() || null }),
      ...(titleHighlight !== undefined && { titleHighlight: titleHighlight?.trim() || null }),
      ...(titleHighlight_th !== undefined && { titleHighlight_th: titleHighlight_th?.trim() || null }),
      ...(subtitle !== undefined && { subtitle: subtitle?.trim() || null }),
      ...(subtitle_th !== undefined && { subtitle_th: subtitle_th?.trim() || null }),
      ...(ctaLabel !== undefined && { ctaLabel: ctaLabel?.trim() || null }),
      ...(ctaLabel_th !== undefined && { ctaLabel_th: ctaLabel_th?.trim() || null }),
      ...(ctaUrl !== undefined && { ctaUrl: ctaUrl?.trim() || null }),
      ...(secondaryCtaLabel !== undefined && { secondaryCtaLabel: secondaryCtaLabel?.trim() || null }),
      ...(secondaryCtaLabel_th !== undefined && { secondaryCtaLabel_th: secondaryCtaLabel_th?.trim() || null }),
      ...(secondaryCtaUrl !== undefined && { secondaryCtaUrl: secondaryCtaUrl?.trim() || null }),
      ...(order !== undefined && { order: parseInt(order) || 0 }),
      ...(active !== undefined && { active: !!active }),
      ...(feat1Enabled !== undefined && { feat1Enabled: !!feat1Enabled }),
      ...(feat1Icon !== undefined && { feat1Icon: feat1Icon?.trim() || "✅" }),
      ...(feat1Label !== undefined && { feat1Label: feat1Label?.trim() || null }),
      ...(feat1Label_th !== undefined && { feat1Label_th: feat1Label_th?.trim() || null }),
      ...(feat2Enabled !== undefined && { feat2Enabled: !!feat2Enabled }),
      ...(feat2Icon !== undefined && { feat2Icon: feat2Icon?.trim() || "🚚" }),
      ...(feat2Label !== undefined && { feat2Label: feat2Label?.trim() || null }),
      ...(feat2Label_th !== undefined && { feat2Label_th: feat2Label_th?.trim() || null }),
      ...(feat3Enabled !== undefined && { feat3Enabled: !!feat3Enabled }),
      ...(feat3Icon !== undefined && { feat3Icon: feat3Icon?.trim() || "💬" }),
      ...(feat3Label !== undefined && { feat3Label: feat3Label?.trim() || null }),
      ...(feat3Label_th !== undefined && { feat3Label_th: feat3Label_th?.trim() || null }),
    },
  });

  return NextResponse.json({ success: true, data: banner });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const { id } = await params;
  // Verify banner belongs to this shop
  const existingBannerDel = await prisma.heroBanner.findFirst({ where: { id, shopId } });
  if (!existingBannerDel) {
    return NextResponse.json({ success: false, error: "ไม่พบแบนเนอร์" }, { status: 404 });
  }

  await prisma.heroBanner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
