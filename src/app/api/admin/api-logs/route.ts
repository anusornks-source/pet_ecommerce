import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 50;
  const type = searchParams.get("type") ?? "";
  const source = searchParams.get("source") ?? "";
  const success = searchParams.get("success") ?? "";
  const search = searchParams.get("search") ?? "";

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (source) where.source = source;
  if (success !== "") where.success = success === "true";
  if (search) {
    where.OR = [
      { path: { contains: search, mode: "insensitive" } },
      { eventType: { contains: search, mode: "insensitive" } },
      { error: { contains: search, mode: "insensitive" } },
      { userId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.apiLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.apiLog.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: logs, total });
}
