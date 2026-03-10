import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, { strictAdmin: true });
  if (isNextResponse(auth)) return auth;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });

  return NextResponse.json({
    success: true,
    data: settings ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request, { strictAdmin: true });
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { homeHeroTitle, homeHeroSubtitle, heroImageUrl } = body as {
    homeHeroTitle?: string | null;
    homeHeroSubtitle?: string | null;
    heroImageUrl?: string | null;
  };

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      storeName: "CartNova",
      homeHeroTitle: homeHeroTitle ?? null,
      homeHeroSubtitle: homeHeroSubtitle ?? null,
      heroImageUrl: heroImageUrl ?? null,
    },
    update: {
      ...(homeHeroTitle !== undefined && { homeHeroTitle: homeHeroTitle || null }),
      ...(homeHeroSubtitle !== undefined && { homeHeroSubtitle: homeHeroSubtitle || null }),
      ...(heroImageUrl !== undefined && { heroImageUrl: heroImageUrl || null }),
    },
  });

  return NextResponse.json({ success: true, data: settings });
}

