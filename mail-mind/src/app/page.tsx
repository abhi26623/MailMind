import { SignInButton } from "@/app/_components/auth-buttons";
import { getSession } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/inbox");
  }

  return (
    <HydrateClient>
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-forest-950 text-cream-100">
        {/* Ambient glow blobs */}
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-wheat-500/10 blur-[128px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/4 translate-y-1/4 rounded-full bg-amber-500/10 blur-[100px]" />
        <div className="pointer-events-none absolute left-0 top-1/2 h-[350px] w-[350px] -translate-x-1/3 -translate-y-1/2 rounded-full bg-olive-400/5 blur-[100px]" />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-16 px-6 py-24">
          {/* Logo + badge */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-wheat-500 to-amber-500 text-2xl font-bold text-forest-950 shadow-lg shadow-wheat-500/20">
              M
            </div>
            <span className="rounded-full border border-wheat-500/30 bg-wheat-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-wheat-500">
              AI-Powered Email Assistant
            </span>
          </div>

          {/* Hero */}
          <div className="space-y-6 text-center">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-7xl">
              <span className="bg-gradient-to-r from-wheat-500 to-amber-500 bg-clip-text text-transparent">
                MailMind
              </span>{" "}
              negotiates your{" "}
              <br className="hidden sm:block" />
              meetings for you.
            </h1>
            <p className="mx-auto max-w-xl text-lg leading-relaxed text-cream-200">
              Mark your availability. Let AI find the perfect time. Book with
              one click.
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4">
            <SignInButton />
            <p className="text-xs text-olive-500">
              Free to start · No credit card required
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid w-full max-w-3xl grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Card 1 */}
            <div className="group relative overflow-hidden rounded-2xl border border-forest-700 bg-forest-900 p-6 transition-all duration-300 hover:border-wheat-500/30 hover:shadow-lg hover:shadow-wheat-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-wheat-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wheat-100 text-wheat-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-cream-100">Smart Scheduling</h3>
                <p className="text-sm leading-relaxed text-olive-400">
                  AI reads your email threads and suggests the best meeting
                  times based on everyone&apos;s availability.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group relative overflow-hidden rounded-2xl border border-forest-700 bg-forest-900 p-6 transition-all duration-300 hover:border-wheat-500/30 hover:shadow-lg hover:shadow-wheat-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-wheat-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wheat-100 text-wheat-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-cream-100">Priority Inbox</h3>
                <p className="text-sm leading-relaxed text-olive-400">
                  Important messages rise to the top. Noise fades away. Focus
                  on what actually matters.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group relative overflow-hidden rounded-2xl border border-forest-700 bg-forest-900 p-6 transition-all duration-300 hover:border-wheat-500/30 hover:shadow-lg hover:shadow-wheat-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-wheat-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="relative z-10 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-wheat-100 text-wheat-500">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.591-.659L5 14.5m14 0V17a2 2 0 01-2 2H7a2 2 0 01-2-2v-2.5" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-cream-100">AI Agent</h3>
                <p className="text-sm leading-relaxed text-olive-400">
                  A conversational assistant that drafts replies, schedules
                  events, and manages your inbox hands-free.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-olive-600">
            © 2026 MailMind. Built with ❤ and AI.
          </p>
        </div>
      </main>
    </HydrateClient>
  );
}
