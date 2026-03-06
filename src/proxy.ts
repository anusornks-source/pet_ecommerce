import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const protectedRoutes = ["/checkout", "/profile"];
const adminRoutes = ["/admin"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = adminRoutes.some((route) => pathname.startsWith(route));
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected && !isAdmin) {
    const response = NextResponse.next();
    response.headers.set("x-pathname", pathname);
    return response;
  }

  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    const response = NextResponse.redirect(
      new URL(`/login?redirect=${pathname}`, request.url)
    );
    response.cookies.delete("token");
    return response;
  }

  if (isAdmin && payload.role !== "ADMIN") {
    // Allow shop members (OWNER/MANAGER/STAFF) — admin layout checks DB access
    const hasShopRoles = payload.shopRoles && Object.keys(payload.shopRoles).length > 0;
    if (!hasShopRoles) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
