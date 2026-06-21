import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { corsair } from "@/server/corsair";

/** Strip CR/LF from email header values to prevent SMTP header injection. */
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

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
      // 1. Create Calendar Event — if this fails, surface the error immediately
      try {
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
      } catch (e) {
        throw new Error(`Failed to create calendar event: ${String(e)}`);
      }

      // 2. Send Email Reply — calendar event was already created; surface reply failures
      try {
        const headers = [
          `To: ${sanitizeHeader(input.attendeeEmail)}`,
          `Subject: Re: ${sanitizeHeader(input.summary)}`,
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
      } catch (e) {
        // Calendar event was created but the reply email failed.
        // Surface this clearly so the user knows the event is booked even if reply failed.
        throw new Error(`Meeting scheduled, but reply email failed to send: ${String(e)}`);
      }

      return { success: true };
    }),
});

