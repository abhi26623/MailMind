import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";


export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx: _ctx, input: _input }) => {
      // For now, doing nothing since posts table was removed
    }),

  getLatest: protectedProcedure.query(async ({ ctx: _ctx }) => {
    // const post = await ctx.db.query.posts.findFirst({
    //   orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    // });

    // return post ?? null;

    return null as { id: number; name: string } | null;
  }),

  getSecretMessage: protectedProcedure.query(() => {
    return "you can now see this secret message!";
  }),
});
