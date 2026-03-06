import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

/** GET /api/admin/shops/[id]/members — list shop members */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request, "MANAGER");
  if (isShopAuthResponse(auth)) return auth;

  const { id } = await params;
  const members = await prisma.shopMember.findMany({
    where: { shopId: id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ success: true, data: members });
}

/** POST /api/admin/shops/[id]/members — add a member to shop */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireShopAdmin(request, "OWNER");
  if (isShopAuthResponse(auth)) return auth;

  const { id } = await params;
  const { email, role } = await request.json();

  if (!email?.trim()) {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.shopMember.findUnique({
    where: { userId_shopId: { userId: user.id, shopId: id } },
  });
  if (existing) {
    return NextResponse.json({ success: false, error: "User is already a member" }, { status: 400 });
  }

  const validRoles = ["OWNER", "MANAGER", "STAFF"];
  const memberRole = validRoles.includes(role) ? role : "STAFF";

  const member = await prisma.shopMember.create({
    data: { userId: user.id, shopId: id, role: memberRole },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  });

  return NextResponse.json({ success: true, data: member });
}
