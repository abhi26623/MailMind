import { SignInButton, SignOutButton } from "@/app/_components/auth-buttons";
import { getSession } from "@/server/better-auth/server";
import { HydrateClient } from "@/trpc/server";
import Link from "next/link";

export default async function Home() {
  const session = await getSession();

  return (
    <HydrateClient>
      <main className="min-h-screen bg-[#FDFBF7] text-forest-950 font-[family-name:var(--font-geist-sans)] overflow-x-hidden selection:bg-wheat-200">
        
        {/* Navigation - Premium Minimal */}
        <nav className="fixed top-0 w-full z-50 bg-[#FDFBF7]/80 backdrop-blur-lg border-b border-forest-900/5 transition-all duration-300">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-full bg-forest-900 flex items-center justify-center font-bold text-cream-100 text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
                M
              </div>
              <span className="font-bold tracking-tight text-base text-forest-950">
                MailMind
              </span>
            </Link>

            <div className="flex items-center space-x-8">
              <div className="hidden md:flex space-x-8 text-sm font-medium text-forest-950/60">
                <Link href="#features" className="hover:text-forest-950 transition-colors">Features</Link>
                <Link href="#agent" className="hover:text-forest-950 transition-colors">Agent</Link>
                <Link href="#faq" className="hover:text-forest-950 transition-colors">FAQ</Link>
              </div>
              <div className="flex items-center space-x-5 pl-8 border-l border-forest-900/10">
                {session ? (
                  <>
                    <Link href="/inbox" className="text-sm font-bold text-forest-950 hover:text-forest-700 transition-colors">Workspace</Link>
                    <SignOutButton className="px-4 py-2 text-xs font-bold bg-cream-200/50 hover:bg-cream-200 rounded-lg transition-all text-forest-950" />
                  </>
                ) : (
                  <>
                    <Link href="/signin" className="text-sm font-bold text-forest-950/70 hover:text-forest-950 transition-colors">Log in</Link>
                    <SignInButton className="px-5 py-2 text-sm font-bold bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-md shadow-forest-900/10 transition-all hover:-translate-y-0.5" />
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* HERO SECTION */}
        <section className="relative pt-36 pb-24 px-6 flex flex-col items-center min-h-[90vh] overflow-hidden">
          {/* Subtle wheat glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-wheat-100 blur-[100px] rounded-full pointer-events-none -z-10" />
          
          <div className="text-center max-w-4xl mx-auto z-10 animate-fade-in-up flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cream-100/50 border border-olive-300/30 text-xs font-bold text-olive-600 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>MailMind Early Access</span>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-extrabold tracking-tighter text-forest-950 mb-6 leading-[0.9]">
              Your inbox,<br/>conquered.
            </h1>
            <p className="text-lg md:text-xl text-forest-950/60 font-medium max-w-2xl mx-auto mb-10 tracking-tight leading-relaxed">
              MailMind acts as your autonomous executive assistant. It schedules meetings, drafts replies, and clears the clutter. Reclaim hours of your day.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              {session ? (
                <Link href="/inbox" className="w-full sm:w-auto px-10 py-4 text-base font-bold bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-xl shadow-forest-900/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
                  Enter Workspace
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </Link>
              ) : (
                <SignInButton className="w-full sm:w-auto px-10 py-4 text-base font-bold bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-xl shadow-forest-900/20 transition-all hover:-translate-y-1" />
              )}
            </div>
          </div>

          {/* CSS INBOX MOCKUP (Image 2 style) with 3D Tilt */}
          <div className="mt-20 w-full max-w-[1100px] mx-auto animate-fade-in-up perspective-1000" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-2xl border border-forest-900/10 bg-[#FAFAFA] shadow-[0_30px_60px_-15px_rgba(26,35,26,0.15)] overflow-hidden flex h-[600px] tilt-card transition-transform duration-500 ease-out preserve-3d">
              
              {/* Fake Sidebar */}
              <div className="w-64 bg-white border-r border-forest-900/5 flex flex-col p-4 hidden md:flex">
                <div className="flex items-center gap-3 mb-8 px-2 mt-2">
                  <div className="w-8 h-8 rounded-full bg-forest-900 flex items-center justify-center font-bold text-cream-100 text-xs">M</div>
                  <div className="font-extrabold text-forest-950 text-sm">MailMind</div>
                </div>
                
                {/* Compose Button */}
                <div className="w-full h-12 bg-forest-900 rounded-xl flex items-center justify-center gap-2 text-cream-100 font-bold text-sm shadow-md mb-6 hover:scale-[1.02] transition-transform">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Compose
                </div>

                <div className="space-y-1 flex-1">
                  <div className="w-full h-10 hover:bg-forest-900/5 rounded-lg flex items-center px-4 text-xs font-bold text-forest-950 gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    Inbox
                  </div>
                  <div className="w-full h-10 hover:bg-forest-900/5 rounded-lg flex items-center px-4 text-xs font-bold text-forest-950/60 gap-3">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                    Favorite
                  </div>
                  <div className="w-full h-10 bg-cream-100/50 rounded-lg flex items-center px-4 text-xs font-bold text-forest-950 gap-3 text-amber-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Read Later
                  </div>
                </div>
              </div>

              {/* Fake Thread List */}
              <div className="w-full md:w-[350px] bg-white border-r border-forest-900/5 flex flex-col">
                <div className="h-20 border-b border-forest-900/5 flex flex-col justify-center px-4 gap-2">
                  <div className="font-bold text-forest-950 text-sm">ReadLater</div>
                  <div className="w-full h-8 bg-forest-900/5 rounded-lg flex items-center px-3 text-[11px] font-medium text-forest-950/40">Search...</div>
                </div>
                <div className="flex-1 overflow-hidden p-3 space-y-2">
                  {/* Item 1 */}
                  <div className="p-3 border border-forest-900/5 rounded-xl bg-white">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="w-8 h-8 rounded-full bg-cyan-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">H</div>
                      <div className="flex-1">
                        <div className="w-3/4 h-3 bg-forest-950 rounded mb-1.5"></div>
                        <div className="w-full h-2 bg-forest-950/20 rounded"></div>
                      </div>
                      <div className="px-1.5 border border-forest-900/20 rounded text-[8px] font-bold text-forest-950">LOW</div>
                    </div>
                  </div>
                  
                  {/* Item 2 - ACTIVE (Image 2 style) */}
                  <div className="p-3 rounded-xl bg-forest-950 text-cream-100 shadow-lg transform scale-[1.02] transition-transform">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">A</div>
                      <div className="flex-1 mt-1">
                        <div className="font-bold text-xs mb-1">Why not both 📈 Discover How</div>
                        <div className="text-[10px] text-cream-100/60 line-clamp-1">Why not both 📈 Discover How</div>
                        <div className="mt-3 inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold bg-forest-800 text-cream-100">OTHER</div>
                      </div>
                      <div className="px-1.5 border border-cream-100/30 rounded text-[8px] font-bold text-cream-100">LOW</div>
                    </div>
                  </div>

                   {/* Item 3 */}
                   <div className="p-3 border border-forest-900/5 rounded-xl bg-white">
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-400 flex-shrink-0 flex items-center justify-center text-white font-bold text-xs">T</div>
                      <div className="flex-1">
                        <div className="w-2/3 h-3 bg-forest-950 rounded mb-1.5"></div>
                        <div className="w-full h-2 bg-forest-950/20 rounded"></div>
                      </div>
                      <div className="px-1.5 border border-red-200 bg-red-50 rounded text-[8px] font-bold text-red-500">URGENT</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fake Email Body */}
              <div className="flex-1 bg-[#FAFAFA] hidden lg:flex flex-col">
                <div className="h-16 border-b border-forest-900/5 flex items-center justify-between px-6 bg-white">
                   <div className="flex space-x-2">
                     <div className="px-3 py-1.5 rounded-lg border border-forest-900/10 text-xs font-bold text-forest-950/70 flex items-center gap-1">
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> Archive <kbd className="ml-1 text-[9px] bg-forest-900/5 px-1 rounded">E</kbd>
                     </div>
                   </div>
                   <div className="px-4 py-1.5 rounded-lg bg-forest-900 text-cream-100 text-xs font-bold shadow-sm flex items-center gap-2">
                     <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg> Reply
                   </div>
                </div>
                
                <div className="flex-1 p-6 flex gap-6 overflow-hidden">
                  <div className="flex-1 bg-white border border-forest-900/5 rounded-xl shadow-sm p-8">
                    <h2 className="text-2xl font-bold text-forest-950 mb-6">Why not both 📈 Discover How</h2>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">A</div>
                      <div>
                        <div className="font-bold text-sm text-forest-950">Axis Mutual Fund</div>
                        <div className="text-xs text-forest-950/50">To: me</div>
                      </div>
                    </div>
                    <div className="w-full aspect-[4/3] bg-gradient-to-br from-forest-950 to-forest-800 rounded-xl mt-4 flex items-center justify-center text-white/20 font-bold text-2xl border-4 border-forest-950">
                      HTML Content
                    </div>
                  </div>

                  <div className="w-64 flex flex-col gap-4">
                    {/* Weekly Digest Box */}
                    <div className="bg-white border border-forest-900/5 rounded-xl p-4 shadow-sm">
                      <div className="text-[10px] font-bold text-forest-950 flex items-center justify-between mb-3 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Weekly Digest</span>
                        <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Generate</span>
                      </div>
                      <div className="text-xs text-blue-600 font-medium">Click Generate to create a summary of your Read Later queue.</div>
                    </div>

                    {/* AI Insight Box */}
                    <div className="bg-white border border-forest-900/5 rounded-xl p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-forest-900"></div>
                      <div className="text-[10px] font-bold text-forest-950 flex items-center justify-between mb-3 uppercase tracking-wider pl-2">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-forest-500"></span> AI Insight</span>
                        <span className="text-cream-100 bg-forest-900 px-1.5 py-0.5 rounded">LOW</span>
                      </div>
                      <p className="text-xs text-forest-950 font-bold mb-2 pl-2">This email contains a vague subject and snippet with a lot of whitespace, likely a promotional or spam message.</p>
                      <p className="text-[10px] text-forest-950/50 italic pl-2 border-l-2 border-forest-900/10 ml-2">"The email lacks a clear subject and content, making it unlikely to require a reply or further action."</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* LIFE IMPACT (BENEFITS) */}
        <section className="py-24 px-6 max-w-4xl mx-auto text-center animate-fade-in-up">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-forest-950 mb-16">
            Stop managing email.<br/><span className="text-olive-400">Start living.</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-12 text-left">
            <div>
              <h3 className="text-lg font-bold text-forest-950 mb-3">Reclaim Time</h3>
              <p className="text-sm text-forest-950/60 leading-relaxed font-medium">
                Clear your inbox before your coffee gets cold. Autonomous triage ensures you only read what matters.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-forest-950 mb-3">Zero Anxiety</h3>
              <p className="text-sm text-forest-950/60 leading-relaxed font-medium">
                Never miss a meeting or forget a follow-up. The AI remembers thread context so you don't have to.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-forest-950 mb-3">Total Control</h3>
              <p className="text-sm text-forest-950/60 leading-relaxed font-medium">
                Nothing sends without your approval. You remain the pilot; MailMind is your co-pilot.
              </p>
            </div>
          </div>
        </section>

        {/* CORE FEATURES GRID (Animated Glow Bento) */}
        <section id="features" className="py-32 px-6 max-w-6xl mx-auto border-t border-forest-900/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-forest-900/10" />
          
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-forest-950">Precision engineered.</h2>
            <p className="text-forest-950/50 mt-4 text-lg font-medium">Stripped of noise, built for speed.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 perspective-1000">
            {/* Feature 1 - Glow Box */}
            <div className="glow-box-container group h-full">
              <div className="glow-box-inner bg-white p-10 rounded-[2rem] h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-forest-900 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <svg className="w-6 h-6 text-cream-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-forest-950 mb-3">Auto-Triage</h3>
                <p className="text-base text-forest-950/60 leading-relaxed font-medium">
                  Priority that sorts itself. Urgent matters surface; newsletters wait. Your attention is preserved for actual work.
                </p>
              </div>
            </div>

            {/* Feature 2 - Glow Box */}
            <div className="glow-box-container group h-full">
              <div className="glow-box-inner bg-white p-10 rounded-[2rem] h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-md shadow-amber-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-forest-950 mb-3">AI Drafting</h3>
                <p className="text-base text-forest-950/60 leading-relaxed font-medium">
                  Hit 'Reply' and let the agent draft the perfect response based on context. Edit, approve, and move on.
                </p>
              </div>
            </div>

            {/* Feature 3 - Glow Box */}
            <div className="glow-box-container group h-full">
              <div className="glow-box-inner bg-white p-10 rounded-[2rem] h-full flex flex-col">
                <div className="w-12 h-12 rounded-xl bg-olive-600 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shadow-md shadow-olive-600/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-forest-950 mb-3">Unified Calendar</h3>
                <p className="text-base text-forest-950/60 leading-relaxed font-medium">
                  Schedule syncs directly from a thread. No tab switching required. Invites, updates, and emails belong together.
                </p>
              </div>
            </div>

            {/* Feature 4 - Glow Box */}
            <div className="glow-box-container group h-full">
              <div className="glow-box-inner bg-forest-950 p-10 rounded-[2rem] h-full flex flex-col text-cream-100">
                <div className="w-12 h-12 rounded-xl bg-cream-100/10 border border-cream-100/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-cream-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </div>
                <h3 className="text-2xl font-bold mb-3">Keyboard Native</h3>
                <p className="text-base text-cream-100/60 leading-relaxed font-medium">
                  Press <kbd className="font-mono bg-cream-100/10 px-1.5 py-0.5 rounded text-xs">E</kbd> to archive, <kbd className="font-mono bg-cream-100/10 px-1.5 py-0.5 rounded text-xs">R</kbd> to reply. Use <kbd className="font-mono bg-cream-100/10 px-1.5 py-0.5 rounded text-xs">Cmd+K</kbd> to navigate anywhere.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AGENT MAGIC SECTION */}
        <section id="agent" className="py-32 px-6 border-t border-forest-900/5 bg-cream-100/20">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-forest-950 mb-6">
              Command it in plain English.
            </h2>
            <p className="text-forest-950/60 mb-16 max-w-xl mx-auto text-lg font-medium">
              Hit Cmd+K and tell MailMind what you want. The agent uses Corsair MCP to securely execute workflows across your apps.
            </p>
            
            <div className="bg-white border border-forest-900/10 rounded-2xl shadow-2xl max-w-2xl mx-auto text-left overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
              <div className="border-b border-forest-900/5 p-5 flex items-center gap-3 bg-[#FAFAFA]">
                <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-sm font-mono font-bold text-forest-950">Find the flight tickets and schedule a cab...</span>
                <div className="ml-auto flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-forest-900/10"></div>
                  <div className="w-3 h-3 rounded-full bg-forest-900/10"></div>
                  <div className="w-3 h-3 rounded-full bg-forest-900/10"></div>
                </div>
              </div>
              <div className="p-8 font-mono text-sm bg-forest-950 text-cream-100/80 leading-loose overflow-x-auto">
                <span className="text-amber-400 font-bold">Agent executing...</span><br/><br/>
                <span className="text-olive-400">✓</span> Found flight details (Delta DL123)<br/>
                <span className="text-olive-400">✓</span> Extracted arrival time: 14:30 EST<br/>
                <span className="text-olive-400">✓</span> Drafted calendar event "Cab to Hotel"<br/><br/>
                <span className="text-cream-100 font-bold">Awaiting your approval to schedule.</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section id="faq" className="py-32 px-6 max-w-3xl mx-auto border-t border-forest-900/5">
          <h2 className="text-4xl font-extrabold tracking-tighter text-forest-950 mb-12">Frequently asked questions.</h2>
          
          <div className="space-y-8">
            <div className="border-b border-forest-900/5 pb-8 group">
              <h4 className="text-lg font-bold text-forest-950 mb-3 group-hover:text-amber-600 transition-colors">Is my data secure?</h4>
              <p className="text-base text-forest-950/60 font-medium leading-relaxed">Yes. Tokens are encrypted per-tenant, and the AI only reads the emails you explicitly search or ask it to process. Your inbox data is never used to train our models.</p>
            </div>
            <div className="border-b border-forest-900/5 pb-8 group">
              <h4 className="text-lg font-bold text-forest-950 mb-3 group-hover:text-amber-600 transition-colors">Does it send emails automatically?</h4>
              <p className="text-base text-forest-950/60 font-medium leading-relaxed">No. MailMind operates as a co-pilot. It will draft replies, calendar events, and follow-ups, but everything requires a single click of approval from you before executing.</p>
            </div>
            <div className="border-b border-forest-900/5 pb-8 group">
              <h4 className="text-lg font-bold text-forest-950 mb-3 group-hover:text-amber-600 transition-colors">What accounts are supported?</h4>
              <p className="text-base text-forest-950/60 font-medium leading-relaxed">Currently, MailMind is deeply integrated with Gmail and Google Calendar via Corsair to provide the fastest, most reliable experience possible.</p>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-32 px-6 text-center border-t border-forest-900/5 bg-[#FAFAFA]">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-forest-950 mb-10">
            Ready to upgrade your workflow?
          </h2>
          <div className="flex justify-center">
            {session ? (
              <Link href="/inbox" className="px-10 py-4 text-base font-bold bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-xl shadow-forest-900/20 transition-all hover:-translate-y-1">
                Launch Workspace
              </Link>
            ) : (
              <SignInButton className="px-10 py-4 text-base font-bold bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-xl shadow-forest-900/20 transition-all hover:-translate-y-1" />
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-12 px-6 border-t border-forest-900/5 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center space-x-2.5">
              <div className="w-6 h-6 rounded bg-forest-900 flex items-center justify-center font-bold text-cream-100 text-[10px]">
                M
              </div>
              <span className="font-bold tracking-tight text-sm text-forest-950">MailMind</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-forest-950/50">
              <Link href="#" className="hover:text-forest-950">Privacy</Link>
              <Link href="#" className="hover:text-forest-950">Terms</Link>
              <Link href="#" className="hover:text-forest-950">Contact</Link>
            </div>
            <p className="text-sm font-medium text-forest-950/30">© 2026 MailMind Inc.</p>
          </div>
        </footer>

      </main>

      {/* Global Styles for Custom Animations */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Fade Up */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }

        /* 3D Tilt Card Effect */
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .tilt-card {
          transform: perspective(1000px) rotateX(2deg) rotateY(-2deg) scale(0.98);
        }
        .tilt-card:hover {
          transform: perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1);
          box-shadow: 0 40px 80px -20px rgba(26,35,26,0.25);
        }

        /* Vercel-style Animated Glow Bento Box */
        .glow-box-container {
          position: relative;
          padding: 1px;
          border-radius: 2rem;
          background: rgba(34, 45, 34, 0.05); /* forest-900/5 */
          overflow: hidden;
          transition: transform 0.3s ease;
        }
        .glow-box-container:hover {
          transform: translateY(-4px);
        }
        
        .glow-box-container::before {
          content: "";
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(from 0deg, transparent 0%, transparent 60%, rgba(212,168,92,0.8) 80%, transparent 100%);
          animation: rotateGlow 4s linear infinite;
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        
        .glow-box-container:hover::before {
          opacity: 1;
        }

        .glow-box-inner {
          position: relative;
          z-index: 10;
          margin: 1px;
          height: calc(100% - 2px);
          width: calc(100% - 2px);
        }

        @keyframes rotateGlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </HydrateClient>
  );
}
