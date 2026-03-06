import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie, buildTokenPayload } from "@/lib/auth";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${APP_URL}/api/auth/line/callback`;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/login?error=line_cancelled`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return NextResponse.redirect(`${APP_URL}/login?error=line_token`);
    }

    // Get LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();
    if (!profile.userId) {
      return NextResponse.redirect(`${APP_URL}/login?error=line_profile`);
    }

    // Extract email from id_token if available (requires openid scope)
    let email: string | null = null;
    if (tokenData.id_token) {
      try {
        const payload = JSON.parse(
          Buffer.from(tokenData.id_token.split(".")[1], "base64").toString()
        );
        email = payload.email ?? null;
      } catch {
        // id_token decode failed — continue without email
      }
    }

    const lineId: string = profile.userId;
    const name: string = profile.displayName ?? "LINE User";
    const avatar: string | undefined = profile.pictureUrl;
    const userEmail: string = email ?? `${lineId}@line.placeholder`;

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { provider: "line", oauthId: lineId },
    });

    if (!user) {
      const existing = email
        ? await prisma.user.findUnique({ where: { email } })
        : null;
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { provider: "line", oauthId: lineId, avatar: avatar ?? existing.avatar },
        });
      } else {
        user = await prisma.user.create({
          data: { email: userEmail, name, avatar, provider: "line", oauthId: lineId },
        });
      }
    }

    if (!user.active) {
      return NextResponse.redirect(`${APP_URL}/login?error=account_suspended`);
    }

    const token = await signToken(await buildTokenPayload(user));
    await setAuthCookie(token);

    return NextResponse.redirect(`${APP_URL}/`);
  } catch {
    return NextResponse.redirect(`${APP_URL}/login?error=line_failed`);
  }
}
