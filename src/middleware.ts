import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const protectedRoutes = ["/checkout", "/profile"];
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = adminRoutes.some((route) => pathname.startsWith(route));
  const isProtected = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtected && !isAdmin) return NextResponse.next();

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
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/checkout/:path*", "/profile/:path*", "/admin/:path*"],
};
