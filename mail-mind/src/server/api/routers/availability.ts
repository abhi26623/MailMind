import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";
import { availabilityBlocks } from "@/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { corsair } from "@/server/corsair";
import crypto from "crypto";

export const availabilityRouter = createTRPCRouter({
  /** Get availability blocks for a date range */
  getBlocks: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(), // "2026-06-22"
        dateTo: z.string(), // "2026-06-28"
      })
    )
    .query(async ({ ctx, input }) => {
      return db.query.availabilityBlocks.findMany({
        where: and(
          eq(availabilityBlocks.tenantId, ctx.tenantId),
          gte(availabilityBlocks.date, input.dateFrom),
          lte(availabilityBlocks.date, input.dateTo)
        ),
      });
    }),

  /** Toggle a 1-hour availability block (create if missing, delete if exists) */
  setBlock: protectedProcedure
    .input(
      z.object({
        date: z.string(), // "2026-06-23"
        hourStart: z.number(), // 14
        hourEnd: z.number(), // 15
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if block already exists → delete it (toggle off)
      const existing = await db.query.availabilityBlocks.findFirst({
        where: and(
          eq(availabilityBlocks.tenantId, ctx.tenantId),
          eq(availabilityBlocks.date, input.date),
          eq(availabilityBlocks.hourStart, input.hourStart)
        ),
      });

      if (existing) {
        await db
          .delete(availabilityBlocks)
          .where(eq(availabilityBlocks.id, existing.id));
        return { action: "deleted" as const, id: existing.id };
      }

      // Create new block
      const id = `avail_${crypto.randomUUID()}`;
      await db.insert(availabilityBlocks).values({
        id,
        tenantId: ctx.tenantId,
        date: input.date,
        hourStart: input.hourStart,
        hourEnd: input.hourEnd,
      });
      return { action: "created" as const, id };
    }),

  /** Delete a specific block by ID */
  deleteBlock: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(availabilityBlocks)
        .where(
          and(
            eq(availabilityBlocks.id, input.id),
            eq(availabilityBlocks.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),

  /**
   * Find free slots: intersection of user-marked availability blocks
   * with no Google Calendar event conflicts.
   */
  findFreeSlots: protectedProcedure
    .input(
      z.object({
        dateFrom: z.string(), // "2026-06-22"
        dateTo: z.string(), // "2026-06-28"
        durationMinutes: z.number().default(45),
        maxSlots: z.number().default(3),
      })
    )
    .query(async ({ ctx, input }) => {
      // 1. Fetch user's availability blocks for the range
      const blocks = await db.query.availabilityBlocks.findMany({
        where: and(
          eq(availabilityBlocks.tenantId, ctx.tenantId),
          gte(availabilityBlocks.date, input.dateFrom),
          lte(availabilityBlocks.date, input.dateTo)
        ),
      });

      if (blocks.length === 0) return [];

      // 2. Fetch real calendar events from Google Calendar via Corsair
      const timeMin = new Date(
        input.dateFrom + "T00:00:00+05:30"
      ).toISOString();
      const timeMax = new Date(
        input.dateTo + "T23:59:59+05:30"
      ).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let calendarEvents: any[] = [];
      try {
        const res = await corsair
          .withTenant(ctx.tenantId)
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .googlecalendar.api.events.getMany({
            calendarId: "primary",
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: "startTime",
          });
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        calendarEvents = (res as any).items ?? [];
      } catch {
        // Calendar not connected or error — proceed with just availability
      }

      // 3. Convert calendar events to busy intervals
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const busy = calendarEvents.map((e: any) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        start: new Date(e.start?.dateTime || e.start?.date || 0),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        end: new Date(e.end?.dateTime || e.end?.date || 0),
      }));

      // 4. For each availability block, find possible slots with no conflict
      const freeSlots: { start: string; end: string; label: string }[] = [];
      const durationMs = input.durationMinutes * 60 * 1000;
      const now = new Date();

      // Sort blocks by date + hourStart for predictable order
      const sortedBlocks = [...blocks].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.hourStart - b.hourStart;
      });

      for (const block of sortedBlocks) {
        const blockStart = new Date(
          `${block.date}T${String(block.hourStart).padStart(2, "0")}:00:00+05:30`
        );
        const blockEnd = new Date(
          `${block.date}T${String(block.hourEnd).padStart(2, "0")}:00:00+05:30`
        );

        // Generate slot starts at 15-minute granularity within this block
        let cursor = blockStart.getTime();
        while (cursor + durationMs <= blockEnd.getTime()) {
          const slotStart = new Date(cursor);
          const slotEnd = new Date(cursor + durationMs);

          // Skip past slots
          if (slotStart <= now) {
            cursor += 15 * 60 * 1000;
            continue;
          }

          // Check overlap with busy intervals
          const hasConflict = busy.some(
            (b) => slotStart < b.end && slotEnd > b.start
          );

          if (!hasConflict) {
            freeSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              label: slotStart.toLocaleString("en-IN", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata",
              }),
            });
          }

          if (freeSlots.length >= input.maxSlots) break;
          cursor += 15 * 60 * 1000;
        }

        if (freeSlots.length >= input.maxSlots) break;
      }

      return freeSlots.slice(0, input.maxSlots);
    }),
});
