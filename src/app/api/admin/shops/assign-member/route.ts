import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { verifyToken } from "@/lib/auth";

/**
 * POST /api/admin/shops/assign-member
 * Assign a user to one or more shops with a specified role.
 * Body: { email: string, role: "STAFF"|"MANAGER"|"OWNER", shopIds: string[] }
 * Platform ADMIN only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request, { strictAdmin: true });
  if (isNextResponse(auth)) return auth;

  const { email, role, shopIds } = await request.json();

  if (!email?.trim()) {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }
  if (!["STAFF", "MANAGER", "OWNER"].includes(role)) {
    return NextResponse.json({ success: false, error: "Invalid role" }, { status: 400 });
  }
  if (!Array.isArray(shopIds) || shopIds.length === 0) {
    return NextResponse.json({ success: false, error: "Select at least one shop" }, { status: 400 });
  }

  // Find user by email
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    return NextResponse.json({ success: false, error: `ไม่พบ user ที่มี email: ${email}` }, { status: 404 });
  }

  // Verify all shopIds exist
  const shops = await prisma.shop.findMany({ where: { id: { in: shopIds } }, select: { id: true, name: true } });
  if (shops.length !== shopIds.length) {
    return NextResponse.json({ success: false, error: "Some shops not found" }, { status: 400 });
  }

  // Upsert ShopMember for each shop
  const results = await Promise.all(
    shopIds.map((shopId) =>
      prisma.shopMember.upsert({
        where: { userId_shopId: { userId: user.id, shopId } },
        update: { role },
        create: { userId: user.id, shopId, role },
        include: { shop: { select: { name: true } } },
      })
    )
  );

  return NextResponse.json({
    success: true,
    data: {
      user: { id: user.id, name: user.name, email: user.email },
      assignments: results.map((r) => ({ shopId: r.shopId, shopName: r.shop.name, role: r.role })),
    },
  });
}

/**
 * GET /api/admin/shops/assign-member?email=xxx
 * Lookup user by email/name for preview. Accessible to any shop admin (not just platform ADMIN).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  const hasAccess = payload.role === "ADMIN" || (payload.shopRoles && Object.keys(payload.shopRoles).length > 0);
  if (!hasAccess) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("email") ?? searchParams.get("q") ?? "";
  if (!query.trim()) return NextResponse.json({ success: false, error: "query required" }, { status: 400 });

  // Exact match by email → return single user with shop memberships (for preview)
  const exactUser = await prisma.user.findUnique({
    where: { email: query.trim().toLowerCase() },
    include: { shopMemberships: { include: { shop: { select: { id: true, name: true } } } } },
  });

  if (exactUser) {
    return NextResponse.json({
      success: true,
      data: {
        id: exactUser.id,
        name: exactUser.name,
        email: exactUser.email,
        role: exactUser.role,
        shopMemberships: exactUser.shopMemberships.map((m) => ({
          shopId: m.shopId,
          shopName: m.shop.name,
          role: m.role,
        })),
      },
      suggestions: [],
    });
  }

  // Partial match by name or email → return suggestions list
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query.trim(), mode: "insensitive" } },
        { email: { contains: query.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ success: false, suggestions: users });
}
