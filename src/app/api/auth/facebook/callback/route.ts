import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${APP_URL}/api/auth/facebook/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=facebook_cancelled`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID!,
          client_secret: process.env.FACEBOOK_APP_SECRET!,
          redirect_uri: REDIRECT_URI,
          code,
        })
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${APP_URL}/login?error=facebook_token`);
    }

    // Get user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.width(200)&access_token=${tokenData.access_token}`
    );
    const profile = await profileRes.json();
    if (!profile.id) {
      return NextResponse.redirect(`${APP_URL}/login?error=facebook_profile`);
    }

    const fbId: string = profile.id;
    const name: string = profile.name ?? "Facebook User";
    const email: string = profile.email ?? `${fbId}@facebook.placeholder`;
    const avatar: string | undefined = profile.picture?.data?.url;

    // Find or create user — try by oauthId first, then by email (link existing account)
    let user = await prisma.user.findFirst({
      where: { provider: "facebook", oauthId: fbId },
    });

    if (!user) {
      // Check if email already exists (email/password account) → link it
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { provider: "facebook", oauthId: fbId, avatar: avatar ?? existing.avatar },
        });
      } else {
        user = await prisma.user.create({
          data: { email, name, avatar, provider: "facebook", oauthId: fbId },
        });
      }
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });
    await setAuthCookie(token);

    return NextResponse.redirect(`${APP_URL}/`);
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=facebook_failed`);
  }
}
