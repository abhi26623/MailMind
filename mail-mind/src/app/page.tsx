import { SignInButton, SignOutButton } from "@/app/_components/auth-buttons";
import { getSession } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-white text-slate-900 font-[family-name:var(--font-geist-sans)] overflow-x-hidden selection:bg-blue-200">
        
        {/* Navigation - Ultra Sleek */}
        <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-2xl border-b border-slate-100/50 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white text-sm shadow-[0_0_15px_rgba(59,130,246,0.5)] group-hover:scale-105 transition-transform duration-300">
                M
              </div>
              <span className="font-extrabold tracking-tight text-xl text-slate-900">
                MailMind
              </span>
            </Link>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex space-x-8 text-sm font-medium text-slate-500">
                <Link href="#features" className="hover:text-blue-600 transition-colors">Features</Link>
                <Link href="#agent" className="hover:text-blue-600 transition-colors">Agent</Link>
                <Link href="#security" className="hover:text-blue-600 transition-colors">Security</Link>
              </div>
              <div className="flex items-center space-x-4 pl-6 border-l border-slate-200">
                {session ? (
                  <>
                    <Link href="/inbox" className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">Go to App</Link>
                    <SignOutButton className="px-5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 rounded-full transition-all text-slate-700" />
                  </>
                ) : (
                  <SignInButton className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-500/20 transition-all hover:scale-105" />
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* HERO SECTION - Ultrahuman Style */}
        <section className="relative pt-48 pb-32 px-6 flex flex-col items-center justify-center min-h-[90vh] overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50 rounded-full blur-[120px] opacity-70 pointer-events-none -z-10" />
          
          <div className="text-center max-w-5xl mx-auto z-10 animate-fade-in-up">
            <h1 className="text-6xl md:text-[7rem] font-extrabold tracking-tighter leading-[0.9] text-slate-900 mb-8">
              Conquer your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-400">
                inbox.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto mb-12 tracking-tight">
              MailMind acts as your autonomous executive assistant. It schedules meetings, drafts replies, and clears the clutter, so you can focus on living.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {session ? (
                <Link href="/inbox" className="px-10 py-5 text-lg font-bold bg-slate-900 hover:bg-black text-white rounded-full shadow-2xl shadow-slate-900/20 transition-all hover:-translate-y-1">
                  Enter Workspace
                </Link>
              ) : (
                <SignInButton className="px-10 py-5 text-lg font-bold bg-slate-900 hover:bg-black text-white rounded-full shadow-2xl shadow-slate-900/20 transition-all hover:-translate-y-1" />
              )}
              <Link href="#features" className="px-10 py-5 text-lg font-bold bg-white text-slate-900 border border-slate-200 rounded-full hover:bg-slate-50 transition-all">
                Discover Features
              </Link>
            </div>
          </div>

          {/* Hero Image / Dashboard Mockup */}
          <div className="mt-24 w-full max-w-6xl mx-auto relative perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 bottom-0 h-1/3" />
            <div className="bg-slate-50 border border-slate-200/60 rounded-[2rem] shadow-2xl shadow-blue-900/5 overflow-hidden transform rotate-x-2 scale-100 hover:scale-[1.02] transition-transform duration-700 ease-out">
              <div className="h-8 bg-slate-100/50 border-b border-slate-200 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-white to-slate-50 p-12 flex items-center justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[100px]" />
                <div className="absolute left-10 bottom-10 w-[400px] h-[400px] bg-cyan-100/40 rounded-full blur-[80px]" />
                <div className="relative z-10 text-center">
                  <div className="w-24 h-24 mx-auto bg-white rounded-3xl shadow-xl shadow-blue-500/10 flex items-center justify-center border border-blue-50 mb-6">
                    <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h3 className="text-4xl font-extrabold tracking-tight text-slate-800">Your Agent is Active</h3>
                  <p className="text-slate-500 mt-2 font-medium">Processing 1,204 emails autonomously</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SCROLLING MARQUEE */}
        <section className="py-12 border-y border-slate-100 bg-slate-50/50 overflow-hidden flex whitespace-nowrap">
          <div className="animate-marquee inline-block text-3xl md:text-5xl font-extrabold text-slate-200 tracking-tighter uppercase px-4">
            Autonomous Scheduling • Zero Inbox • Intelligent Drafting • Unified Calendar • Priority Sorting •
          </div>
          <div className="animate-marquee inline-block text-3xl md:text-5xl font-extrabold text-slate-200 tracking-tighter uppercase px-4">
            Autonomous Scheduling • Zero Inbox • Intelligent Drafting • Unified Calendar • Priority Sorting •
          </div>
        </section>

        {/* FEATURES GRID - High Contrast */}
        <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-slate-900 mb-6">
              Precision engineered.
            </h2>
            <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">
              We stripped away the noise and built an email client that actually works for you, not against you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-[2.5rem] p-12 overflow-hidden relative group hover:bg-slate-100 transition-colors">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full blur-[80px] -mr-20 -mt-20 group-hover:bg-blue-200 transition-colors" />
              <div className="relative z-10">
                <svg className="w-10 h-10 text-blue-600 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <h3 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Unified Calendar.</h3>
                <p className="text-lg text-slate-500 font-medium">
                  Your events and emails live in perfect harmony. Create meetings from emails in one click.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900 rounded-[2.5rem] p-12 overflow-hidden relative group">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-900/50 rounded-full blur-[80px] -ml-20 -mb-20" />
              <div className="relative z-10">
                <svg className="w-10 h-10 text-cyan-400 mb-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                <h3 className="text-4xl font-extrabold tracking-tight text-white mb-4">Zero Inbox.</h3>
                <p className="text-lg text-slate-300 font-medium">
                  Automatically sort out newsletters, spam, and noise so you only see what truly matters.
                </p>
              </div>
            </div>
            
            {/* Feature 3 - Full Width */}
            <div className="bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[2.5rem] p-12 md:p-20 overflow-hidden relative md:col-span-2 text-white shadow-2xl shadow-blue-500/20">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
              <div className="relative z-10 max-w-2xl">
                <h3 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-6">Agentic Intelligence.</h3>
                <p className="text-xl md:text-2xl text-blue-50 font-medium mb-10 leading-relaxed">
                  Chat with your inbox. Ask MailMind to "Find my flight tickets" or "Draft a polite decline to John's invite". It just works.
                </p>
                {session ? (
                  <Link href="/agent" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 font-bold rounded-full hover:bg-blue-50 transition-colors text-lg">
                    Try the Agent
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                ) : (
                  <SignInButton className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 font-bold rounded-full hover:bg-blue-50 transition-colors text-lg" />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 text-center">
          <h2 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-slate-900 mb-8">
            Ready to upgrade?
          </h2>
          <div className="flex justify-center">
            {session ? (
              <Link href="/inbox" className="px-12 py-6 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/30 transition-all hover:scale-105">
                Launch Workspace
              </Link>
            ) : (
              <SignInButton className="px-12 py-6 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl shadow-blue-600/30 transition-all hover:scale-105" />
            )}
          </div>
        </section>

        {/* MINIMAL FOOTER */}
        <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center font-bold text-white text-[10px]">
                M
              </div>
              <span className="font-bold tracking-tight text-slate-800">MailMind</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-slate-500">
              <Link href="#" className="hover:text-blue-600">Privacy</Link>
              <Link href="#" className="hover:text-blue-600">Terms</Link>
              <Link href="#" className="hover:text-blue-600">Twitter</Link>
            </div>
            <p className="text-sm text-slate-400 font-medium">© 2026 MailMind Inc.</p>
          </div>
        </footer>

      </main>

      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </HydrateClient>
  );
}
