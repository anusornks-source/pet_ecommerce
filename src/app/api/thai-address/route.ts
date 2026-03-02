import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "thai-address.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown[];

    // Get last updated timestamp from DB
    const settings = await prisma.siteSettings.findUnique({
      where: { id: "default" },
      select: { thaiAddressUpdatedAt: true },
    });

    return NextResponse.json(
      { success: true, data, count: data.length, updatedAt: settings?.thaiAddressUpdatedAt ?? null },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
        },
      }
    );
  } catch {
    return NextResponse.json({ success: false, error: "ไม่พบข้อมูลที่อยู่ไทย" }, { status: 500 });
  }
}
