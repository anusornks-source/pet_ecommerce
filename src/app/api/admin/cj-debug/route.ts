import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

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
    return NextResponse.json(await res.json());
  }

  if (vid) {
    const res = await fetch(`${CJ_BASE}/product/stock/queryByVid`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify({ vid }),
    });
    return NextResponse.json(await res.json());
  }

  return NextResponse.json({ error: "pid or vid required" });
}
