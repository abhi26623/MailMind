import { SignInButton, SignOutButton } from "@/app/_components/auth-buttons";
import { getSession } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  return (
    <HydrateClient>
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-500/30 selection:text-blue-900">
        
        {/* Navigation Bar */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md">
                M
              </div>
              <span className="font-extrabold tracking-tight text-lg text-slate-900">
                MailMind
              </span>
            </Link>
            <div className="flex items-center gap-4">
              {!session ? (
                <SignInButton className="text-sm font-bold bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 transition-colors shadow-sm" />
              ) : (
                <>
                  <Link href="/inbox" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">
                    Go to App
                  </Link>
                  <SignOutButton className="text-sm font-bold bg-white text-slate-700 px-5 py-2 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm" />
                </>
              )}
            </div>
          </div>
        </nav>

        <main className="relative flex flex-col items-center overflow-hidden pt-32 pb-20">
          {/* Ambient Glow Effects */}
          <div className="pointer-events-none absolute top-20 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-blue-400/20 blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="pointer-events-none absolute top-1/3 -right-64 h-[400px] w-[400px] rounded-full bg-cyan-400/20 blur-[100px]" />
          <div className="pointer-events-none absolute bottom-0 -left-64 h-[500px] w-[500px] rounded-full bg-indigo-400/20 blur-[120px]" />

          {/* Hero Section */}
          <section className="relative z-10 w-full max-w-5xl mx-auto px-6 text-center pt-10 pb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-200 bg-white/50 backdrop-blur-sm mb-8 animate-slide-up shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-blue-600">The Future of Inbox Management</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-8 animate-slide-up text-slate-900" style={{ animationDelay: '100ms' }}>
              Stop managing email.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                Start living your life.
              </span>
            </h1>
            
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-600 leading-relaxed mb-10 animate-slide-up" style={{ animationDelay: '200ms' }}>
              MailMind is your autonomous AI assistant. It reads, organizes, and negotiates meetings on your behalf, so you can focus on the deep work that actually matters. Reclaim hours of your day.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
              {!session ? (
                <SignInButton className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-base font-extrabold rounded-full hover:scale-105 transition-transform shadow-xl shadow-blue-500/20" />
              ) : (
                <Link href="/inbox" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-base font-extrabold rounded-full hover:scale-105 transition-transform shadow-xl shadow-blue-500/20 text-center">
                  Enter Your Inbox
                </Link>
              )}
            </div>
          </section>

          {/* Impact Dashboard Preview (Decorative) */}
          <section className="relative z-10 w-full max-w-6xl mx-auto px-6 mb-32 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="rounded-2xl border border-white bg-white/50 backdrop-blur-md p-2 shadow-2xl shadow-blue-900/5 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white pointer-events-none" />
              <div className="rounded-xl border border-slate-100 bg-white flex flex-col items-center justify-center py-24 text-center">
                 <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-500 text-blue-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-3xl font-bold text-slate-900 mb-2">14 Hours Saved Weekly</h3>
                 <p className="text-slate-500 max-w-sm">The average MailMind user completely eliminates back-and-forth scheduling.</p>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="relative z-10 w-full max-w-7xl mx-auto px-6 mb-32">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">An assistant that works while you sleep.</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Built from the ground up to understand context, priority, and your unique schedule.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Autonomous Scheduling</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  MailMind reads thread context, checks your calendar, and negotiates the perfect time with your guests. You just show up to the meeting.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Zero-Noise Inbox</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Important emails from clients and team members are surfaced. Newsletters and noise are hidden. Never miss a critical message again.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 hover:-translate-y-2 transition-transform duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-900/5">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900">Agentic Action</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Ask your MailMind agent to "find 15 mins with Sarah this week" or "summarize the project update," and watch it execute instantly.
                </p>
              </div>
            </div>
          </section>

          {/* Direct CTA */}
          <section className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center">
            <div className="p-12 rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-600 shadow-2xl text-white">
              <h2 className="text-3xl md:text-5xl font-extrabold mb-6">Ready to take your life back?</h2>
              <p className="text-lg text-blue-100 mb-10 max-w-xl mx-auto">
                Join thousands of professionals who have automated their inbox and reclaimed their freedom.
              </p>
              {!session ? (
                <SignInButton className="px-10 py-4 bg-white text-blue-600 text-base font-extrabold rounded-full hover:bg-slate-50 transition-transform shadow-lg hover:-translate-y-1 inline-block" />
              ) : (
                <Link href="/inbox" className="px-10 py-4 bg-white text-blue-600 text-base font-extrabold rounded-full hover:bg-slate-50 transition-transform shadow-lg hover:-translate-y-1 inline-block">
                  Go to App
                </Link>
              )}
            </div>
          </section>
        </main>

        {/* Minimal Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 relative z-10 mt-10">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded flex items-center justify-center font-bold text-white text-[10px]">
                M
              </div>
              <span className="font-bold text-slate-900 text-sm">MailMind</span>
            </Link>
            <div className="flex items-center gap-6 text-xs font-medium text-slate-500">
              <a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
        
      </div>
    </HydrateClient>
  );
}
