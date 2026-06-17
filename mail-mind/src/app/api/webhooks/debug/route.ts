/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import type { NextRequest } from "next/server";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { account, corsairAccounts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { hashTenantId } from "@/lib/hash";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tenantId = session.user.id;
  const hashedId = hashTenantId(tenantId);

  const baAccount = await db.query.account.findFirst({
    where: (a, { and, eq }) =>
      and(eq(a.userId, tenantId), eq(a.providerId, "google")),
  });

  if (!baAccount) {
    return Response.json({ error: "No Google account linked" }, { status: 400 });
  }

  const result: any = {
    tenantId,
    hashedTenantId: hashedId,
    userEmail: session.user.email,
    webhookEndpoint: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks`,
    hasAccessToken: !!baAccount.accessToken,
    hasRefreshToken: !!baAccount.refreshToken,
    accessTokenExpiresAt: baAccount.accessTokenExpiresAt?.toISOString() ?? "NULL",
    isExpired: !baAccount.accessTokenExpiresAt || baAccount.accessTokenExpiresAt < new Date(),
  };

  // --- Step 1: Refresh token ---
  let accessToken = baAccount.accessToken!;

  if (!baAccount.refreshToken) {
    result.tokenRefresh = "NO REFRESH TOKEN -- user must re-login with Google (need access_type=offline)";
  } else {
    // Always force-refresh to get a fresh token
    try {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!,
          client_secret: process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!,
          refresh_token: baAccount.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const responseText = await res.text();

      if (res.ok) {
        const data = JSON.parse(responseText);
        accessToken = data.access_token;
        const newExpiry = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);

        await db.update(account)
          .set({
            accessToken,
            accessTokenExpiresAt: newExpiry,
            updatedAt: new Date(),
          })
          .where(eq(account.id, baAccount.id));

        result.tokenRefresh = `SUCCESS -- new expiry: ${newExpiry.toISOString()}`;
      } else {
        result.tokenRefresh = `FAILED (${res.status}): ${responseText}`;
      }
    } catch (err) {
      result.tokenRefresh = `ERROR: ${String(err)}`;
    }
  }

  // --- Step 2: Register Gmail watch ---
  try {
    const watchRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/watch",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topicName: process.env.CORSAIR_WEBHOOK_TOPIC ?? "projects/mail-mind-499304/topics/corsair-webhooks",
          labelIds: ["INBOX"],
        }),
      }
    );
    const watchBody = await watchRes.text();
    result.gmailWatchResult = watchRes.ok
      ? `SUCCESS: ${watchBody}`
      : `FAILED (${watchRes.status}): ${watchBody}`;
  } catch (err) {
    result.gmailWatchResult = `ERROR: ${String(err)}`;
  }

  // --- Step 3: Corsair accounts ---
  const corsairAccts = await db
    .select()
    .from(corsairAccounts)
    .where(eq(corsairAccounts.tenantId, tenantId));

  result.corsairAccountsCount = corsairAccts.length;
  result.corsairAccountsLastUpdate = corsairAccts.map(a => ({
    id: a.id,
    integrationId: a.integrationId,
    updatedAt: a.updatedAt.toISOString(),
  }));

  return Response.json(result);
}
