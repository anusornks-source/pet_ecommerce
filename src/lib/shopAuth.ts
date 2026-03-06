import { NextRequest, NextResponse } from "next/server";
import { verifyToken, CustomJWTPayload } from "@/lib/auth";

const SHOP_ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 3,
  MANAGER: 2,
  STAFF: 1,
};

export interface ShopAuthResult {
  payload: CustomJWTPayload;
  shopId: string;
}

/**
 * Require admin or shop member access for a shop-scoped admin route.
 * Resolves shopId from: query param ?shopId=, cookie activeShopId, or first shop in JWT.
 * @param minRole - minimum ShopRole required (default: STAFF)
 */
export async function requireShopAdmin(
  request: NextRequest,
  minRole: "STAFF" | "MANAGER" | "OWNER" = "STAFF"
): Promise<ShopAuthResult | NextResponse> {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // Resolve shopId: query param > cookie > first shop in JWT
  const url = new URL(request.url);
  let shopId =
    url.searchParams.get("shopId") ||
    request.cookies.get("activeShopId")?.value ||
    null;

  // Super admin can access any shop
  if (payload.role === "ADMIN") {
    if (!shopId && payload.shopRoles) {
      shopId = Object.keys(payload.shopRoles)[0] ?? null;
    }
    if (!shopId) {
      return NextResponse.json(
        { success: false, error: "No shop selected" },
        { status: 400 }
      );
    }
    return { payload, shopId };
  }

  // Shop member — check JWT shopRoles
  if (!payload.shopRoles || Object.keys(payload.shopRoles).length === 0) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  // If no shopId specified, use first (or only) shop
  if (!shopId) {
    shopId = Object.keys(payload.shopRoles)[0];
  }

  const userRole = payload.shopRoles[shopId];
  if (!userRole) {
    return NextResponse.json(
      { success: false, error: "No access to this shop" },
      { status: 403 }
    );
  }

  // Check role hierarchy
  if ((SHOP_ROLE_HIERARCHY[userRole] ?? 0) < (SHOP_ROLE_HIERARCHY[minRole] ?? 0)) {
    return NextResponse.json(
      { success: false, error: "Insufficient role" },
      { status: 403 }
    );
  }

  return { payload, shopId };
}

/** Type guard for NextResponse */
export function isShopAuthResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
