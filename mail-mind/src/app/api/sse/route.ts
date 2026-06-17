import type { NextRequest } from "next/server";
import { auth } from "@/server/better-auth";
import { webhookBus } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  const tenantId = session?.user?.id;

  if (!tenantId) return new Response("Unauthorized", { status: 401 });

  let unsubscribe: () => void;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("data: connected\n\n"));

      // Subscribe to instant webhook events -- no DB polling needed
      unsubscribe = webhookBus.subscribe(tenantId, () => {
        controller.enqueue(new TextEncoder().encode("data: refresh\n\n"));
        console.log(`[SSE] Refresh sent via Event Bus for tenant: ${tenantId}`);
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
    },
  });

  req.signal.addEventListener("abort", () => {
    if (unsubscribe) unsubscribe();
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
