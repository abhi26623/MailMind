/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";
import { initializeIntegrationDEK } from "corsair/core";
import { createCorsairDatabase } from "corsair/db";
import { hashTenantId } from "@/lib/hash";
import { corsairAccounts, corsairIntegrations, corsairEntities, corsairEvents, account } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { conn } from "@/server/db";
import crypto from "crypto";
import { z } from "zod";

/**
 * Refresh the Google OAuth access token using the refresh token.
 * Updates the BetterAuth account table with the new token.
 */
async function refreshGoogleToken(db: any, baAccount: any): Promise<string> {
  const isExpired = !baAccount.accessTokenExpiresAt || baAccount.accessTokenExpiresAt < new Date();

  // If token is still valid, just use it
  if (!isExpired && baAccount.accessToken) {
    return baAccount.accessToken;
  }

  if (!baAccount.refreshToken) {
    throw new Error("Access token expired and no refresh token available. Please re-login with Google.");
  }

  console.log("[Connect] Access token expired, refreshing...");

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

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Connect] Token refresh failed:", errText);
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const data = await res.json();
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in ?? 3600;
  const newExpiry = new Date(Date.now() + expiresIn * 1000);

  // Update BetterAuth account table with fresh token
  await db.update(account)
    .set({
      accessToken: newAccessToken,
      accessTokenExpiresAt: newExpiry,
      updatedAt: new Date(),
    })
    .where(eq(account.id, baAccount.id));

  console.log("[Connect] Token refreshed successfully, expires:", newExpiry.toISOString());

  return newAccessToken;
}

