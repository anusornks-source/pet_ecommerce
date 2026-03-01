import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const email = process.env.CJ_EMAIL;
  if (!email) {
    return NextResponse.json({ success: false, error: "CJ_EMAIL ไม่ได้ตั้งค่าใน env" });
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
        emailUsed: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
        tokenPreview: token.slice(0, 20) + "...",
      });
    }

    return NextResponse.json({
      success: false,
      error: `CJ ตอบกลับ: ${data.message || JSON.stringify(data)}`,
      emailUsed: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err),
      emailUsed: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    });
  }
}
