import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

/** PUT /api/admin/shops/[id]/members/[memberId] — update member role */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const auth = await requireShopAdmin(request, "OWNER");
  if (isShopAuthResponse(auth)) return auth;

  const { memberId } = await params;
  const { role } = await request.json();

  const validRoles = ["OWNER", "MANAGER", "STAFF"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }

  const member = await prisma.shopMember.update({
    where: { id: memberId },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json({ success: true, data: member });
}

/** DELETE /api/admin/shops/[id]/members/[memberId] — remove member */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const auth = await requireShopAdmin(request, "OWNER");
  if (isShopAuthResponse(auth)) return auth;

  const { memberId } = await params;
  await prisma.shopMember.delete({ where: { id: memberId } });

  return NextResponse.json({ success: true });
}
