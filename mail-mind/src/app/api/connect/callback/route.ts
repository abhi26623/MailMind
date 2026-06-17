import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth";
import { corsair } from "@/server/corsair";
import { processOAuthCallback } from "corsair/oauth";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const clearCookieHeaders = {
    "Set-Cookie": "oauth_state=; HttpOnly; Path=/; Max-Age=0",
  };

  if (error) {
    return new NextResponse(
      `<html><body><h2>Authorization failed</h2><p>${escapeHtml(error)}</p></body></html>`,
      { status: 400, headers: { ...clearCookieHeaders, "Content-Type": "text/html" } }
    );
  }

  if (!code || !state) {
    return new NextResponse("Missing code or state parameter.", {
      status: 400,
      headers: { ...clearCookieHeaders, "Content-Type": "text/html" }
    });
  }

  const storedState = request.cookies.get("oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return new NextResponse("Invalid state. Possible CSRF attempt.", {
      status: 400,
      headers: { ...clearCookieHeaders, "Content-Type": "text/html" }
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/connect/callback`;

  try {
    await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri,
    });

    const response = NextResponse.redirect(`${appUrl}/settings`);
    response.cookies.delete("oauth_state");
    return response;
  } catch (err) {
    console.error("OAuth process error:", err);
    const message = err instanceof Error ? err.message : String(err);
    const response = new NextResponse(
      `<html><body><h2>OAuth error</h2><p>${escapeHtml(message)}</p></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
    response.cookies.delete("oauth_state");
    return response;
  }
}
