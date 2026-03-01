import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  if (!process.env.CJ_API_KEY) {
    return NextResponse.json({ success: false, error: "CJ_API_KEY ไม่ได้ตั้งค่าใน env" });
  }

  // Use cached token (same as production flow)
  let token: string;
  try {
    token = await getCJToken();
  } catch (err) {
    return NextResponse.json({
      success: false,
      step: "auth",
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Test token with product search
  try {
    const searchRes = await fetch(`${CJ_BASE}/product/list?pageNum=1&pageSize=1&productNameEn=pet`, {
      headers: { "CJ-Access-Token": token },
    });
    const searchData = await searchRes.json();

    if (searchData.result) {
      return NextResponse.json({
        success: true,
        message: "✅ เชื่อมต่อ CJDropshipping สำเร็จ",
        tokenPreview: token.slice(0, 20) + "...",
      });
    }

    return NextResponse.json({
      success: false,
      step: "search",
      error: searchData.message || JSON.stringify(searchData),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      step: "search",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
