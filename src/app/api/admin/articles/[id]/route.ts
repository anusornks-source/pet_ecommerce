import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) {
    return NextResponse.json({ success: false, error: "ไม่พบบทความ" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: article });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  const body = await request.json();
  const { title, title_th, slug, excerpt, excerpt_th, content, content_th, coverImage, published, tags } = body;

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(title_th !== undefined && { title_th: title_th || null }),
      ...(slug !== undefined && { slug }),
      ...(excerpt !== undefined && { excerpt: excerpt || null }),
      ...(excerpt_th !== undefined && { excerpt_th: excerpt_th || null }),
      ...(content !== undefined && { content }),
      ...(content_th !== undefined && { content_th: content_th || null }),
      ...(coverImage !== undefined && { coverImage: coverImage || null }),
      ...(published !== undefined && { published }),
      ...(tags !== undefined && { tags: Array.isArray(tags) ? tags : [] }),
    },
  });

  return NextResponse.json({ success: true, data: article });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;
  await prisma.article.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
