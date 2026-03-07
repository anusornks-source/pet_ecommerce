import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

// GET — list niche keywords
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "300")));

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (search) where.OR = [
    { niche: { contains: search, mode: "insensitive" } },
    { niche_th: { contains: search, mode: "insensitive" } },
  ];

  const [keywords, total] = await Promise.all([
    prisma.nicheKeyword.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, name: true, avatar: true } } },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.nicheKeyword.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: keywords, total, page, limit, totalPages: Math.ceil(total / limit) });
}

// POST — bulk save
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { keywords } = await request.json();

  if (!Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ success: false, error: "No keywords provided" }, { status: 400 });
  }

  // Count existing to calculate skipped
  const niches = keywords.map((k: { niche: string }) => k.niche);
  const existing = await prisma.nicheKeyword.findMany({
    where: { niche: { in: niches } },
    select: { niche: true },
  });
  const existingSet = new Set(existing.map((e) => e.niche));

  const toCreate = keywords
    .filter((k: { niche: string }) => !existingSet.has(k.niche))
    .map((k: { niche: string; niche_th?: string; type?: string; reason?: string; reason_th?: string }) => ({
      niche: k.niche,
      niche_th: k.niche_th || null,
      type: k.type || "manual",
      reason: k.reason || null,
      reason_th: k.reason_th || null,
      createdById: auth.userId,
    }));

  if (toCreate.length > 0) {
    await prisma.nicheKeyword.createMany({ data: toCreate });
  }

  return NextResponse.json({
    success: true,
    data: { saved: toCreate.length, skipped: existingSet.size },
  });
}

// DELETE — delete by ids
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ success: false, error: "No ids provided" }, { status: 400 });
  }

  await prisma.nicheKeyword.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true });
}

// PATCH — update tags
export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id, tags, niche, niche_th, type, reason, reason_th } = await request.json();
  if (!id) {
    return NextResponse.json({ success: false, error: "No id provided" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (tags !== undefined) data.tags = tags || [];
  if (niche !== undefined) data.niche = niche;
  if (niche_th !== undefined) data.niche_th = niche_th || null;
  if (type !== undefined) data.type = type;
  if (reason !== undefined) data.reason = reason || null;
  if (reason_th !== undefined) data.reason_th = reason_th || null;

  const updated = await prisma.nicheKeyword.update({ where: { id }, data });

  return NextResponse.json({ success: true, data: updated });
}
