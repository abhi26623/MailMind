import { type NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/server/better-auth";
import { corsair } from "@/server/corsair";
import { generateOAuthUrl } from "corsair/oauth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const plugin = searchParams.get("plugin");
  if (!plugin || (plugin !== "gmail" && plugin !== "googlecalendar")) {
    return new NextResponse("Invalid or missing plugin parameter", { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/connect/callback`;

  try {
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId: session.user.id,
      redirectUri,
    });

    const response = NextResponse.redirect(url);
    response.cookies.set("oauth_state", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 10, // 10 minutes
    });
    return response;
  } catch (error) {
    console.error("Failed to generate OAuth URL:", error);
    return new NextResponse("Failed to initiate connection", { status: 500 });
  }
}