export const connectRouter = createTRPCRouter({
  seedFromBetterAuth: protectedProcedure.mutation(async ({ ctx }) => {
    // 1. Pull tokens from BetterAuth
    const baAccount = await ctx.db.query.account.findFirst({
      where: (a, { and, eq }) =>
        and(eq(a.userId, ctx.tenantId), eq(a.providerId, 'google')),
    });

    if (!baAccount?.accessToken) {
      throw new Error('No Google account found');
    }

    // 1b. Refresh token if expired
    const accessToken = await refreshGoogleToken(ctx.db, baAccount);

    // 2. Seed Gmail Account Row & Keys
    let gmailIntegration = await ctx.db
      .select()
      .from(corsairIntegrations)
      .where(eq(corsairIntegrations.name, "gmail"))
      .then((res) => res[0]);

    if (!gmailIntegration) {
      const inserted = await ctx.db
        .insert(corsairIntegrations)
        .values({
          id: crypto.randomUUID(),
          name: "gmail",
          config: {},
        })
        .returning();
      gmailIntegration = inserted[0];
    }

    // Ensure integration-level DEK exists and credentials are set (required by Corsair API calls)
    if (!gmailIntegration!.dek) {
      await initializeIntegrationDEK(
        createCorsairDatabase(conn),
        "gmail",
        process.env.CORSAIR_KEK!
      );
    }

    // Store OAuth client credentials on the integration (shared across all tenants)
    const gmailIntegrationKeys = (corsair as any).keys?.gmail;
    if (gmailIntegrationKeys) {
      const existingClientId = await gmailIntegrationKeys.get_client_id?.().catch(() => null);
      if (!existingClientId) {
        await gmailIntegrationKeys.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!);
        await gmailIntegrationKeys.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!);
        await gmailIntegrationKeys.set_redirect_url(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/callback`
        );
      }
    }

    const gmailKeys = corsair.withTenant(ctx.tenantId).gmail.keys;
    if (gmailKeys) {
      // Only update tokens for EXISTING account rows.
      // Account creation only happens via explicit /api/connect OAuth flow.
      const gmailAccount = await ctx.db
        .select()
        .from(corsairAccounts)
        .where(
          and(
            eq(corsairAccounts.tenantId, ctx.tenantId),
            eq(corsairAccounts.integrationId, gmailIntegration!.id)
          )
        )
        .then((res) => res[0]);

      if (gmailAccount) {
        // Initialize keys DEK
        try {
          await gmailKeys.get_dek();
        } catch {
          await gmailKeys.issue_new_dek();
        }

        // Refresh tokens
        await gmailKeys.set_access_token(accessToken);
        if (baAccount.refreshToken) {
          await gmailKeys.set_refresh_token(baAccount.refreshToken);
        }
      }
    }

    // 3. Seed Google Calendar Account Row & Keys
    let calendarIntegration = await ctx.db
      .select()
      .from(corsairIntegrations)
      .where(eq(corsairIntegrations.name, "googlecalendar"))
      .then((res) => res[0]);

    if (!calendarIntegration) {
      const inserted = await ctx.db
        .insert(corsairIntegrations)
        .values({
          id: crypto.randomUUID(),
          name: "googlecalendar",
          config: {},
        })
        .returning();
      calendarIntegration = inserted[0];
    }

    // Ensure integration-level DEK exists and credentials are set (required by Corsair API calls)
    if (!calendarIntegration!.dek) {
      await initializeIntegrationDEK(
        createCorsairDatabase(conn),
        "googlecalendar",
        process.env.CORSAIR_KEK!
      );
    }

    // Store OAuth client credentials on the integration (shared across all tenants)
    const calendarIntegrationKeys = (corsair as any).keys?.googlecalendar;
    if (calendarIntegrationKeys) {
      const existingClientId = await calendarIntegrationKeys.get_client_id?.().catch(() => null);
      if (!existingClientId) {
        await calendarIntegrationKeys.set_client_id(process.env.BETTER_AUTH_GOOGLE_CLIENT_ID!);
        await calendarIntegrationKeys.set_client_secret(process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET!);
        await calendarIntegrationKeys.set_redirect_url(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/callback`
        );
      }
    }

    const googlecalendarKeys = corsair.withTenant(ctx.tenantId).googlecalendar.keys;
    if (googlecalendarKeys) {
      // Only update tokens for EXISTING account rows.
      // Account creation only happens via explicit /api/connect OAuth flow.
      const calendarAccount = await ctx.db
        .select()
        .from(corsairAccounts)
        .where(
          and(
            eq(corsairAccounts.tenantId, ctx.tenantId),
            eq(corsairAccounts.integrationId, calendarIntegration!.id)
          )
        )
        .then((res) => res[0]);

      if (calendarAccount) {
        // Initialize keys DEK
        try {
          await googlecalendarKeys.get_dek();
        } catch {
          await googlecalendarKeys.issue_new_dek();
        }

        // Refresh tokens
        await googlecalendarKeys.set_access_token(accessToken);
        if (baAccount.refreshToken) {
          await googlecalendarKeys.set_refresh_token(baAccount.refreshToken);
        }
      }
    }

    // 4. Register webhooks -- only for integrations the user has explicitly connected
    const hashedId = hashTenantId(ctx.tenantId);
    const webhookUrl = `${process.env.WEBHOOK_URL}/api/webhooks?tenantId=${hashedId}`;

    // Gmail watch -- only if user has a gmail account row
    const gmailAccountExists = await ctx.db
      .select({ id: corsairAccounts.id })
      .from(corsairAccounts)
      .where(
        and(
          eq(corsairAccounts.tenantId, ctx.tenantId),
          eq(corsairAccounts.integrationId, gmailIntegration!.id)
        )
      )
      .then((res) => res.length > 0);

    if (gmailAccountExists) {
      const gmailWatchRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topicName: process.env.CORSAIR_WEBHOOK_TOPIC ?? 'projects/mail-mind-499304/topics/corsair-webhooks',
            labelIds: ["INBOX"],
          }),
        }
      );
      if (!gmailWatchRes.ok) {
        console.error("Gmail watch registration failed:", await gmailWatchRes.text());
      } else {
        const watchData = await gmailWatchRes.json();
        console.log("Gmail watch registered successfully! Expiration:", watchData.expiration);
      }
    }

    // Calendar watch -- only if user has a googlecalendar account row
    const calendarAccountExists = await ctx.db
      .select({ id: corsairAccounts.id })
      .from(corsairAccounts)
      .where(
        and(
          eq(corsairAccounts.tenantId, ctx.tenantId),
          eq(corsairAccounts.integrationId, calendarIntegration!.id)
        )
      )
      .then((res) => res.length > 0);

    if (calendarAccountExists) {
      const calendarWatchRes = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/watch`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            type: "web_hook",
            address: webhookUrl,
          }),
        }
      );
      if (!calendarWatchRes.ok) {
        console.error("Google Calendar watch registration failed:", await calendarWatchRes.text());
      } else {
        console.log("Google Calendar watch registered successfully!");
      }
    }


    return { success: true };
  }),

  /**
   * Disconnect a plugin integration for the current tenant.
   * Clears the stored tokens and DEK from the account row.
   */
  disconnect: protectedProcedure
    .input(z.object({
      plugin: z.enum(["gmail", "googlecalendar"]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the integration row
      const integration = await ctx.db
        .select()
        .from(corsairIntegrations)
        .where(eq(corsairIntegrations.name, input.plugin))
        .then((res) => res[0]);

      if (!integration) {
        return { success: true }; // Nothing to disconnect
      }

      // Find the account row for this tenant
      const acct = await ctx.db
        .select()
        .from(corsairAccounts)
        .where(
          and(
            eq(corsairAccounts.tenantId, ctx.tenantId),
            eq(corsairAccounts.integrationId, integration.id)
          )
        )
        .then((res) => res[0]);

      if (!acct) {
        return { success: true }; // Nothing to disconnect
      }

      // Clear the account tokens and DEK
      const pluginKeys = (corsair.withTenant(ctx.tenantId) as any)[input.plugin]?.keys;
      if (pluginKeys) {
        try {
          await pluginKeys.set_access_token(null);
          await pluginKeys.set_refresh_token(null);
        } catch {
          // Ignore errors clearing tokens -- still delete the account row
        }
      }

      // Delete child rows first (FK constraints: entities and events reference account)
      await ctx.db
        .delete(corsairEvents)
        .where(eq(corsairEvents.accountId, acct.id));

      await ctx.db
        .delete(corsairEntities)
        .where(eq(corsairEntities.accountId, acct.id));

      // Now delete the account row
      await ctx.db
        .delete(corsairAccounts)
        .where(eq(corsairAccounts.id, acct.id));

      return { success: true };
    }),
});
