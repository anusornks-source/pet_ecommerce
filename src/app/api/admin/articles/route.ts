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

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const PAGE_SIZE = 20;

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
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
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.article.count(),
  ]);

  return NextResponse.json({ success: true, data: articles, total, page, pageSize: PAGE_SIZE });
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
