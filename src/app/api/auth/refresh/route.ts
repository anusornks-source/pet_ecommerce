import { NextResponse } from "next/server";
import { getSession, buildTokenPayload, signToken, setAuthCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST /api/auth/refresh — re-issue JWT with fresh shopRoles from DB */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, role: true },
  });
  if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

  const payload = await buildTokenPayload(user);
  const token = await signToken(payload);
  await setAuthCookie(token);

  return NextResponse.json({ success: true, data: { shopRoles: payload.shopRoles } });
}
