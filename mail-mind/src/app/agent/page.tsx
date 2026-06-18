'use client'

import Link from 'next/link'
import { AgentChat } from '@/app/_components/AgentChat'

export default function AgentPage() {
  return (
    <div className="h-screen flex flex-col bg-forest-950 text-cream-100 font-sans">
      {/* Top nav bar -- matches the inbox header style */}
      <header className="border-b border-forest-700/80 bg-forest-900/40 backdrop-blur-md px-6 py-3 flex justify-between items-center z-40">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-wheat-500 to-amber-500 rounded-xl flex items-center justify-center font-bold text-forest-950 text-sm shadow-lg shadow-wheat-500/20">
            M
          </div>
          <span className="font-extrabold tracking-tight text-lg bg-gradient-to-r from-cream-100 to-cream-200 bg-clip-text text-transparent">
            MailMind
          </span>
          <span className="text-[10px] font-bold text-wheat-500 uppercase tracking-widest bg-wheat-100 px-2 py-0.5 rounded-full border border-wheat-500/30">
            Agent
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            href="/inbox"
            className="px-3 py-1.5 text-xs font-semibold bg-forest-800 hover:bg-forest-700 border border-forest-700/50 rounded-lg transition-all text-cream-200 hover:text-cream-100"
          >
            ← Inbox
          </Link>
          <Link
            href="/settings"
            className="px-3 py-1.5 text-xs font-semibold bg-forest-800 hover:bg-forest-700 border border-forest-700/50 rounded-lg transition-all text-cream-200 hover:text-cream-100"
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
