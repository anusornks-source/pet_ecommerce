import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = await (prisma.siteSettings as any).upsert({
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
  const { storeName, logoUrl, adminEmail, promptpayId, bankName, bankAccount, bankAccountName } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = await (prisma.siteSettings as any).upsert({
    where: { id: "default" },
    create: {
      id: "default",
      storeName: storeName ?? "PetShop",
      logoUrl: logoUrl || null,
      adminEmail: adminEmail || null,
      promptpayId: promptpayId || null,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
      bankAccountName: bankAccountName || null,
    },
    update: {
      ...(storeName !== undefined && { storeName }),
      ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      ...(adminEmail !== undefined && { adminEmail: adminEmail || null }),
      ...(promptpayId !== undefined && { promptpayId: promptpayId || null }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount || null }),
      ...(bankAccountName !== undefined && { bankAccountName: bankAccountName || null }),
    },
  });

  return NextResponse.json({ success: true, data: settings });
}
