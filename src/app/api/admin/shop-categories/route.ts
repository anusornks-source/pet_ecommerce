import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { isNextResponse } from "@/lib/adminAuth";
import { getSession } from "@/lib/auth";

// GET: return selected categoryIds for the active shop
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  // Determine shopId: admin uses query param, shop member uses their shop
  const membership = await prisma.shopMember.findFirst({
    where: { userId: session.userId },
    select: { shopId: true },
  });
  if (!membership) return NextResponse.json({ success: false, error: "No shop" }, { status: 403 });

  const shopCats = await prisma.shopCategory.findMany({
    where: { shopId: membership.shopId },
    select: { categoryId: true },
  });

  return NextResponse.json({ success: true, data: shopCats.map((sc) => sc.categoryId) });
}

// PATCH: toggle a category for the active shop
export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (isNextResponse(guard)) {
    // Not platform admin — check shop membership
    const session = await getSession();
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const membership = await prisma.shopMember.findFirst({
    where: { userId: session.userId },
    select: { shopId: true, role: true },
  });
  if (!membership || !["OWNER", "MANAGER"].includes(membership.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  const { categoryId, selected } = await request.json();
  const { shopId } = membership;

  if (selected) {
    await prisma.shopCategory.upsert({
      where: { shopId_categoryId: { shopId, categoryId } },
      create: { shopId, categoryId },
      update: {},
    });
  } else {
    await prisma.shopCategory.deleteMany({ where: { shopId, categoryId } });
  }

  return NextResponse.json({ success: true });
}
