"use client";

import { memo } from "react";
import type { Thread } from "../_utils/email";

interface ThreadInsight {
  threadId: string;
  priority?: string;
  category?: string;
}

interface ThreadListItemProps {
  thread: Thread;
  index: number;
  isSelected: boolean;
  isActive: boolean;
  isStarred: boolean;
  threadInsight?: ThreadInsight;
  /** True when this view is the "read later" folder (affects toggle direction). */
  isReadLaterFolder: boolean;
  onSelect: (thread: Thread, index: number) => void;
  onToggleReadLater: (threadId: string, isReadLater: boolean) => void;
}

function ThreadListItemInner({
  thread,
  index,
  isSelected,
  isActive,
  isStarred,
  threadInsight,
  isReadLaterFolder,
  onSelect,
  onToggleReadLater,
}: ThreadListItemProps) {
  const priority = threadInsight?.priority;
  const category = threadInsight?.category;

  return (
    <div
      id={`thread-${thread.id}`}
      onClick={() => onSelect(thread, index)}
      className={`group p-3.5 rounded-xl cursor-pointer transition-all border ${
        isActive
          ? "bg-slate-800 text-white shadow-md border-transparent rounded-xl"
          : isSelected
          ? "bg-slate-100 border-transparent shadow-sm"
          : "bg-transparent border-transparent hover:bg-slate-50"
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
            isSelected
              ? "bg-gradient-to-tr from-blue-500 to-indigo-600"
              : "bg-gradient-to-tr from-sky-400 to-blue-500"
          }`}
        >
          {String.fromCharCode(65 + (parseInt(thread.id.substring(0, 8), 16) % 26))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex justify-between items-start mb-1">
            <span className={`font-bold text-xs truncate pr-2 ${isActive ? "text-white" : "text-slate-900"}`}>
              {thread.snippet ? thread.snippet.substring(0, 30) + "..." : "Thread " + thread.id.substring(0, 6)}
            </span>
            <div className="flex space-x-1 items-center flex-shrink-0">
              {priority === "urgent" && (
                <span
                  className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                    isActive
                      ? "bg-rose-500 border-rose-400 text-white"
                      : "bg-rose-100 border-rose-200 text-rose-600"
                  }`}
                >
                  Urgent
                </span>
              )}
              {priority === "high" && (
                <span
                  className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                    isActive
                      ? "bg-amber-400 border-amber-300 text-amber-900"
                      : "bg-amber-100 border-amber-200 text-amber-600"
                  }`}
                >
                  High
                </span>
              )}
              {priority === "normal" && (
                <span
                  className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                    isActive
                      ? "bg-slate-500 border-slate-400 text-white"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}
                >
                  Normal
                </span>
              )}
              {priority === "low" && (
                <span
                  className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${
                    isActive
                      ? "bg-forest-600 border-forest-500 text-white"
                      : "bg-forest-50 border-forest-200 text-forest-500"
                  }`}
                >
                  Low
                </span>
              )}
              {isStarred && (
                <svg
                  className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-md"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
          </div>

          {/* Snippet */}
          <p className={`text-xs line-clamp-2 leading-relaxed ${isActive ? "text-slate-200" : "text-slate-500"}`}>
            {thread.snippet || "(No content)"}
          </p>

          {/* Footer row */}
          <div className="mt-1.5 flex justify-between items-end min-h-[20px]">
            <div className="flex flex-col items-start">
              {/* Category chip */}
              {category && (
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                    category === "work" || category === "meeting" || category === "needs_reply"
                      ? isActive
                        ? "bg-purple-500/30 text-purple-200"
                        : "bg-purple-50 text-purple-600 border border-purple-100"
                      : category === "newsletter" || category === "social"
                      ? isActive
                        ? "bg-blue-500/30 text-blue-200"
                        : "bg-blue-50 text-blue-600 border border-blue-100"
                      : category === "personal" || category === "receipt"
                      ? isActive
                        ? "bg-amber-500/30 text-amber-200"
                        : "bg-amber-50 text-amber-600 border border-amber-100"
                      : isActive
                      ? "bg-slate-500/30 text-slate-200"
                      : "bg-slate-50 text-slate-500 border border-slate-100"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      category === "work" || category === "meeting" || category === "needs_reply"
                        ? "bg-purple-500"
                        : category === "newsletter" || category === "social"
                        ? "bg-blue-500"
                        : category === "personal" || category === "receipt"
                        ? "bg-amber-500"
                        : "bg-slate-400"
                    }`}
                  />
                  {category.replace("_", " ")}
                </span>
              )}
            </div>

            {/* Read Later toggle */}
            <button
              title="Toggle Read Later"
              onClick={(e) => {
                e.stopPropagation();
                onToggleReadLater(thread.id, !isReadLaterFolder);
              }}
              className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${
                isActive
                  ? "text-slate-300 hover:text-white hover:bg-slate-700"
                  : "text-slate-400 hover:text-forest-600 hover:bg-forest-50 border border-transparent hover:border-forest-200 shadow-sm"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Memoised thread card — prevents re-render of every item in the list
 * when unrelated state (toast, modals, scroll position) changes in the parent.
 */
export const ThreadListItem = memo(ThreadListItemInner);
