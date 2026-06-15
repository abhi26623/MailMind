import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";
import { z } from "zod";

export const emailRouter = createTRPCRouter({
  /**
   * Check whether Corsair has stored OAuth tokens for this user's
   * Gmail and Google Calendar integrations.
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    let gmail = false;
    let googlecalendar = false;

    try {
      await corsair.withTenant(ctx.tenantId).gmail.api.threads.list({ maxResults: 1, userId: "me" });
      gmail = true;
    } catch (e: any) {
      // auth-missing means not connected; anything else (403, network) means connected but erroring
      if (!String(e).includes("auth-missing")) gmail = true;
    }

    try {
      await corsair.withTenant(ctx.tenantId).googlecalendar.api.events.getMany({});
      googlecalendar = true;
    } catch (e: any) {
      if (!String(e).includes("auth-missing")) googlecalendar = true;
    }

    return { gmail, googlecalendar };
  }),

  /** Fetch the 50 most recent threads. */
  threads: protectedProcedure.query(async ({ ctx }) => {
    try {
      const res = await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.list({ maxResults: 50, userId: "me" });
      return res;
    } catch (error) {
      console.error("Error fetching threads from Corsair:", error);
      if (error && typeof error === 'object' && 'response' in error) {
        console.error("Response data:", (error as any).response?.data);
      }
      return { threads: [], resultSizeEstimate: 0, _error: String(error) };
    }
  }),

  /** Archive a thread (remove INBOX label). */
  archive: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.modify({
          userId: "me",
          id: input.threadId,
          removeLabelIds: ["INBOX"],
        });
      return { success: true };
    }),

  /** Move a thread to trash. */
  delete: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.trash({
          userId: "me",
          id: input.threadId,
        });
      return { success: true };
    }),

  /** Add or remove the STARRED label on a thread. */
  toggleStar: protectedProcedure
    .input(z.object({ threadId: z.string(), starred: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.modify({
          userId: "me",
          id: input.threadId,
          addLabelIds: input.starred ? ["STARRED"] : [],
          removeLabelIds: input.starred ? [] : ["STARRED"],
        });
      return { success: true };
    }),

  /** Send a reply to a thread. */
  reply: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        to: z.string(),
        subject: z.string(),
        body: z.string(),
        inReplyTo: z.string().optional(),
        references: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const headers = [
        `To: ${input.to}`,
        `Subject: Re: ${input.subject}`,
        ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`] : []),
        ...(input.references ? [`References: ${input.references}`] : []),
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        input.body,
      ].join("\r\n");

      const raw = Buffer.from(headers).toString("base64url");

      await corsair.withTenant(ctx.tenantId).gmail.api.messages.send({
        userId: "me",
        raw,
        threadId: input.threadId,
      });
      return { success: true };
    }),

  /** Send a new email (compose). */
  send: protectedProcedure
    .input(
      z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const headers = [
        `To: ${input.to}`,
        `Subject: ${input.subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        input.body,
      ].join("\r\n");

      const raw = Buffer.from(headers).toString("base64url");

      await corsair.withTenant(ctx.tenantId).gmail.api.messages.send({
        userId: "me",
        raw,
      });
      return { success: true };
    }),

  // ─── Calendar ────────────────────────────────────────────────────────────

  /** Fetch events for a date range (defaults to current week). */
  calendarEvents: protectedProcedure
    .input(
      z.object({
        timeMin: z.string().optional(), // ISO 8601
        timeMax: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const res = await corsair
          .withTenant(ctx.tenantId)
          .googlecalendar.api.events.getMany({
            calendarId: "primary",
            timeMin: input.timeMin ?? startOfWeek.toISOString(),
            timeMax: input.timeMax ?? endOfWeek.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
          });
        return res;
      } catch (error) {
        console.error("Error fetching calendar events:", error);
        return { items: [], _error: String(error) };
      }
    }),

  /** Create a calendar event (invite modal). */
  createEvent: protectedProcedure
    .input(
      z.object({
        summary: z.string(),
        description: z.string().optional(),
        start: z.string(), // ISO 8601 datetime
        end: z.string(),   // ISO 8601 datetime
        attendees: z.array(z.string()).optional(),
        location: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const event = await corsair
        .withTenant(ctx.tenantId)
        .googlecalendar.api.events.create({
          calendarId: "primary",
          event: {
            summary: input.summary,
            description: input.description,
            location: input.location,
            start: { dateTime: input.start, timeZone: "UTC" },
            end: { dateTime: input.end, timeZone: "UTC" },
            attendees: input.attendees?.map((email) => ({ email })),
          },
        });
      return event;
    }),
});
