import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const download = request.nextUrl.searchParams.get("download") === "1";
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { thaiAddressUpdatedAt: true, thaiAddressBlobUrl: true },
    });

    let data: unknown[];

    // Try Blob URL first (updated by admin), fallback to static file
    if (settings?.thaiAddressBlobUrl) {
      const res = await fetch(settings.thaiAddressBlobUrl, { cache: "no-store" });
      if (res.ok) {
        data = await res.json();
      } else {
        // Blob ถูกลบแล้ว — ลบ URL ออกจาก DB เพื่อใช้ static ครั้งถัดไป
        await prisma.siteSettings.update({
          where: { id: "default" },
          data: { thaiAddressBlobUrl: null },
        });
        throw new Error("Blob fetch failed");
      }
    } else {
      const filePath = path.join(process.cwd(), "public", "data", "thai-address.json");
      const raw = fs.readFileSync(filePath, "utf-8");
      data = JSON.parse(raw) as unknown[];
    }

    if (download) {
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="thai-address.json"',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data,
        count: data.length,
        updatedAt: settings?.thaiAddressUpdatedAt ?? null,
        source: settings?.thaiAddressBlobUrl ? "blob" : "static",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch {
    // Final fallback to static file
    try {
      const filePath = path.join(process.cwd(), "public", "data", "thai-address.json");
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw) as unknown[];
      return NextResponse.json(
        { success: true, data, count: data.length, updatedAt: null, source: "static" },
        { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" } }
      );
    } catch {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลที่อยู่ไทย" }, { status: 500 });
    }
  }
}
