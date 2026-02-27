import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: { id: "default", storeName: "PetShop" },
    update: {},
  });

  return NextResponse.json({ success: true, data: settings });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const body = await request.json();
  const { storeName, logoUrl, adminEmail } = body;

  const settings = await prisma.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      storeName: storeName ?? "PetShop",
      logoUrl: logoUrl || null,
      adminEmail: adminEmail || null,
    },
    update: {
      ...(storeName !== undefined && { storeName }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(adminEmail !== undefined && { adminEmail: adminEmail || null }),
    },
  });

  return NextResponse.json({ success: true, data: settings });
}
