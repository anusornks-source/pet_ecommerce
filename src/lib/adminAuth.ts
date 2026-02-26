import { NextRequest, NextResponse } from "next/server";
import { verifyToken, CustomJWTPayload } from "@/lib/auth";

export async function requireAdmin(
  request: NextRequest
): Promise<CustomJWTPayload | NextResponse> {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  return payload;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
