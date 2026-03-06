import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopAdmin, isShopAuthResponse } from "@/lib/shopAuth";

export async function GET(request: NextRequest) {
  const auth = await requireShopAdmin(request);
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  // Return merged shop info + settings as flat object for settings page
  const [shop, settings] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId }, select: { name: true, name_th: true, slug: true, logoUrl: true, coverUrl: true } }),
    prisma.shopSettings.findUnique({ where: { shopId } }),
  ]);

  const data = {
    storeName: shop?.name ?? "",
    logoUrl: shop?.logoUrl ?? "",
    adminEmail: settings?.adminEmail ?? "",
    promptpayId: settings?.promptpayId ?? "",
    bankName: settings?.bankName ?? "",
    bankAccount: settings?.bankAccount ?? "",
    bankAccountName: settings?.bankAccountName ?? "",
    useGlobalPayment: settings?.useGlobalPayment ?? true,
    displayStockMin: settings?.displayStockMin ?? 50,
    displayStockMax: settings?.displayStockMax ?? 100,
  };

  return NextResponse.json({ success: true, data });
}

export async function PUT(request: NextRequest) {
  const auth = await requireShopAdmin(request, "OWNER");
  if (isShopAuthResponse(auth)) return auth;
  const { shopId } = auth;

  const body = await request.json();
  const {
    adminEmail, promptpayId, bankName, bankAccount, bankAccountName,
    displayStockMin, displayStockMax, useGlobalPayment,
    storeName, logoUrl,
  } = body;

  // Only ADMIN can change useGlobalPayment
  const isAdmin = auth.payload.role === "ADMIN";
  const safeUseGlobalPayment = isAdmin ? useGlobalPayment : undefined;

  // Update shop info (name, logo) if provided
  if (storeName !== undefined || logoUrl !== undefined) {
    await prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(storeName !== undefined && { name: storeName }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      },
    });
  }

  const settings = await prisma.shopSettings.upsert({
    where: { shopId },
    create: {
      shopId,
      adminEmail: adminEmail || null,
      promptpayId: promptpayId || null,
      bankName: bankName || null,
      bankAccount: bankAccount || null,
      bankAccountName: bankAccountName || null,
      ...(safeUseGlobalPayment !== undefined && { useGlobalPayment: Boolean(safeUseGlobalPayment) }),
      ...(displayStockMin !== undefined && { displayStockMin: Number(displayStockMin) }),
      ...(displayStockMax !== undefined && { displayStockMax: Number(displayStockMax) }),
    },
    update: {
      ...(adminEmail !== undefined && { adminEmail: adminEmail || null }),
      ...(promptpayId !== undefined && { promptpayId: promptpayId || null }),
      ...(bankName !== undefined && { bankName: bankName || null }),
      ...(bankAccount !== undefined && { bankAccount: bankAccount || null }),
      ...(bankAccountName !== undefined && { bankAccountName: bankAccountName || null }),
      ...(safeUseGlobalPayment !== undefined && { useGlobalPayment: Boolean(safeUseGlobalPayment) }),
      ...(displayStockMin !== undefined && { displayStockMin: Number(displayStockMin) }),
      ...(displayStockMax !== undefined && { displayStockMax: Number(displayStockMax) }),
    },
  });

  return NextResponse.json({ success: true, data: settings });
}
