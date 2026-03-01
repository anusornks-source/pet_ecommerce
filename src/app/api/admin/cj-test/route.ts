import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const email = process.env.CJ_EMAIL;
  const password = process.env.CJ_PASSWORD;

  if (!email || !password) {
    return NextResponse.json({ success: false, error: "CJ_EMAIL / CJ_PASSWORD ไม่ได้ตั้งค่าใน .env" });
  }

  try {
    const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (data.result && data.data?.accessToken) {
      return NextResponse.json({
        success: true,
        message: "✅ เชื่อมต่อ CJDropshipping สำเร็จ",
        tokenPreview: data.data.accessToken.slice(0, 20) + "...",
      });
    }

    return NextResponse.json({
      success: false,
      error: `CJ ตอบกลับ: ${data.message || JSON.stringify(data)}`,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
}
