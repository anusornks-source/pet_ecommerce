import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isNextResponse } from "@/lib/adminAuth";
import { getCJToken } from "@/lib/cjDropshipping";

// GET /api/admin/cj-debug?pid=xxx — returns raw CJ product detail for debugging
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (isNextResponse(auth)) return auth;

  const pid = request.nextUrl.searchParams.get("pid");
  if (!pid) return NextResponse.json({ error: "pid required" });

  const token = await getCJToken();
  const res = await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?pid=${pid}`, {
    headers: { "CJ-Access-Token": token },
  });
  const data = await res.json();
  return NextResponse.json(data);
}
