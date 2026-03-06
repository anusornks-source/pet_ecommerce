import { SignJWT, jwtVerify, JWTPayload } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-secret-min-32-chars-long!!"
);

export interface CustomJWTPayload {
  userId: string;
  email: string;
  role: string;
  shopRoles?: Record<string, string>; // { shopId: ShopRole }
}

export async function signToken(payload: CustomJWTPayload): Promise<string> {
  return await new SignJWT(payload as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(
  token: string
): Promise<CustomJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as CustomJWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<CustomJWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function removeAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("token");
}

/** Build JWT payload with shop roles for a user */
export async function buildTokenPayload(user: {
  id: string;
  email: string;
  role: string;
}): Promise<CustomJWTPayload> {
  const memberships = await prisma.shopMember.findMany({
    where: { userId: user.id },
    select: { shopId: true, role: true },
  });
  const shopRoles =
    memberships.length > 0
      ? Object.fromEntries(memberships.map((m) => [m.shopId, m.role]))
      : undefined;
  return { userId: user.id, email: user.email, role: user.role, shopRoles };
}
