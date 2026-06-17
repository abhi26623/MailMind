'use client'

import Link from 'next/link'
import { AgentChat } from '@/app/_components/AgentChat'

export default function AgentPage() {
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top nav bar -- matches the inbox header style */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md px-6 py-3 flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-indigo-500/20">
            M
          </div>
          <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            MailMind
          </span>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            Agent
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/inbox"
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-all text-slate-300 hover:text-slate-100"
          >
            ← Inbox
          </Link>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-all text-slate-300 hover:text-slate-100"
          >
            Settings
          </Link>
        </div>
      </header>

      {/* Chat fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <AgentChat />
      </div>
    </div>
  )
}
