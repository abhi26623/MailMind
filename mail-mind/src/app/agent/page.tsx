'use client'

import Link from 'next/link'
import { authClient } from "@/server/better-auth/client";
import { SignOutButton } from '@/app/_components/auth-buttons'
import { AgentChat } from '@/app/_components/AgentChat'

export default function AgentPage() {
  const { data: session } = authClient.useSession();
  return (
    <div className="h-screen flex flex-col bg-[#F5F6F8] text-slate-800 font-sans">
      {/* Top nav bar */}
      <header className="border-b border-slate-200/60 bg-white/60 backdrop-blur-md px-6 py-3 flex justify-between items-center z-40">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md">
            M
          </div>
          <span className="font-extrabold tracking-tight text-lg text-slate-800">
            MailMind
          </span>
        </Link>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-widest bg-cyan-100 px-2 py-0.5 rounded-full border border-cyan-200">
            Agent
          </span>
          {session?.user && (
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {session.user.name}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/calendar"
            className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-700 shadow-sm"
          >
            Calendar
          </Link>
          <Link
            href="/inbox"
            className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-700 shadow-sm flex items-center space-x-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            <span>Inbox</span>
          </Link>
          <Link
            href="/settings"
            className="px-4 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all text-slate-700 shadow-sm"
          >
            Settings
          </Link>
          <SignOutButton className="px-4 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all text-rose-600 shadow-sm ml-2" />
        </div>
      </header>

      {/* Chat fills remaining height */}
      <div className="flex-1 overflow-hidden relative">
        <AgentChat />
      </div>
    </div>
  )
}
