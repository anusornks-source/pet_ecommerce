import { NextRequest, NextResponse } from "next/server";
import { verifyToken, CustomJWTPayload } from "@/lib/auth";

/**
 * Require ADMIN or shop member access.
 * Pass { strictAdmin: true } for routes that ONLY platform ADMIN should access.
 */
export async function requireAdmin(
  request: NextRequest,
  options?: { strictAdmin?: boolean }
): Promise<CustomJWTPayload | NextResponse> {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (payload.role === "ADMIN") return payload;

  // Allow shop members for non-strict routes
  if (!options?.strictAdmin && payload.shopRoles && Object.keys(payload.shopRoles).length > 0) {
    return payload;
  }

  return NextResponse.json(
    { success: false, error: "Forbidden" },
    { status: 403 }
  );
}

const ROLE_LEVEL: Record<string, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };

/**
 * Allows ADMIN or a shop member with at least `minRole` for the given shopId.
 */
export async function requireShopOwner(
  request: NextRequest,
  shopId: string,
  minRole: "STAFF" | "MANAGER" | "OWNER" = "OWNER"
): Promise<CustomJWTPayload | NextResponse> {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  if (payload.role === "ADMIN") return payload;

  const shopRole = payload.shopRoles?.[shopId];
  if (!shopRole || (ROLE_LEVEL[shopRole] ?? 0) < (ROLE_LEVEL[minRole] ?? 0)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  return payload;
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
