import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  if (!process.env.FAL_API_KEY) {
    return NextResponse.json({ success: false, error: "FAL_API_KEY ยังไม่ได้ตั้งค่า" }, { status: 500 });
  }

  fal.config({ credentials: process.env.FAL_API_KEY });

  const { prompt, aspectRatio = "1:1", imageUrls } = await request.json();

  if (!prompt) {
    return NextResponse.json({ success: false, error: "prompt required" }, { status: 400 });
  }

  const arMap: Record<string, string> = {
    "1:1": "square_hd",
    "4:5": "portrait_4_3",
    "9:16": "portrait_16_9",
  };
  const imageSize = arMap[aspectRatio] ?? "square_hd";
  const refImages: string[] = Array.isArray(imageUrls) ? imageUrls.filter(Boolean) : [];

  try {
    const result = refImages.length > 1
      ? await fal.subscribe("fal-ai/flux-pro/kontext/multi", {
          input: {
            image_urls: refImages,
            prompt,
            num_images: 1,
            enable_safety_checker: true,
          },
        })
      : refImages.length === 1
      ? await fal.subscribe("fal-ai/flux-pro/kontext", {
          input: {
            image_url: refImages[0],
            prompt,
            num_images: 1,
            enable_safety_checker: true,
          },
        })
      : await fal.subscribe("fal-ai/flux/schnell", {
          input: {
            prompt,
            image_size: imageSize,
            num_inference_steps: 4,
            num_images: 1,
            enable_safety_checker: true,
          },
        });

    const data = result.data as { images?: { url: string }[] };
    const resultUrl = data?.images?.[0]?.url;

    if (!resultUrl) {
      return NextResponse.json({ success: false, error: "ไม่ได้รับรูปจาก Fal" });
    }

    return NextResponse.json({ success: true, url: resultUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[generate-image]", message);
    return NextResponse.json({ success: false, error: message });
  }
}
