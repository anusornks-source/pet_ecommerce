import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

function toSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      published: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: articles });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { title, slug, excerpt, content, coverImage, published, tags } = body;

  if (!title || !content) {
    return NextResponse.json(
      { success: false, error: "กรุณากรอกชื่อบทความและเนื้อหา" },
      { status: 400 }
    );
  }

  const finalSlug = (slug?.trim() || toSlug(title)) || `article-${Date.now()}`;

  const existing = await prisma.article.findUnique({ where: { slug: finalSlug } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "Slug นี้ถูกใช้งานแล้ว" },
      { status: 409 }
    );
  }

  const article = await prisma.article.create({
    data: {
      title,
      slug: finalSlug,
      excerpt: excerpt || null,
      content,
      coverImage: coverImage || null,
      published: published ?? false,
      tags: Array.isArray(tags) ? tags : [],
    },
  });

  return NextResponse.json({ success: true, data: article }, { status: 201 });
}
