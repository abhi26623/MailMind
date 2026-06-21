"use client";

import Link from "next/link";

interface CalendarEvent {
  id: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
}

interface Insight {
  threadId: string;
  summary?: string;
  reason?: string;
  priority?: string;
  category?: string;
  suggestedAction?: string;
}

interface DigestMutation {
  isPending: boolean;
  mutate: () => void;
}

interface ScheduleMutation {
  isPending: boolean;
}

interface InboxSidebarProps {
  activeFolder: string;
  weeklyDigest: string | null;
  activeInsight: Insight | undefined;
  digestMutation: DigestMutation;
  scheduleMutation: ScheduleMutation;
  calendarConnected: boolean;
  upcomingEvents: CalendarEvent[];
  onOpenPeekModal: () => void;
  onConnectCalendar: () => void;
}

export function InboxSidebar({
  activeFolder,
  weeklyDigest,
  activeInsight,
  digestMutation,
  scheduleMutation,
  calendarConnected,
  upcomingEvents,
  onOpenPeekModal,
  onConnectCalendar,
}: InboxSidebarProps) {
  return (
    <div className="hidden xl:flex w-[260px] 2xl:w-[300px] h-full flex-col flex-shrink-0 border-l border-forest-900/10 bg-slate-50 p-6 overflow-y-auto space-y-6 z-10">
      {/* Read Later Weekly Digest */}
      {activeFolder === "readLater" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-forest-700/80">
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-forest-600 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              <span>Weekly Digest</span>
            </h3>
            <button
              onClick={digestMutation.mutate}
              disabled={digestMutation.isPending}
              className="text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              {digestMutation.isPending ? "Generating..." : "Generate"}
            </button>
          </div>
          <div className="p-4 bg-white/80 border border-indigo-100 rounded-xl space-y-3 shadow-sm">
            <div className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
              {weeklyDigest ?? "Click Generate to create a summary of your Read Later queue."}
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Panel */}
      {activeInsight && (
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-forest-700/80">
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-forest-600 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Insight</span>
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                activeInsight.priority === "urgent"
                  ? "bg-danger-light text-danger border-rose-500/30"
                  : activeInsight.priority === "high"
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "bg-forest-700 text-cream-200 border-forest-600"
              }`}
            >
              {activeInsight.priority}
            </span>
          </div>

          <div className="p-4 bg-white/80 border border-forest-900/10 rounded-xl space-y-3 shadow-sm">
            <p className="text-sm font-semibold text-forest-900 leading-snug">{activeInsight.summary}</p>
            <div className="bg-forest-50 py-3 rounded-lg border border-forest-900/10">
              <p className="text-xs text-forest-600 italic">&quot;{activeInsight.reason}&quot;</p>
            </div>

            {activeInsight.suggestedAction === "schedule" && (
              <button
                onClick={onOpenPeekModal}
                disabled={scheduleMutation.isPending}
                className="w-full mt-2 py-2 bg-wheat-500 hover:bg-wheat-400 text-xs font-bold text-cream-100 rounded-lg transition-all shadow-lg shadow-wheat-500/20 flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{scheduleMutation.isPending ? "Scheduling..." : "Schedule + Reply"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Up Next Calendar */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-forest-700/80">
          <h3 className="font-extrabold text-xs tracking-wider uppercase text-forest-600 flex items-center space-x-1">
            <svg className="w-3.5 h-3.5 text-forest-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Up Next</span>
          </h3>
          <Link
            href="/calendar"
            id="calendar-link"
            className="text-[10px] font-bold text-forest-500 hover:text-forest-700 uppercase tracking-widest flex items-center space-x-1"
          >
            <span>Full Calendar</span>
          </Link>
        </div>

        {!calendarConnected ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
            <p className="text-[11px] text-slate-500 font-medium">Calendar integration not connected</p>
            <button
              onClick={onConnectCalendar}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-[10px] font-bold rounded-lg text-white shadow-sm"
            >
              Connect Calendar
            </button>
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="p-6 bg-forest-900/20 border border-forest-700/60 rounded-xl text-center text-olive-500">
            <p className="text-[11px]">No upcoming events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 2).map((event) => {
              const startStr = event.start?.dateTime ?? event.start?.date;
              const endStr = event.end?.dateTime ?? event.end?.date;
              const start = new Date(startStr ?? 0);
              const isToday = start.toDateString() === new Date().toDateString();
              const dateLabel = isToday
                ? "Today"
                : start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              const startTime = startStr
                ? new Date(startStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "All Day";
              const endTime = endStr
                ? new Date(endStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "";

              return (
                <div
                  key={event.id}
                  className="py-3 bg-white border border-forest-900/10 rounded-xl hover:border-forest-900/20 shadow-sm transition-all space-y-1 relative overflow-hidden group hover:bg-white/60 cursor-pointer"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-forest-500 rounded-l-xl" />
                  <div className="flex justify-between items-start ml-1">
                    <h4 className="font-bold text-[11px] text-forest-900 line-clamp-1">{event.summary ?? "(No Title)"}</h4>
                  </div>
                  <p className="text-[10px] text-forest-500 font-mono ml-1 mt-0.5">
                    {dateLabel} • {startTime} {endTime ? `- ${endTime}` : ""}
                  </p>
                  {event.location && (
                    <div className="flex items-center space-x-1 text-[9px] text-olive-500 ml-1">
                      <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
