/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { authClient } from "@/server/better-auth/client";
import { SignOutButton } from "@/app/_components/auth-buttons";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useKeyboard } from "@/hooks/useKeyboard";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// ── Component ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  // Connection Status Check
  const { data: status } = api.email.getConnectionStatus.useQuery();

  const [calendarView, setCalendarView] = useState<"day" | "week">("week");

  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, +1 = next week, etc.

  // Date range: current week/day offset by weekOffset
  const currentDays = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);

    if (calendarView === "day") {
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      return [today];
    }

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      return d;
    });
  }, [calendarView, weekOffset]);

  const timeMin = currentDays[0]?.toISOString();
  const timeMax = (() => {
    const lastDay = new Date(currentDays[currentDays.length - 1]!);
    lastDay.setDate(lastDay.getDate() + 1);
    return lastDay.toISOString();
  })();

  // ── Fetch events ────────────────────────────────────────────────────────

  const { data: eventsData, isLoading, error, refetch } = api.email.calendarEvents.useQuery(
    { timeMin, timeMax },
    {
      refetchOnWindowFocus: false,
      enabled: !!status?.googlecalendar?.connected,
    }
  );




  // ── Event delete ────────────────────────────────────────────────────────

  const [eventToDelete, setEventToDelete] = useState<any | null>(null);

  const deleteEventMutation = api.email.deleteEvent.useMutation({
    onSuccess: () => {
      showToast("Event deleted — attendees notified", "success");
      setEventToDelete(null);
      void refetch();
    },
    onError: (err) => {
      showToast(`Delete failed: ${err.message}`, "error");
      setEventToDelete(null);
    },
  });

  // ── Event creation ──────────────────────────────────────────────────────

  const createEventMutation = api.email.createEvent.useMutation({
    onSuccess: () => {
      showToast("Calendar event created successfully!", "success");
      setIsInviteOpen(false);
      setNewSummary("");
      setNewDescription("");
      setNewLocation("");
      setNewAttendees("");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to create event: ${err.message}`, "error");
    },
  });

  // ── Modal & form states ─────────────────────────────────────────────────

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newSummary, setNewSummary] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newAttendees, setNewAttendees] = useState("");

  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useKeyboard({
    gi: () => router.push("/inbox"),
    gc: () => {
      void refetch();
      showToast("Calendar refreshed", "success");
    },
    "?": () => setShowCheatsheet(true),
  });

  // Hour labels: 8 AM to 8 PM
  const workHours = Array.from({ length: 13 }).map((_, idx) => idx + 8);

  // Connect Google Calendar Redirect
  const handleConnectCalendar = () => {
    window.location.href = "/api/connect?plugin=googlecalendar";
  };

  // ── Create event handler ────────────────────────────────────────────────

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAttendees = newAttendees
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    createEventMutation.mutate({
      summary: newSummary,
      description: newDescription,
      location: newLocation,
      start: new Date(newStart).toISOString(),
      end: new Date(newEnd).toISOString(),
      attendees: parsedAttendees,
    });
  };

  // ── Group events by day ─────────────────────────────────────────────────

  const groupedEvents = useMemo(() => {
    const groups: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    if (!eventsData?.items) return groups;

    eventsData.items.forEach((event: any) => {
      const startStr = event.start?.dateTime || event.start?.date;
      if (!startStr) return;
      const date = new Date(startStr);
      const dayIdx = date.getDay();
      if (groups[dayIdx]) {
        groups[dayIdx].push(event);
      }
    });

    return groups;
  }, [eventsData]);

  // Upcoming meetings list (for sidebar)
  const upcomingMeetings = useMemo(() => {
    if (!eventsData?.items) return [];
    const now = new Date();
    return [...eventsData.items]
      .filter((e: any) => {
        const start = new Date(e.start?.dateTime || e.start?.date || 0);
        return start >= now;
      })
      .sort((a: any, b: any) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return aStart - bStart;
      })
      .slice(0, 5);
  }, [eventsData]);

  // ── Event positioning (8 AM – 8 PM = 12 hour viewport) ────────────────

  const getEventStyle = (event: any) => {
    const startStr = event.start?.dateTime || event.start?.date;
    const endStr = event.end?.dateTime || event.end?.date;
    if (!startStr || !endStr) return { display: "none" as const };

    const start = new Date(startStr);
    const end = new Date(endStr);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    const viewStart = Math.max(8, Math.min(20, startHour));
    const viewEnd = Math.max(8, Math.min(20, endHour));

    if (viewEnd <= viewStart) {
      return { display: "none" as const };
    }

    const topPercent = ((viewStart - 8) / 12) * 100;
    const heightPercent = ((viewEnd - viewStart) / 12) * 100;

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  // ── Availability block positioning ──────────────────────────────────────



  // ── Slot click: mode-aware ──────────────────────────────────────────────

  const handleSlotClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + 1, 0, 0, 0);

    const pad = (num: number) => String(num).padStart(2, "0");
    const formatLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setNewStart(formatLocal(start));
    setNewEnd(formatLocal(end));
    setIsInviteOpen(true);
  };



  // ── Status badge for negotiations ───────────────────────────────────────

  const statusBadge = (s: string) => {
    switch (s) {
      case "sent":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-wheat-200 text-wheat-500">Sent</span>;
      case "replied":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-avail-light text-avail">Replied</span>;
      case "unclear":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-wheat-100 text-wheat-500">Needs review</span>;
      case "pending":
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-wheat-100 text-slate-600 font-medium">Pending</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-forest-700 text-cream-300">{s}</span>;
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-screen overflow-hidden bg-[#F5F6F8] text-slate-800 flex font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${toast.type === "success"
            ? "bg-white/90 border-emerald-500/20 text-emerald-600 backdrop-blur-md"
            : toast.type === "error"
              ? "bg-white/90 border-rose-500/20 text-rose-600 backdrop-blur-md"
              : "bg-white/80 border-slate-200 text-slate-800 backdrop-blur-md"
          }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Left Sidebar (Light Mode) */}
      <div className="w-[280px] flex-shrink-0 border-r border-slate-200/60 bg-white flex flex-col h-full z-20">
        {/* Profile */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 uppercase">
            {session?.user?.name?.charAt(0) || "M"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-800 truncate">{session?.user?.name || "MailMind User"}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">MailMind Pro</div>
          </div>
          <button 
            onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })}
            className="ml-auto w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 hover:text-rose-600 transition-colors cursor-pointer border border-rose-100"
            title="Sign Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>



                {/* Mini Calendar (Static mock) */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[13px] text-slate-800">June 2026</h3>
            <div className="flex gap-2">
              <svg className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              <svg className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
            <div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-700">
            {/* Week 1 */}
            <div className="text-slate-300">25</div><div className="text-slate-300">26</div><div className="text-slate-300">27</div><div className="text-slate-300">28</div><div className="text-slate-300">29</div><div className="text-slate-300">30</div><div className="text-slate-300">31</div>
            {/* Week 2 */}
            <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div><div>7</div>
            {/* Week 3 */}
            <div>8</div><div>9</div><div>10</div><div>11</div><div className="bg-blue-500 text-white rounded-full w-5 h-5 mx-auto flex items-center justify-center shadow-md">12</div><div>13</div><div>14</div>
            {/* Week 4 */}
            <div>15</div><div>16</div><div>17</div><div>18</div><div>19</div><div>20</div><div>21</div>
          </div>
        </div>

        {/* Upcoming Events Section (Dynamic) */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="font-bold text-[13px] text-slate-800 mb-4">Upcoming Events</h3>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-xs text-slate-500">Loading events...</div>
            ) : (!eventsData?.items || eventsData.items.length === 0) ? (
              <div className="text-xs text-slate-500">No upcoming events found.</div>
            ) : (
              eventsData.items.slice(0, 5).map((event: any, i: number) => {
                const startTime = event.start?.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All day";
                const endTime = event.end?.dateTime ? new Date(event.end.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                return (
                  <div key={event.id || i} className="flex flex-col gap-1 border-l-2 border-blue-400 pl-3">
                    <span className="text-[10px] font-semibold text-slate-500 tracking-wider">
                      {startTime}{endTime ? ` - ${endTime}` : ""}
                    </span>
                    <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-2">
                      {event.summary || "Untitled Event"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
</div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F5F6F8]">
        {/* Top Navbar */}
        <header className="bg-white px-8 py-6 flex justify-between items-center z-10 shrink-0 border-b border-slate-100 shadow-sm shadow-slate-100">
          <h1 className="text-2xl font-medium text-slate-800 tracking-tight">
            {currentDays[0] && currentDays[0].toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h1>

          <div className="flex items-center gap-6">
            {/* View Toggle */}
            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button onClick={() => setCalendarView("week")} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${calendarView === "week" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>Week</button>
              <button onClick={() => setCalendarView("day")} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${calendarView === "day" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-700"}`}>Day</button>
            </div>

            {/* Navigation Arrows & Today */}
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                <button onClick={() => setWeekOffset(o => o - 1)} className="w-10 h-8 rounded-xl bg-transparent flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <button onClick={() => setWeekOffset(o => o + 1)} className="w-10 h-8 rounded-xl bg-transparent flex items-center justify-center text-slate-500 hover:bg-white hover:shadow-sm hover:text-slate-800 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
              <button onClick={() => setWeekOffset(0)} className="px-6 py-2.5 rounded-2xl bg-slate-50 border border-slate-100 text-[13px] font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all">
                Today
              </button>
            </div>

            {/* App Nav Buttons */}
            <div className="flex items-center gap-2 ml-2 pl-6 border-l border-slate-200">
              <Link href="/inbox" className="px-5 py-2.5 text-[13px] font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl transition-all text-slate-700 shadow-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                Inbox
              </Link>
              <Link href="/agent" className="px-5 py-2.5 text-[13px] font-bold bg-slate-900 hover:bg-slate-800 border border-transparent rounded-2xl transition-all text-white shadow-md shadow-slate-900/20 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                Agent
              </Link>
            </div>
          </div>
        </header>

        {/* Days Header */}
        <div className="px-8 pt-6 pb-2 z-10 shrink-0 bg-white border-b border-slate-100">
          <div className="flex">
            <div className="w-20 shrink-0 flex items-center justify-center border-r border-slate-100/50">
              <button onClick={() => setIsInviteOpen(true)} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 flex items-center justify-center transition-colors shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </button>
            </div>
            {currentDays.map((day, idx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div key={idx} className="flex-1 flex flex-col items-center justify-center py-2 relative">
                  {isToday && <div className="absolute inset-0 bg-slate-800 rounded-2xl shadow-lg -top-2 -bottom-2 z-0 transform scale-[1.05]" />}
                  <div className="relative z-10 flex flex-col items-center">
                    <span className={`text-[12px] font-bold tracking-wide mb-1 ${isToday ? 'text-slate-300' : 'text-slate-500'}`}>
                      {day.toLocaleDateString(undefined, { weekday: "long" })}
                    </span>
                    <span className={`text-2xl font-bold tracking-tight ${isToday ? 'text-white' : 'text-slate-800'}`}>
                      {day.getDate()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto relative custom-scrollbar bg-white">
          {!status?.googlecalendar?.connected ? (
            /* ── Not connected state ─────────────────────────────────────── */
            <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 max-w-md mx-auto text-center bg-slate-50/50 rounded-3xl m-8 border border-slate-100">
              <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50">
                <svg className="w-12 h-12 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">No Calendar Connected</h2>
                <p className="text-sm text-slate-500 mt-1 px-4">Connect your Google Calendar via Corsair to sync your events and schedule meetings.</p>
              </div>
              <button
                onClick={handleConnectCalendar}
                className="px-8 py-3.5 mt-2 bg-slate-900 hover:bg-slate-800 text-sm font-bold rounded-2xl text-white shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5"
              >
                Connect Calendar
              </button>
            </div>
          ) : (
            <div className={`w-full grid ${calendarView === "week" ? "grid-cols-8" : "grid-cols-2"} relative min-h-[1200px]`}>
              {/* Time Slot labels column */}
              <div className="text-slate-400 bg-white">
                {workHours.map((hour) => (
                  <div key={hour} className="h-28 border-b border-slate-100/60 flex items-start justify-end pr-5 pt-3 text-[12px] font-bold text-slate-400">
                    {hour === 12 ? "12 pm" : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                  </div>
                ))}
              </div>

              {/* Columns for Days */}
              {currentDays.map((day, dayIdx) => (
                <div key={dayIdx} className="relative border-l border-slate-100/60 bg-white">
                  {workHours.map((hour) => (
                    <div
                      key={hour}
                      onClick={() => handleSlotClick(day, hour)}
                      className="h-28 border-b border-slate-100/60 hover:bg-slate-50/50 cursor-pointer transition-colors relative group"
                    >
                      <div className="absolute inset-2 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      </div>
                    </div>
                  ))}

                  {/* Render events for this day */}
                  {groupedEvents[day.getDay()]?.map((event: any, i: number) => {
                    const style = getEventStyle(event);
                    if (style.display === "none") return null;
                    
                    const pastelColors = [
                      "bg-[#bde8fb] text-[#1c6499]", // light blue
                      "bg-[#b5f4c4] text-[#1e7a36]", // light green
                      "bg-[#d0c6ff] text-[#48339f]", // light purple
                      "bg-[#ffe599] text-[#93660a]", // light yellow
                      "bg-[#ffb3d9] text-[#9c185e]"  // light pink
                    ];
                    const colorClass = pastelColors[i % pastelColors.length];

                    return (
                      <div
                        key={event.id}
                        className={`absolute left-2 right-2 rounded-[20px] p-4 shadow-sm overflow-hidden flex flex-col ${colorClass} transition-transform hover:scale-[1.02] cursor-pointer`}
                        style={{ top: style.top, height: style.height }}
                        title={event.summary}
                      >
                        <h4 className="font-bold text-[13px] leading-tight mb-1">{event.summary || "(No Title)"}</h4>
                        <div className="text-[11px] opacity-70 font-semibold mb-2">
                          {new Date(event.start.dateTime || event.start.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(event.end.dateTime || event.end.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {/* Fake avatars for flavor */}
                        <div className="mt-auto flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-black/10 border-2 border-white/40 flex items-center justify-center text-[9px] font-black uppercase shadow-sm">JD</div>
                          <div className="w-6 h-6 rounded-full bg-black/10 border-2 border-white/40 flex items-center justify-center text-[9px] font-black uppercase shadow-sm">AL</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Create Event
          ═══════════════════════════════════════════════════════════════════ */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-sm p-8 shadow-2xl animate-scale-up border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                value={newSummary}
                onChange={(e) => setNewSummary(e.target.value)}
                placeholder="Meet with Jonson Rider |"
                required
                className="w-full bg-transparent text-xl font-bold text-slate-800 focus:outline-none placeholder:text-slate-300"
              />
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100/50">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <input
                  type="datetime-local"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  required
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-4 border border-slate-100/50">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="time"
                    value={newStart.slice(11, 16)}
                    disabled
                    className="w-20 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                  <span className="text-slate-400 font-bold">~</span>
                  <input
                    type="time"
                    value={newEnd.slice(11, 16)}
                    onChange={(e) => {
                      const datePart = newEnd.slice(0, 11);
                      setNewEnd(`${datePart}${e.target.value}`);
                    }}
                    required
                    className="w-20 bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4 border border-slate-100/50">
                <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Park Lane Office"
                  className="w-full bg-transparent text-sm font-semibold text-slate-700 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Tags (static mock like the image) */}
              <div className="flex gap-2 pt-2 pb-4">
                <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-xl text-xs font-bold">Design</span>
                <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold">Personal project</span>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold">JS</div>
                  <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold">AL</div>
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-600 cursor-pointer transition-colors">+</div>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="flex-1 py-4 bg-[#1c1c1e] hover:bg-black text-sm font-bold rounded-2xl text-white shadow-xl shadow-slate-900/20 transition-all flex items-center justify-center"
                >
                  {createEventMutation.isPending ? "Creating..." : "Add Event"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="w-14 shrink-0 bg-[#1c1c1e] hover:bg-black text-white rounded-2xl flex items-center justify-center transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Event */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-scale-up">
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Cancel Meeting?</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Cancel meeting <span className="font-bold text-slate-800">&lsquo;{eventToDelete.summary || "(No Title)"}&rsquo;</span>? All attendees will be notified.
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setEventToDelete(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-sm font-bold rounded-xl text-slate-600 transition-colors">Keep</button>
              <button onClick={() => deleteEventMutation.mutate({ eventId: eventToDelete.id })} disabled={deleteEventMutation.isPending} className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl text-white shadow-md shadow-rose-600/20 transition-all">Cancel It</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cheatsheet */}
      {showCheatsheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-7 shadow-2xl space-y-5 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-slate-800">
                {"⌨️"} Shortcuts
              </h3>
              <button onClick={() => setShowCheatsheet(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xs">Close</button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600 font-medium">Go to Inbox Page</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-mono font-bold shadow-sm">gi</kbd>
              </div>
              <div className="flex justify-between items-center py-1 text-sm">
                <span className="text-slate-600 font-medium">Refresh Calendar</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-mono font-bold shadow-sm">gc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
