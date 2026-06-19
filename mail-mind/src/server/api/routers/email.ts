import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";
import { z } from "zod";

export const emailRouter = createTRPCRouter({
  /**
   * Check whether Corsair has stored OAuth tokens for this user's
   * Gmail and Google Calendar integrations.
   */
  getConnectionStatus: protectedProcedure.query(async ({ ctx }) => {
    let gmail = { connected: false, error: null as string | null };
    let googlecalendar = { connected: false, error: null as string | null };

    try {
      await corsair.withTenant(ctx.tenantId).gmail.api.threads.list({ maxResults: 1, userId: "me" });
      gmail = { connected: true, error: null };
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("auth-missing")) {
        gmail = { connected: false, error: "Not connected" };
      } else {
        // 403, scope issues, network errors -- NOT connected properly
        gmail = { connected: false, error: msg.includes("403") ? "Missing permissions -- please reconnect Google" : msg };
      }
    }

    try {
      await corsair.withTenant(ctx.tenantId).googlecalendar.api.events.getMany({});
      googlecalendar = { connected: true, error: null };
    } catch (e: unknown) {
      const msg = String(e);
      if (msg.includes("auth-missing")) {
        googlecalendar = { connected: false, error: "Not connected" };
      } else {
        googlecalendar = { connected: false, error: msg.includes("403") ? "Missing permissions -- please reconnect Google" : msg };
      }
    }

    return { gmail, googlecalendar };
  }),

  /** Fetch threads with pagination (infinite scrolling). */
  threads: protectedProcedure
    .input(z.object({ 
      cursor: z.string().nullish(),
      labelIds: z.array(z.string()).optional(),
      q: z.string().optional()
    }).optional())
    .query(async ({ ctx, input }) => {
      try {
        const listParams: any = { 
          maxResults: 20, 
          userId: "me",
          pageToken: input?.cursor ?? undefined
        };
        if (input?.labelIds && input.labelIds.length > 0) {
          listParams.labelIds = input.labelIds;
        }
        if (input?.q) {
          listParams.q = input.q;
        }

        const res = await corsair
          .withTenant(ctx.tenantId)
          .gmail.api.threads.list(listParams);
        return {
          threads: res.threads || [],
          nextCursor: res.nextPageToken || null,
          resultSizeEstimate: res.resultSizeEstimate || 0
        };
      } catch (error) {
        console.error("Error fetching threads from Corsair:", error);
        if (error && typeof error === 'object' && 'response' in error) {
          console.error("Response data:", (error as Record<string, unknown>).response);
        }
        return { threads: [], nextCursor: null, resultSizeEstimate: 0, _error: String(error) };
      }
    }),

  /** Fetch full details (messages, bodies) for a single thread. */
  threadDetails: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const res = await corsair
          .withTenant(ctx.tenantId)
          .gmail.api.threads.get({ userId: "me", id: input.threadId });
        return res;
      } catch (error) {
        console.error(`Error fetching thread details for ${input.threadId}:`, error);
        return { messages: [], _error: String(error) };
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

  /** Summarize a thread. */
  summarizeThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.get({ userId: "me", id: input.threadId });
      
      let allText = "";
      for (const msg of res.messages || []) {
        if (msg.snippet) allText += msg.snippet + "\n";
      }

      const { openrouter, AGENT_MODELS } = await import("@/lib/ai");
      const systemPrompt = `Summarize this email chain concisely in 2-3 bullet points.`;
      
      const llmRes = await openrouter.chat.completions.create({
        model: AGENT_MODELS.geminiFlashLite.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: allText.substring(0, 4000) },
        ],
        temperature: 0.3,
      });

      return { summary: llmRes.choices[0]?.message?.content || "No summary available." };
    }),

  /** Unsubscribe and Optionally Clean up past emails. */
  unsubscribeAndClean: protectedProcedure
    .input(z.object({ threadId: z.string(), cleanUp: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const threadRes = await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.threads.get({ userId: "me", id: input.threadId });

      let listUnsubscribeHeader = "";
      let senderEmail = "";
      
      if (threadRes.messages && threadRes.messages.length > 0) {
        const lastMsg = threadRes.messages[threadRes.messages.length - 1];
        const headers = lastMsg.payload?.headers || [];
        
        const unsub = headers.find((h: any) => h.name.toLowerCase() === "list-unsubscribe");
        if (unsub) listUnsubscribeHeader = unsub.value;

        const from = headers.find((h: any) => h.name.toLowerCase() === "from");
        if (from) {
          const match = from.value.match(/<([^>]+)>/);
          if (match) senderEmail = match[1];
          else senderEmail = from.value;
        }
      }

      if (listUnsubscribeHeader) {
        const mailtoMatch = listUnsubscribeHeader.match(/<mailto:([^>]+)>/);
        if (mailtoMatch) {
          const toAddress = mailtoMatch[1];
          const headersStr = [
            `To: ${toAddress}`,
            `Subject: Unsubscribe`,
            "Content-Type: text/plain; charset=utf-8",
            "MIME-Version: 1.0",
            "",
            "Unsubscribe",
          ].join("\r\n");
          const raw = Buffer.from(headersStr).toString("base64url");
          try {
             await corsair.withTenant(ctx.tenantId).gmail.api.messages.send({ userId: "me", raw });
          } catch(e) {
             console.error("Failed to send mailto unsubscribe", e);
          }
        } else {
           const urlMatch = listUnsubscribeHeader.match(/<https?:\/\/([^>]+)>/);
           if (urlMatch) {
              const url = urlMatch[0].replace("<", "").replace(">", "");
              try {
                 await fetch(url, { method: 'POST' }).catch(() => fetch(url));
              } catch (e) {
                 console.error("Failed to fetch unsubscribe URL", e);
              }
           }
        }
      }

      // Cleanup
      let deletedCount = 0;
      if (input.cleanUp && senderEmail) {
         try {
            const listRes = await corsair.withTenant(ctx.tenantId).gmail.api.messages.list({
               userId: "me",
               q: `from:${senderEmail}`,
               maxResults: 100
            });
            const messages = listRes.messages || [];
            if (messages.length > 0) {
               const ids = messages.map((m: any) => m.id);
               await corsair.withTenant(ctx.tenantId).gmail.api.messages.batchTrash({
                  userId: "me",
                  ids
               });
               deletedCount = ids.length;
            }
         } catch(e) {
            console.error("Failed to cleanup emails", e);
         }
      }

      return { success: true, deletedCount, listUnsubscribeFound: !!listUnsubscribeHeader };
    }),

  // Calendar

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

  /** Delete a calendar event (Google auto-notifies attendees via sendUpdates). */
  deleteEvent: protectedProcedure
    .input(z.object({ eventId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      await (corsair.withTenant(ctx.tenantId) as any)
        .googlecalendar.api.events.delete({
          calendarId: "primary",
          eventId: input.eventId,
          sendUpdates: "all",
        });
      return { success: true };
    }),
});
