/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-wheat-100 text-olive-400">Pending</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-forest-700 text-cream-300">{s}</span>;
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-forest-950 text-cream-100 flex flex-col font-sans relative">
      {/* ── Toast Notification ─────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${
            toast.type === "success"
              ? "bg-success-light border-avail/30 text-avail"
              : "bg-danger-light border-danger/30 text-danger"
          }`}
        >
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="border-b border-forest-700 bg-forest-900/60 backdrop-blur-md sticky top-0 z-40 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-wheat-500 to-amber-500 rounded-xl flex items-center justify-center font-bold text-forest-950 shadow-lg shadow-wheat-500/20">
            M
          </div>
          <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-cream-100 to-cream-300 bg-clip-text text-transparent">
            MailMind Calendar
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Day / Week toggle */}
          <div className="flex items-center bg-forest-900 border border-forest-700 rounded-xl p-1">
            <button
              onClick={() => setCalendarView("day")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                calendarView === "day"
                  ? "bg-gradient-to-r from-wheat-500 to-amber-500 text-forest-950"
                  : "text-olive-400 hover:text-cream-200"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarView("week")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                calendarView === "week"
                  ? "bg-gradient-to-r from-wheat-500 to-amber-500 text-forest-950"
                  : "text-olive-400 hover:text-cream-200"
              }`}
            >
              Week
            </button>
          </div>

          {/* ← Week navigation → */}
          <div className="flex items-center gap-1 bg-forest-900 border border-forest-700 rounded-xl p-1">
            <button
              onClick={() => setWeekOffset(o => o - 1)}
              className="px-2.5 py-1 text-xs font-bold text-olive-400 hover:text-cream-100 hover:bg-forest-700 rounded-lg transition-all"
              title="Previous week"
            >
              ←
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                weekOffset === 0
                  ? "bg-gradient-to-r from-wheat-500 to-amber-500 text-forest-950"
                  : "text-olive-400 hover:text-cream-100 hover:bg-forest-700"
              }`}
              title="Go to today"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(o => o + 1)}
              className="px-2.5 py-1 text-xs font-bold text-olive-400 hover:text-cream-100 hover:bg-forest-700 rounded-lg transition-all"
              title="Next week"
            >
              →
            </button>
          </div>

          {/* Legend */}
          <div className="hidden md:flex items-center space-x-3 text-[10px] text-olive-500 border-l border-forest-700 pl-3">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-wheat-500 to-amber-500" />
              <span>Events</span>
            </span>
          </div>

          {/* Create invite */}
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-wheat-500 to-amber-500 hover:from-wheat-400 hover:to-amber-400 border border-wheat-500/30 rounded-xl transition-all shadow-md shadow-wheat-500/10 text-forest-950 flex items-center space-x-1"
          >
            <span>+ Create Invite</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => void refetch()}
            className="px-4 py-2 text-xs font-semibold bg-forest-800 hover:bg-forest-700 border border-forest-600 rounded-xl transition-all text-cream-300"
          >
            Refresh
          </button>

          {/* Back to Inbox */}
          <Link
            href="/inbox"
            className="px-4 py-2 text-xs font-semibold bg-forest-800 hover:bg-forest-700 border border-forest-600 rounded-xl transition-all text-cream-300"
          >
            Back to Inbox (GI)
          </Link>
        </div>
      </header>

      {/* ── Calendar View Layout ───────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden p-6 gap-6">
        {!status?.googlecalendar?.connected ? (
          /* ── Not connected state ─────────────────────────────────────── */
          <div className="col-span-12 flex-1 flex flex-col items-center justify-center text-olive-500 space-y-4 max-w-md mx-auto text-center">
            <div className="p-4 bg-wheat-100 border border-wheat-500/20 rounded-2xl">
              <svg className="w-12 h-12 text-wheat-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-cream-200">Google Calendar Disconnected</h2>
              <p className="text-xs text-olive-500 mt-1">Connect your Google Calendar via Corsair to sync your events and schedule meetings.</p>
            </div>
            <button
              onClick={handleConnectCalendar}
              className="px-5 py-2.5 bg-gradient-to-r from-wheat-500 to-amber-500 hover:from-wheat-400 hover:to-amber-400 text-xs font-semibold rounded-xl text-forest-950 shadow-lg shadow-wheat-500/20"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : (
          /* ── Calendar grid ───────────────────────────────────────────── */
          <div className="col-span-9 flex flex-col bg-forest-900/40 border border-forest-700 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
            {/* Header: Days of the week */}
            <div className="grid grid-cols-8 border-b border-forest-700 bg-forest-900/60 py-3 text-center">
              {/* Time Column Header */}
              <div className="text-[10px] uppercase font-bold text-olive-500 flex items-center justify-center border-r border-forest-700/40">
                Time (IST)
              </div>

              {currentDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className="flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold text-olive-500">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span
                      className={`text-md font-extrabold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday
                          ? "bg-gradient-to-r from-wheat-500 to-amber-500 text-forest-950 shadow-md shadow-wheat-500/20"
                          : "text-cream-300"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto min-h-0 flex relative">
              <div className={`w-full grid ${calendarView === "week" ? "grid-cols-8" : "grid-cols-2"} relative select-none`}>
                {/* Time Slot labels column */}
                <div className="border-r border-forest-700/60 bg-forest-950/20 text-olive-500">
                  {workHours.map((hour) => (
                    <div key={hour} className="h-20 border-b border-forest-700/30 flex items-start justify-end pr-3 pt-1 text-[10px] font-mono">
                      {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                  ))}
                </div>

                {/* Columns for Days */}
                {currentDays.map((day, dayIdx) => (
                  <div key={dayIdx} className="relative border-r border-forest-700/40 min-h-[1040px]">
                    {/* Hour slots interactive click area */}
                    {workHours.slice(0, -1).map((hour) => {
                      // Simplified cell block
                      return (
                        <div
                          key={hour}
                          onClick={() => handleSlotClick(day, hour)}
                          className="h-20 border-b border-forest-700/25 transition-all cursor-pointer relative group hover:bg-wheat-50"
                          title="Click to schedule invite"
                        >
                          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-bold pointer-events-none text-wheat-500">
                            + Book Slot
                          </span>
                        </div>
                      );
                    })}

                    {/* ── Calendar events (z-10) ───────────────────────── */}
                    {groupedEvents[day.getDay()]?.map((event: any) => {
                      const startStr = event.start?.dateTime || event.start?.date;
                      const endStr = event.end?.dateTime || event.end?.date;
                      const start = new Date(startStr);
                      const end = new Date(endStr);
                      const timeString = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

                      return (
                        <div
                          key={event.id}
                          style={getEventStyle(event)}
                          className="absolute left-1 right-1 p-2 bg-gradient-to-tr from-wheat-500/80 to-amber-500/80 hover:from-wheat-400 hover:to-amber-400 border border-wheat-500/30 rounded-lg shadow-lg overflow-hidden flex flex-col justify-between transition-all cursor-pointer z-10 text-left group"
                          title={`${event.summary || "(No Title)"}\n${timeString}\n${event.description || ""}`}
                        >
                          {/* Delete button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEventToDelete(event);
                            }}
                            className="absolute top-1 right-1 w-4 h-4 rounded-full bg-forest-950/60 hover:bg-danger text-cream-100 text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                            title="Delete event"
                          >
                            ×
                          </button>
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-[10px] text-forest-950 leading-tight truncate">
                              {event.summary || "(No Title)"}
                            </h4>
                            {event.location && (
                              <p className="text-[8px] text-forest-800 font-medium truncate mt-0.5">
                                📍 {event.location}
                              </p>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-forest-900 mt-1 select-none">
                            {timeString}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        {status?.googlecalendar?.connected && (
          <div className="col-span-3 flex flex-col bg-forest-900/40 border border-forest-700 rounded-2xl overflow-y-auto backdrop-blur-md shadow-2xl p-4 space-y-4">
            {/* Upcoming Meetings */}
            <h3 className="font-extrabold text-xs tracking-wider uppercase text-olive-400 flex items-center space-x-1 pb-2 border-b border-forest-700">
              <svg className="w-4 h-4 text-wheat-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Upcoming Meetings</span>
            </h3>

            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-6 text-olive-500 text-xs">No upcoming meetings.</div>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((event: any) => {
                  const startStr = event.start?.dateTime || event.start?.date;
                  const start = new Date(startStr);
                  return (
                    <div key={event.id} className="p-3 bg-forest-950 border border-forest-700/60 rounded-xl space-y-1 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-wheat-500" />
                      <h4 className="font-bold text-xs text-cream-200 line-clamp-1 ml-1">{event.summary || "(No Title)"}</h4>
                      <p className="text-[10px] text-wheat-400 font-mono ml-1">
                        {start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} •{" "}
                        {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {event.location && (
                        <p className="text-[9px] text-olive-500 truncate ml-1 pt-1 flex items-center">
                          <span className="mr-1">📍</span> {event.location}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}


          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Invite Creator
          ═══════════════════════════════════════════════════════════════════ */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-forest-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-forest-900 border border-forest-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-forest-700 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-cream-200">
                Create New Calendar Invite
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-olive-400 hover:text-cream-200 transition-all text-xs"
              >
                × Close
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  required
                  placeholder="Meeting / Slot Sync"
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500 placeholder:text-olive-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    required
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    required
                    className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Google Meet / Meeting Room / Remote"
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500 placeholder:text-olive-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">Attendees (Comma Separated)</label>
                <input
                  type="text"
                  value={newAttendees}
                  onChange={(e) => setNewAttendees(e.target.value)}
                  placeholder="guest1@example.com, guest2@example.com"
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500 placeholder:text-olive-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-olive-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Invite description..."
                  className="w-full bg-forest-950 border border-forest-700 rounded-xl px-3 py-2 text-xs text-cream-200 focus:outline-none focus:border-wheat-500 resize-none placeholder:text-olive-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-xs font-semibold rounded-xl text-cream-300 border border-forest-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 bg-gradient-to-r from-wheat-500 to-amber-500 hover:from-wheat-400 hover:to-amber-400 text-xs font-semibold rounded-xl text-forest-950 shadow-md shadow-wheat-500/10"
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Delete Event Confirmation
          ═══════════════════════════════════════════════════════════════════ */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 bg-forest-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-forest-900 border border-forest-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-forest-700 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-danger">
                Cancel Meeting
              </h3>
              <button
                onClick={() => setEventToDelete(null)}
                className="text-olive-400 hover:text-cream-200 transition-all text-xs"
              >
                × Close
              </button>
            </div>

            <p className="text-xs text-cream-300 leading-relaxed">
              Cancel meeting <span className="font-bold text-cream-100">&lsquo;{eventToDelete.summary || "(No Title)"}&rsquo;</span>?
              All attendees will be notified automatically.
            </p>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-700 text-xs font-semibold rounded-xl text-cream-300 border border-forest-600"
              >
                Keep Event
              </button>
              <button
                onClick={() => deleteEventMutation.mutate({ eventId: eventToDelete.id })}
                disabled={deleteEventMutation.isPending}
                className="px-4 py-2 bg-danger hover:bg-danger/80 text-xs font-semibold rounded-xl text-cream-100 shadow-md"
              >
                {deleteEventMutation.isPending ? "Deleting..." : "Yes, Cancel Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: Cheatsheet
          ═══════════════════════════════════════════════════════════════════ */}
      {showCheatsheet && (
        <div className="fixed inset-0 z-50 bg-forest-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-forest-900 border border-forest-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-forest-700 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-cream-200">
                {"\u2328\uFE0F"} Calendar Shortcuts
              </h3>
              <button
                onClick={() => setShowCheatsheet(false)}
                className="text-olive-400 hover:text-cream-200 transition-all text-xs"
              >
                × Close
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-forest-700/40 text-xs">
                <span className="text-olive-400">Go to Inbox Page</span>
                <kbd className="bg-forest-950 border border-forest-700 px-2 py-0.5 rounded text-wheat-500 font-mono font-bold">gi</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-forest-700/40 text-xs">
                <span className="text-olive-400">Refresh Calendar Events</span>
                <kbd className="bg-forest-950 border border-forest-700 px-2 py-0.5 rounded text-wheat-500 font-mono font-bold">gc</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-forest-700/40 text-xs">
                <span className="text-olive-400">Open Keyboard Help</span>
                <kbd className="bg-forest-950 border border-forest-700 px-2 py-0.5 rounded text-wheat-500 font-mono font-bold">?</kbd>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCheatsheet(false)}
                className="w-full py-2 bg-gradient-to-r from-wheat-500 to-amber-500 hover:from-wheat-400 hover:to-amber-400 text-xs font-semibold rounded-xl text-forest-950"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
