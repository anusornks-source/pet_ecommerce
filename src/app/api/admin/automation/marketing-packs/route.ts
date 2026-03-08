import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const {
    productId,
    lang,
    productName,
    hooks,
    captionFacebook,
    captionInstagram,
    captionLine,
    adAngles,
    ugcScript,
    thumbnailTexts,
    _raw,
  } = body;

  if (!productId) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });
  }

  const pack = await prisma.productMarketingPack.create({
    data: {
      productId,
      lang: lang ?? "th",
      productName: productName ?? "",
      hooks: hooks ?? [],
      captionFacebook: captionFacebook ?? null,
      captionInstagram: captionInstagram ?? null,
      captionLine: captionLine ?? null,
      adAngles: adAngles ?? [],
      ugcScript: ugcScript ?? "",
      thumbnailTexts: thumbnailTexts ?? [],
      rawHooks: _raw?.hooks ?? null,
      rawCaptions: _raw?.captions ?? null,
      rawAngles: _raw?.angles ?? null,
      rawUgc: _raw?.ugc ?? null,
      rawThumbnails: _raw?.thumbnails ?? null,
    },
  });

  return NextResponse.json({ success: true, data: pack });
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");

  const packs = await prisma.productMarketingPack.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: { name: true, name_th: true, images: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: packs });
}
