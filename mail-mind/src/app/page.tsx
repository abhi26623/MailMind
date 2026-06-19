import { SignInButton, SignOutButton } from "@/app/_components/auth-buttons";
import { getSession } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-white text-slate-900 font-[family-name:var(--font-geist-sans)] overflow-x-hidden selection:bg-blue-100">
        
        {/* Navigation - Minimalist */}
        <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center font-bold text-white text-[10px] shadow-sm group-hover:bg-blue-600 transition-colors">
                M
              </div>
              <span className="font-semibold tracking-tight text-sm text-slate-900">
                MailMind
              </span>
            </Link>

            <div className="flex items-center space-x-6">
              <div className="hidden md:flex space-x-6 text-xs font-medium text-slate-500">
                <Link href="#features" className="hover:text-slate-900 transition-colors">Features</Link>
                <Link href="#agent" className="hover:text-slate-900 transition-colors">Agent</Link>
                <Link href="#faq" className="hover:text-slate-900 transition-colors">FAQ</Link>
              </div>
              <div className="flex items-center space-x-4 pl-6 border-l border-slate-100">
                {session ? (
                  <>
                    <Link href="/inbox" className="text-xs font-semibold text-slate-900 hover:text-blue-600 transition-colors">Dashboard</Link>
                    <SignOutButton className="px-3 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded-md transition-all text-slate-700" />
                  </>
                ) : (
                  <>
                    <Link href="/signin" className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">Log in</Link>
                    <SignInButton className="px-4 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md shadow-sm transition-all" />
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* HERO SECTION - Minimal & Rich */}
        <section className="relative pt-32 pb-20 px-6 flex flex-col items-center min-h-[95vh] overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-slate-50 to-white -z-10 pointer-events-none" />
          
          <div className="text-center max-w-4xl mx-auto z-10 animate-fade-in-up flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600 mb-8">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>MailMind Early Access</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-slate-900 mb-6 leading-[0.95]">
              Your inbox,<br/>conquered.
            </h1>
            <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto mb-10 tracking-tight leading-relaxed">
              MailMind acts as your autonomous executive assistant. It schedules meetings, drafts replies, and clears the clutter. Reclaim hours of your day.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
              {session ? (
                <Link href="/inbox" className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-lg shadow-slate-900/10 transition-all flex items-center justify-center gap-2">
                  Enter Workspace
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              ) : (
                <SignInButton className="w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-lg shadow-slate-900/10 transition-all" />
              )}
            </div>
          </div>

          {/* CSS Inbox Mockup Hero Graphic */}
          <div className="mt-20 w-full max-w-[1000px] mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-xl border border-slate-200 bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex h-[500px]">
              
              {/* Fake Sidebar */}
              <div className="w-48 bg-slate-50 border-r border-slate-100 flex flex-col p-4 hidden md:flex">
                <div className="w-24 h-4 bg-slate-200 rounded mb-8"></div>
                <div className="space-y-3">
                  <div className="w-full h-8 bg-blue-100/50 text-blue-600 rounded flex items-center px-3 text-[10px] font-bold tracking-wider">INBOX <span className="ml-auto">12</span></div>
                  <div className="w-full h-8 hover:bg-slate-200/50 rounded flex items-center px-3 text-[10px] font-medium text-slate-500">STARRED</div>
                  <div className="w-full h-8 hover:bg-slate-200/50 rounded flex items-center px-3 text-[10px] font-medium text-slate-500">CALENDAR</div>
                </div>
              </div>

              {/* Fake Thread List */}
              <div className="w-full md:w-80 bg-white border-r border-slate-100 flex flex-col">
                <div className="h-14 border-b border-slate-100 flex items-center px-4">
                  <div className="w-full h-8 bg-slate-100 rounded-md flex items-center px-3 text-[10px] text-slate-400">Search mail (Cmd+K)</div>
                </div>
                <div className="flex-1 overflow-hidden">
                  {/* Item 1 - Active */}
                  <div className="p-4 border-b border-slate-100 bg-blue-50/30">
                    <div className="flex justify-between items-center mb-1">
                      <div className="w-20 h-3 bg-slate-800 rounded"></div>
                      <div className="w-8 h-2 bg-slate-300 rounded"></div>
                    </div>
                    <div className="w-32 h-3 bg-slate-500 rounded mb-2"></div>
                    <div className="w-full h-2 bg-slate-300 rounded mb-1"></div>
                    <div className="w-4/5 h-2 bg-slate-300 rounded"></div>
                    <div className="mt-3 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">HIGH PRIORITY</div>
                  </div>
                  {/* Item 2 */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <div className="w-24 h-3 bg-slate-800 rounded"></div>
                      <div className="w-8 h-2 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-28 h-3 bg-slate-400 rounded mb-2"></div>
                    <div className="w-full h-2 bg-slate-200 rounded mb-1"></div>
                    <div className="w-3/5 h-2 bg-slate-200 rounded"></div>
                  </div>
                   {/* Item 3 */}
                   <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <div className="w-16 h-3 bg-slate-800 rounded"></div>
                      <div className="w-8 h-2 bg-slate-200 rounded"></div>
                    </div>
                    <div className="w-20 h-3 bg-slate-400 rounded mb-2"></div>
                    <div className="w-full h-2 bg-slate-200 rounded mb-1"></div>
                    <div className="w-2/5 h-2 bg-slate-200 rounded"></div>
                    <div className="mt-3 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-100 text-slate-500">NEWSLETTER</div>
                  </div>
                </div>
              </div>

              {/* Fake Email Body */}
              <div className="flex-1 bg-white hidden sm:flex flex-col">
                <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6">
                   <div className="flex space-x-2">
                     <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"><svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></div>
                     <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"><svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div>
                   </div>
                   <div className="inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-50 border border-blue-100">
                     <svg className="w-3 h-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                     <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wider">AI Insight: Needs Scheduling</span>
                   </div>
                </div>
                <div className="p-8 flex-1 relative">
                  <div className="w-3/4 h-6 bg-slate-800 rounded mb-6"></div>
                  <div className="flex items-center mb-8 space-x-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                    <div>
                      <div className="w-32 h-3 bg-slate-800 rounded mb-2"></div>
                      <div className="w-24 h-2 bg-slate-400 rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="w-full h-2 bg-slate-200 rounded"></div>
                    <div className="w-full h-2 bg-slate-200 rounded"></div>
                    <div className="w-4/5 h-2 bg-slate-200 rounded"></div>
                    <div className="w-full h-2 bg-slate-200 rounded mt-6"></div>
                    <div className="w-3/4 h-2 bg-slate-200 rounded"></div>
                  </div>

                  {/* AI Draft Mockup overlapping */}
                  <div className="absolute bottom-6 left-8 right-8 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                    <div className="h-8 bg-slate-50 border-b border-slate-100 flex items-center px-4">
                       <div className="text-[10px] font-semibold text-slate-500">✨ AI Draft Proposal</div>
                    </div>
                    <div className="p-4 space-y-2">
                       <div className="w-full h-2 bg-slate-200 rounded"></div>
                       <div className="w-2/3 h-2 bg-slate-200 rounded"></div>
                    </div>
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                      <div className="w-16 h-6 rounded bg-slate-200"></div>
                      <div className="w-16 h-6 rounded bg-blue-600"></div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* LIFE IMPACT (BENEFITS) */}
        <section className="py-24 px-6 max-w-4xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-slate-900 mb-16">
            Stop managing email.<br/><span className="text-slate-400">Start living.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Reclaim Time</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Clear your inbox before your coffee gets cold. Autonomous triage ensures you only read what matters.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Zero Anxiety</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Never miss a meeting or forget a follow-up. The AI remembers thread context so you don't have to.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Total Control</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nothing sends without your approval. You remain the pilot; MailMind is your co-pilot.
              </p>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID */}
        <section id="features" className="py-24 px-6 max-w-6xl mx-auto border-t border-slate-100">
          <div className="mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Precision engineered.</h2>
            <p className="text-slate-500 mt-2 text-sm">Stripped of noise, built for speed.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Auto-Triage</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Priority that sorts itself. Urgent matters surface; newsletters wait. Your attention is preserved for actual work.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">AI Drafting</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Hit 'Reply' and let the agent draft the perfect response based on context. Edit, approve, and move on.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Unified Calendar</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Schedule syncs directly from a thread. No tab switching required. Invites, updates, and emails belong together.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Keyboard Native</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Press <kbd className="font-mono bg-slate-200 px-1 rounded text-xs">E</kbd> to archive, <kbd className="font-mono bg-slate-200 px-1 rounded text-xs">R</kbd> to reply. Use <kbd className="font-mono bg-slate-200 px-1 rounded text-xs">Cmd+K</kbd> to navigate anywhere. Fly through your mail.
              </p>
            </div>
          </div>
        </section>

        {/* AGENT MAGIC SECTION */}
        <section id="agent" className="py-24 px-6 border-t border-slate-100 bg-slate-50/50">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
              Command it in plain English.
            </h2>
            <p className="text-slate-500 mb-12 max-w-xl mx-auto text-sm md:text-base">
              Hit Cmd+K and tell MailMind what you want. The agent uses Corsair MCP to securely execute workflows across your apps.
            </p>
            
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg max-w-2xl mx-auto text-left overflow-hidden">
              <div className="border-b border-slate-100 p-4 flex items-center gap-3 bg-slate-50">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="text-sm font-mono text-slate-700">Find the flight tickets and schedule a cab...</span>
                <div className="ml-auto flex gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                </div>
              </div>
              <div className="p-6 font-mono text-xs sm:text-sm bg-slate-900 text-slate-300 leading-relaxed overflow-x-auto">
                <span className="text-blue-400">Agent executing...</span><br/><br/>
                <span className="text-emerald-400">✓</span> Found flight details (Delta DL123)<br/>
                <span className="text-emerald-400">✓</span> Extracted arrival time: 14:30 EST<br/>
                <span className="text-emerald-400">✓</span> Drafted calendar event "Cab to Hotel"<br/><br/>
                <span className="text-white">Awaiting your approval to schedule.</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-24 px-6 max-w-3xl mx-auto border-t border-slate-100">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-10">Frequently asked questions.</h2>
          
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-6">
              <h4 className="text-base font-semibold text-slate-900 mb-2">Is my data secure?</h4>
              <p className="text-sm text-slate-500">Yes. Tokens are encrypted per-tenant, and the AI only reads the emails you explicitly search or ask it to process. Your inbox data is never used to train our models.</p>
            </div>
            <div className="border-b border-slate-100 pb-6">
              <h4 className="text-base font-semibold text-slate-900 mb-2">Does it send emails automatically?</h4>
              <p className="text-sm text-slate-500">No. MailMind operates as a co-pilot. It will draft replies, calendar events, and follow-ups, but everything requires a single click of approval from you before executing.</p>
            </div>
            <div className="border-b border-slate-100 pb-6">
              <h4 className="text-base font-semibold text-slate-900 mb-2">What accounts are supported?</h4>
              <p className="text-sm text-slate-500">Currently, MailMind is deeply integrated with Gmail and Google Calendar via Corsair to provide the fastest, most reliable experience possible.</p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 px-6 text-center border-t border-slate-100 bg-slate-50/50">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-slate-900 mb-8">
            Ready to upgrade your workflow?
          </h2>
          <div className="flex justify-center">
            {session ? (
              <Link href="/inbox" className="px-8 py-3.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all">
                Launch Workspace
              </Link>
            ) : (
              <SignInButton className="px-8 py-3.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-600/20 transition-all" />
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-8 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 rounded bg-slate-900 flex items-center justify-center font-bold text-white text-[9px]">
                M
              </div>
              <span className="font-semibold tracking-tight text-xs text-slate-900">MailMind</span>
            </div>
            <div className="flex gap-6 text-xs font-medium text-slate-500">
              <Link href="#" className="hover:text-slate-900">Privacy</Link>
              <Link href="#" className="hover:text-slate-900">Terms</Link>
              <Link href="#" className="hover:text-slate-900">Contact</Link>
            </div>
            <p className="text-xs text-slate-400">© 2026 MailMind Inc.</p>
          </div>
        </footer>

      </main>

      {/* Global Styles for Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}} />
    </HydrateClient>
  );
}
