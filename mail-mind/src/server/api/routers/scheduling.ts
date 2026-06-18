/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { schedulingNegotiations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { corsair } from "@/server/corsair";
import crypto from "crypto";

export const schedulingRouter = createTRPCRouter({
  /** Get active negotiations for sidebar display */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const rows = await db.query.schedulingNegotiations.findMany({
      where: eq(schedulingNegotiations.tenantId, ctx.tenantId),
    });
    // Return all except completed/cancelled for active display
    return rows.filter(
      (r) => r.status !== "booked" && r.status !== "cancelled"
    );
  }),

  /** Get all negotiations (including completed, for history) */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return db.query.schedulingNegotiations.findMany({
      where: eq(schedulingNegotiations.tenantId, ctx.tenantId),
    });
  }),

  /** Create a negotiation and send the scheduling email with numbered options */
  create: protectedProcedure
    .input(
      z.object({
        recipientEmail: z.string(),
        recipientName: z.string().optional(),
        duration: z.number(),
        proposedSlots: z.array(
          z.object({
            start: z.string(),
            end: z.string(),
            label: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = `sched_${crypto.randomUUID()}`;
      const name =
        input.recipientName || input.recipientEmail.split("@")[0] || "there";

      // 1. Compose the scheduling email with numbered options
      const slotLines = input.proposedSlots
        .map((s, i) => `${i + 1}. ${s.label}`)
        .join("\n");

      const emailBody = [
        `Hi ${name},`,
        ``,
        `I'd like to schedule a ${input.duration}-minute meeting. I'm available at these times:`,
        ``,
        slotLines,
        ``,
        `Please reply with the number that works best for you.`,
        ``,
        `Best regards`,
      ].join("\n");

      const raw = Buffer.from(
        [
          `To: ${input.recipientEmail}`,
          `Subject: Meeting request - ${input.duration} minutes`,
          `Content-Type: text/plain; charset=utf-8`,
          `MIME-Version: 1.0`,
          ``,
          emailBody,
        ].join("\r\n")
      ).toString("base64url");

      // 2. Send via Corsair Gmail
      const sendResult = (await corsair
        .withTenant(ctx.tenantId)
        .gmail.api.messages.send({ userId: "me", raw })) as any;

      // 3. Save negotiation to DB
      await db.insert(schedulingNegotiations).values({
        id,
        tenantId: ctx.tenantId,
        threadId: (sendResult.threadId as string) ?? null,
        recipientEmail: input.recipientEmail,
        recipientName: name,
        duration: input.duration,
        proposedSlots: input.proposedSlots,
        status: "sent",
      });

      return { id, threadId: sendResult.threadId as string | null };
    }),

  /** Book the meeting: create calendar event + send confirmation email */
  chooseSlot: protectedProcedure
    .input(
      z.object({
        negotiationId: z.string(),
        slotIndex: z.number().int().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const negotiation = await db.query.schedulingNegotiations.findFirst({
        where: and(
          eq(schedulingNegotiations.id, input.negotiationId),
          eq(schedulingNegotiations.tenantId, ctx.tenantId)
        ),
      });

      if (!negotiation) {
        throw new Error("Negotiation not found");
      }

      const slots = negotiation.proposedSlots as {
        start: string;
        end: string;
        label: string;
      }[];
      const slot = slots[input.slotIndex];

      if (!slot) {
        throw new Error("Slot not found");
      }

      await db
        .update(schedulingNegotiations)
        .set({
          chosenSlot: slot,
          status: "replied",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schedulingNegotiations.id, input.negotiationId),
            eq(schedulingNegotiations.tenantId, ctx.tenantId)
          )
        );

      return { success: true };
    }),

  /** Book the meeting: create calendar event + send confirmation email */
  book: protectedProcedure
    .input(z.object({ negotiationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const negotiation =
        await db.query.schedulingNegotiations.findFirst({
          where: and(
            eq(schedulingNegotiations.id, input.negotiationId),
            eq(schedulingNegotiations.tenantId, ctx.tenantId)
          ),
        });

      if (!negotiation || !negotiation.chosenSlot) {
        throw new Error("No chosen slot found for this negotiation");
      }

      const slot = negotiation.chosenSlot as {
        start: string;
        end: string;
      };

      // 1. Create calendar event with Google auto-notification
      await (corsair.withTenant(ctx.tenantId) as any).googlecalendar.api.events.create({
        calendarId: "primary",
        sendUpdates: "all",
        event: {
          summary: `Meeting with ${negotiation.recipientName}`,
          start: {
            dateTime: slot.start,
            timeZone: "Asia/Kolkata",
          },
          end: {
            dateTime: slot.end,
            timeZone: "Asia/Kolkata",
          },
          attendees: [{ email: negotiation.recipientEmail }],
        },
      });

      // 2. Send confirmation email
      const raw = Buffer.from(
        [
          `To: ${negotiation.recipientEmail}`,
          `Subject: Meeting confirmed`,
          `Content-Type: text/plain; charset=utf-8`,
          `MIME-Version: 1.0`,
          ``,
          `Hi ${negotiation.recipientName},\n\nOur meeting has been confirmed. You should have received a calendar invite.\n\nLooking forward to it!\n\nBest regards`,
        ].join("\r\n")
      ).toString("base64url");

      await corsair.withTenant(ctx.tenantId).gmail.api.messages.send({
        userId: "me",
        raw,
        threadId: negotiation.threadId ?? undefined,
      });

      // 3. Update negotiation status
      await db
        .update(schedulingNegotiations)
        .set({ status: "booked", updatedAt: new Date() })
        .where(eq(schedulingNegotiations.id, input.negotiationId));

      return { success: true };
    }),

  /** Cancel a negotiation */
  cancel: protectedProcedure
    .input(z.object({ negotiationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(schedulingNegotiations)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(schedulingNegotiations.id, input.negotiationId),
            eq(schedulingNegotiations.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),
});
