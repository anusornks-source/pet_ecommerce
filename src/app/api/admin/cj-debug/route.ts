import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// Parse CJ JSON preserving large numeric vid values as strings
function parseCJJson(text: string) {
  const safe = text.replace(/"vid"\s*:\s*(\d{10,})/g, '"vid":"$1"');
  return JSON.parse(safe);
}

// GET /api/admin/cj-debug?pid=xxx — raw product detail
// GET /api/admin/cj-debug?vid=xxx,yyy — raw inventory for comma-separated vids
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const token = await getCJToken();
  const pid = request.nextUrl.searchParams.get("pid");
  const vid = request.nextUrl.searchParams.get("vid");

  if (pid) {
    const res = await fetch(`${CJ_BASE}/product/query?pid=${pid}`, {
      headers: { "CJ-Access-Token": token },
    });
    return NextResponse.json(parseCJJson(await res.text()));
  }

  if (vid) {
    const res = await fetch(`${CJ_BASE}/product/stock/queryByVid?vid=${vid}`, {
      headers: { "CJ-Access-Token": token },
    });
    return NextResponse.json(parseCJJson(await res.text()));
  }

  return NextResponse.json({ error: "pid or vid required" });
}
