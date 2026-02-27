import { NextResponse } from "next/server";

export async function GET() {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return NextResponse.json({ error: "LINE login not configured" }, { status: 503 });
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/line/callback`;
  const url = new URL("https://access.line.me/oauth2/v2.1/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", channelId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "profile openid email");
  url.searchParams.set("state", "petshop");

  return NextResponse.redirect(url.toString());
}
