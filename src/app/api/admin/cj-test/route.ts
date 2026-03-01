import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  if (!process.env.CJ_API_KEY) {
    return NextResponse.json({ success: false, error: "CJ_API_KEY ไม่ได้ตั้งค่าใน env" });
  }

  try {
    const token = await getCJToken();

    // Test token with a simple product search
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/product/list", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({ pageNum: 1, pageSize: 1, productNameEn: "pet" }),
    });
    const data = await res.json();

    if (data.result) {
      return NextResponse.json({
        success: true,
        message: "✅ เชื่อมต่อ CJDropshipping สำเร็จ",
        tokenPreview: token.slice(0, 20) + "...",
      });
    }

    return NextResponse.json({
      success: false,
      error: `CJ ตอบกลับ: ${data.message || JSON.stringify(data)}`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
