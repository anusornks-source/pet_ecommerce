import { NextRequest, NextResponse } from "next/server";
import { getCJInventory } from "@/lib/cjDropshipping";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";

// GET /api/admin/cj-products/inventory?vids=vid1,vid2,...
// Fetches real-time stock for each vid from CJ inventory API
// Called async from client after product detail loads (avoids blocking the detail response)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const vidsParam = request.nextUrl.searchParams.get("vids");
  if (!vidsParam) return NextResponse.json({ success: false, error: "vids required" }, { status: 400 });

  const vids = vidsParam.split(",").map((v) => v.trim()).filter(Boolean);
  if (vids.length === 0) return NextResponse.json({ success: false, error: "vids required" }, { status: 400 });

  const inventoryMap = await getCJInventory(vids);

  return NextResponse.json({ success: true, data: inventoryMap });
}
