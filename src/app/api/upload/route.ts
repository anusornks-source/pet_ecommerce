import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ success: false, error: "ไม่พบไฟล์" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: "รองรับเฉพาะไฟล์ภาพ (jpg, png, webp, gif)" },
      { status: 400 }
    );
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { success: false, error: "ไฟล์ใหญ่เกิน 5MB" },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, {
    access: "public",
    contentType: file.type,
  });

  return NextResponse.json({ success: true, url: blob.url });
}
