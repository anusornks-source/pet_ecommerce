import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const { candidateIds, action } = await request.json();

  if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json({ success: false, error: "candidateIds required" }, { status: 400 });
  }

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ success: false, error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  const updated = await prisma.trendCandidate.updateMany({
    where: { id: { in: candidateIds } },
    data: {
      status: action === "approve" ? "approved" : "rejected",
      approvedAt: action === "approve" ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, updated: updated.count });
}
