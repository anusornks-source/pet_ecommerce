import { NextResponse } from "next/server";

export async function GET() {
  const appId = process.env.FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: "Facebook login not configured" }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`;
  const url = new URL("https://www.facebook.com/v18.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("response_type", "code");

  return NextResponse.redirect(url.toString());
}
