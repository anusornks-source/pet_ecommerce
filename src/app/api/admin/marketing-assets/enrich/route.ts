import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { enrichMarketingAssetMetadata } from "@/lib/marketingAssets";

/** POST /api/admin/marketing-assets/enrich?productId=xxx — อัปเดต metadata สำหรับ assets ที่ยังไม่มี */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ success: false, error: "productId required" }, { status: 400 });
  }

  try {
    const { updated, failed } = await enrichMarketingAssetMetadata(productId);
    return NextResponse.json({
      success: true,
      data: { updated, failed },
    });
  } catch (err) {
    console.error("[enrich marketing-assets]", err);
    return NextResponse.json(
      { success: false, error: "อัปเดต metadata ไม่สำเร็จ" },
      { status: 500 }
    );
  }
}
