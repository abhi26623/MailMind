"use client";

import React from "react";
import type { Thread } from "../_utils/email";
import { ThreadListItem } from "./ThreadListItem";

interface Insight {
  threadId: string;
  priority?: string;
  category?: string;
}

interface ThreadListProps {
  isLoading: boolean;
  gmailConnected: boolean;
  /** Raw tRPC data — used to surface backend `_error` fields. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  error: { message?: string } | null | undefined;
  /** All threads (unfiltered) — used for empty-inbox check. */
  threads: Thread[];
  /** Category/folder-filtered threads actually displayed. */
  filteredThreads: Thread[];
  selectedIndex: number;
  activeThread: Thread | null;
  activeCategory: string | null;
  activeFolder: string;
  insights: Insight[] | undefined;
  isFetchingNextPage: boolean;
  isThreadStarred: (thread: Thread | null) => boolean;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onSelectThread: (thread: Thread, index: number) => void;
  onCategorySelect: (category: string | null) => void;
  onConnectGmail: () => void;
  onToggleReadLater: (threadId: string, isReadLater: boolean) => void;
}

export function ThreadList({
  isLoading,
  gmailConnected,
  data,
  error,
  threads,
  filteredThreads,
  selectedIndex,
  activeThread,
  activeCategory,
  activeFolder,
  insights,
  isFetchingNextPage,
  isThreadStarred,
  onScroll,
  onSelectThread,
  onCategorySelect,
  onConnectGmail,
  onToggleReadLater,
}: ThreadListProps) {
  const CATEGORIES = [
    { id: "work", label: "Work", activeClass: "bg-purple-100 border-purple-200 text-purple-700" },
    { id: "social", label: "Social", activeClass: "bg-blue-100 border-blue-200 text-blue-700" },
    { id: "events", label: "Events", activeClass: "bg-cyan-100 border-cyan-200 text-cyan-700" },
    { id: "personal", label: "Personal", activeClass: "bg-amber-100 border-amber-200 text-amber-700" },
  ];

  return (
    <div
      className="w-[320px] xl:w-[380px] flex-shrink-0 border-r border-forest-900/10 bg-white h-full overflow-y-auto flex flex-col"
      onScroll={onScroll}
    >
      {/* Header */}
      <div className="p-4 border-b border-forest-900/10 bg-white sticky top-0 z-10 flex flex-col space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-sm text-slate-800">
            {activeCategory
              ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)
              : activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}
          </h2>
          <div className="flex items-center gap-2">
            {activeCategory && (
              <button
                onClick={() => onCategorySelect(null)}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search (placeholder — wired to future semantic search) */}
        <div className="relative">
          <input
            type="text"
            placeholder="Vector Search..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg text-xs outline-none transition-all placeholder:text-slate-400 text-slate-700 shadow-sm"
          />
          <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter Chips */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 pt-1">
          {CATEGORIES.map(({ id, label, activeClass }) => (
            <button
              key={id}
              onClick={() => onCategorySelect(id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${
                activeCategory === id
                  ? `${activeClass} shadow-sm`
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/50 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : !gmailConnected ? (
        <div className="p-8 mt-12 flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4 max-w-md mx-auto text-center">
          <div className="p-4 bg-sky-50 border border-sky-500/20 rounded-2xl shadow-inner">
            <svg className="w-12 h-12 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Gmail Disconnected</h2>
            <p className="text-xs text-slate-500 mt-1">Connect your Gmail via Corsair to sync your emails and threads.</p>
          </div>
          <button
            onClick={onConnectGmail}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-blue-500/30"
          >
            Connect Gmail
          </button>
        </div>
      ) : error ?? (data?.pages?.[0] as { _error?: string } | undefined)?._error ? (
        <div className="p-8 text-center text-forest-500">
          <p className="text-red-400 font-medium mb-3">Failed to load threads</p>
          <p className="text-xs">{(data?.pages?.[0] as { _error?: string } | undefined)?._error ?? error?.message}</p>
        </div>
      ) : threads.length === 0 ? (
        <div className="p-8 text-center text-forest-500">
          <p className="font-medium text-xs">Your inbox is clean</p>
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {filteredThreads.map((thread, index) => {
            const threadInsight = insights?.find((i) => i.threadId === thread.id);
            return (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                index={index}
                isSelected={index === selectedIndex}
                isActive={thread.id === activeThread?.id}
                isStarred={isThreadStarred(thread)}
                threadInsight={threadInsight}
                isReadLaterFolder={activeFolder === "readLater"}
                onSelect={onSelectThread}
                onToggleReadLater={onToggleReadLater}
              />
            );
          })}
          {isFetchingNextPage && (
            <div className="p-4 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
              <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
