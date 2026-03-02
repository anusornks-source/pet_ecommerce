import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Increase body limit for large JSON file (~1MB)
export const maxDuration = 30;

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  try {
    const body = await request.json();
    const data = body.data as Array<{ district: string; amphoe: string; province: string; zipcode: string }>;

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ถูกต้อง — ต้องเป็น array ของที่อยู่" }, { status: 400 });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ success: false, error: "ยังไม่ได้ตั้งค่า BLOB_READ_WRITE_TOKEN" }, { status: 400 });
    }

    const { put } = await import("@vercel/blob");
    const raw = JSON.stringify(data);
    const blob = await put("thai-address.json", raw, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    await prisma.siteSettings.upsert({
      where: { id: "default" },
      create: { id: "default", thaiAddressBlobUrl: blob.url, thaiAddressUpdatedAt: new Date() },
      update: { thaiAddressBlobUrl: blob.url, thaiAddressUpdatedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `อัปโหลดสำเร็จ — ${data.length.toLocaleString("th-TH")} รายการ`,
      count: data.length,
      blobUrl: blob.url,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
