import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const {
    imageUrl, badge, title, titleHighlight, subtitle,
    ctaLabel, ctaUrl, secondaryCtaLabel, secondaryCtaUrl, order, active,
  } = body;

  const banner = await prisma.heroBanner.update({
    where: { id },
    data: {
      ...(imageUrl !== undefined && { imageUrl: imageUrl.trim() }),
      ...(badge !== undefined && { badge: badge?.trim() || null }),
      ...(title !== undefined && { title: title?.trim() || null }),
      ...(titleHighlight !== undefined && { titleHighlight: titleHighlight?.trim() || null }),
      ...(subtitle !== undefined && { subtitle: subtitle?.trim() || null }),
      ...(ctaLabel !== undefined && { ctaLabel: ctaLabel?.trim() || null }),
      ...(ctaUrl !== undefined && { ctaUrl: ctaUrl?.trim() || null }),
      ...(secondaryCtaLabel !== undefined && { secondaryCtaLabel: secondaryCtaLabel?.trim() || null }),
      ...(secondaryCtaUrl !== undefined && { secondaryCtaUrl: secondaryCtaUrl?.trim() || null }),
      ...(order !== undefined && { order: parseInt(order) || 0 }),
      ...(active !== undefined && { active: !!active }),
    },
  });

  return NextResponse.json({ success: true, data: banner });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  await prisma.heroBanner.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
