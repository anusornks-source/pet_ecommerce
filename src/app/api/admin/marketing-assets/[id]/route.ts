import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(_request);
  if (isNextResponse(auth)) return auth;

  const { id } = await params;

  const asset = await prisma.marketingAsset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ success: false, error: "Asset not found" }, { status: 404 });
  }

  try {
    if (asset.url && asset.url.includes("blob.vercel-storage.com")) {
      await del(asset.url);
    }
  } catch (err) {
    console.error("[marketing-assets] blob del error:", err);
  }

  await prisma.marketingAsset.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
