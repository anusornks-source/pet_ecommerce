import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const pack = await prisma.productMarketingPack.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          name: true, name_th: true, images: true, price: true, normalPrice: true, stock: true,
          active: true, featured: true, source: true,
          shortDescription: true, shortDescription_th: true,
          description: true, description_th: true,
          category: { select: { name: true } },
          petType: { select: { name: true } },
          tags: { select: { id: true, name: true } },
          variants: { select: { id: true, sku: true, size: true, color: true, price: true, stock: true, variantImage: true, cjVid: true }, take: 20 },
        },
      },
    },
  });

  if (!pack) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: pack });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();

  const pack = await prisma.productMarketingPack.update({
    where: { id },
    data: {
      ...(body.hooks !== undefined && { hooks: body.hooks }),
      ...(body.captionFacebook !== undefined && { captionFacebook: body.captionFacebook }),
      ...(body.captionInstagram !== undefined && { captionInstagram: body.captionInstagram }),
      ...(body.captionLine !== undefined && { captionLine: body.captionLine }),
      ...(body.adAngles !== undefined && { adAngles: body.adAngles }),
      ...(body.ugcScript !== undefined && { ugcScript: body.ugcScript }),
      ...(body.thumbnailTexts !== undefined && { thumbnailTexts: body.thumbnailTexts }),
      ...(body.imageAdPrompts !== undefined && { imageAdPrompts: body.imageAdPrompts }),
      ...(body.videoAdPrompts !== undefined && { videoAdPrompts: body.videoAdPrompts }),
    },
  });

  return NextResponse.json({ success: true, data: pack });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  await prisma.productMarketingPack.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
