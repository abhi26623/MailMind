import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";

export const workflowRouter = createTRPCRouter({
  scheduleFromEmail: protectedProcedure
    .input(z.object({
      threadId: z.string(),
      attendeeEmail: z.string(),
      summary: z.string(),
      start: z.string(),
      end: z.string(),
      replyBody: z.string()
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Create Calendar Event
      await corsair
        .withTenant(ctx.tenantId)
        .googlecalendar.api.events.create({
          calendarId: "primary",
          sendUpdates: "all",
          event: {
            summary: input.summary,
            start: { dateTime: input.start, timeZone: "UTC" },
            end: { dateTime: input.end, timeZone: "UTC" },
            attendees: [{ email: input.attendeeEmail }],
          },
        });

      // 2. Send Email Reply
      const headers = [
        `To: ${input.attendeeEmail}`,
        `Subject: Re: ${input.summary}`,
        "Content-Type: text/plain; charset=utf-8",
        "MIME-Version: 1.0",
        "",
        input.replyBody,
      ].join("\r\n");

      const raw = Buffer.from(headers).toString("base64url");

      await corsair.withTenant(ctx.tenantId).gmail.api.messages.send({
        userId: "me",
        raw,
        threadId: input.threadId,
      });

      return { success: true };
    }),
});
