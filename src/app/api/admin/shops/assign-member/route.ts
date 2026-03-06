import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

/**
 * POST /api/admin/shops/assign-member
 * Assign a user to one or more shops with a specified role.
 * Body: { email: string, role: "STAFF"|"MANAGER"|"OWNER", shopIds: string[] }
 * Platform ADMIN only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
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
 * Lookup user's current shop assignments (for preview before assigning)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const email = new URL(request.url).searchParams.get("email");
  if (!email) return NextResponse.json({ success: false, error: "email required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      shopMemberships: { include: { shop: { select: { id: true, name: true } } } },
    },
  });

  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      shopMemberships: user.shopMemberships.map((m) => ({
        shopId: m.shopId,
        shopName: m.shop.name,
        role: m.role,
      })),
    },
  });
}
