import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const kw = await prisma.nicheKeyword.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, avatar: true } },
      focuses: { where: { userId: auth.userId }, select: { id: true, note: true } },
    },
  });

  if (!kw) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const data = {
    ...kw,
    isFocused: kw.focuses.length > 0,
    note: kw.focuses[0]?.note ?? null,
    focuses: undefined,
  };

  return NextResponse.json({ success: true, data });
}
