"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useKeyboard } from "@/hooks/useKeyboard";

export default function CalendarPage() {
  const router = useRouter();

  // Connection Status Check
  const { data: status } = api.email.getConnectionStatus.useQuery();

  // Date range: current week (Sunday to Saturday)
  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + idx);
      return d;
    });
  }, []);

  const timeMin = currentWeekDays[0]?.toISOString();
  const timeMax = (() => {
    const lastDay = new Date(currentWeekDays[6]!);
    lastDay.setDate(lastDay.getDate() + 1); // boundary is start of next day
    return lastDay.toISOString();
  })();

  // Fetch events
  const { data: eventsData, isLoading, error, refetch } = api.email.calendarEvents.useQuery(
    { timeMin, timeMax },
    {
      refetchOnWindowFocus: false,
      enabled: !!status?.googlecalendar,
    }
  );

  // Event creation mutation
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

  // Modal & form states
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

  // Setup keyboard shortcuts
  useKeyboard({
    "gi": () => router.push("/inbox"),
    "gc": () => {
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

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse attendees
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

  // Group events by local day index (0 = Sun, 1 = Mon, ..., 6 = Sat)
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

  // Position calculation inside 8 AM - 8 PM (12 hour viewport)
  const getEventStyle = (event: any) => {
    const startStr = event.start?.dateTime || event.start?.date;
    const endStr = event.end?.dateTime || event.end?.date;
    if (!startStr || !endStr) return { display: "none" };

    const start = new Date(startStr);
    const end = new Date(endStr);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;

    // Crop to workday viewport: 8 AM (8) to 8 PM (20)
    const viewStart = Math.max(8, Math.min(20, startHour));
    const viewEnd = Math.max(8, Math.min(20, endHour));

    if (viewEnd <= viewStart) {
      return { display: "none" }; // outside workday view or invalid duration
    }

    const topPercent = ((viewStart - 8) / 12) * 100;
    const heightPercent = ((viewEnd - viewStart) / 12) * 100;

    return {
      top: `${topPercent}%`,
      height: `${heightPercent}%`,
    };
  };

  // Open invite modal with clicked slot start/end preset
  const handleSlotClick = (day: Date, hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(day);
    end.setHours(hour + 1, 0, 0, 0);

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const pad = (num: number) => String(num).padStart(2, "0");
    const formatLocal = (d: Date) => 
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setNewStart(formatLocal(start));
    setNewEnd(formatLocal(end));
    setIsInviteOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
        }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            M
          </div>
          <span className="font-extrabold tracking-tight text-xl bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
            MailMind Calendar
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center space-x-1"
          >
            <span>+ Create Invite</span>
          </button>
          <button
            onClick={() => void refetch()}
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all"
          >
            Refresh
          </button>
          <Link
            href="/inbox"
            className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-slate-300"
          >
            Back to Inbox (GI)
          </Link>
        </div>
      </header>

      {/* Calendar Week View Grid */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {!status?.googlecalendar ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4 max-w-md mx-auto text-center">
            <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl">
              <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-200">Google Calendar Disconnected</h2>
              <p className="text-xs text-slate-500 mt-1">Connect your Google Calendar via Corsair to sync your events and schedule meetings.</p>
            </div>
            <button
              onClick={handleConnectCalendar}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-indigo-600/20"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col backdrop-blur-md shadow-2xl">
            {/* Header: Days of the week */}
            <div className="grid grid-cols-8 border-b border-slate-800/80 bg-slate-900/60 py-3 text-center">
              {/* Time Column Header Blank */}
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center border-r border-slate-800/40">
                Time (UTC)
              </div>
              
              {currentWeekDays.map((day, idx) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={idx} className="flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {day.toLocaleDateString(undefined, { weekday: "short" })}
                    </span>
                    <span className={`text-md font-extrabold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "text-slate-300"
                    }`}>
                      {day.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto min-h-0 flex relative">
              {/* Time slot indicator grid background */}
              <div className="w-full grid grid-cols-8 relative select-none">
                {/* 1. Time Slot labels column */}
                <div className="border-r border-slate-800/60 bg-slate-950/20 text-slate-500">
                  {workHours.map((hour) => (
                    <div key={hour} className="h-20 border-b border-slate-800/30 flex items-start justify-end pr-3 pt-1 text-[10px] font-mono">
                      {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                    </div>
                  ))}
                </div>

                {/* 2. Columns for Sunday to Saturday */}
                {currentWeekDays.map((day, dayIdx) => (
                  <div key={dayIdx} className="relative border-r border-slate-800/40 min-h-[1040px]">
                    {/* Hour slots interactive click area */}
                    {workHours.slice(0, -1).map((hour) => (
                      <div
                        key={hour}
                        onClick={() => handleSlotClick(day, hour)}
                        className="h-20 border-b border-slate-800/25 hover:bg-indigo-600/5 transition-all cursor-pointer relative group"
                        title="Click to schedule invite"
                      >
                        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[10px] font-bold text-indigo-400 pointer-events-none">
                          + Book Slot
                        </span>
                      </div>
                    ))}

                    {/* Absolute positioned calendar events */}
                    {groupedEvents[day.getDay()]?.map((event: any) => {
                      const startStr = event.start?.dateTime || event.start?.date;
                      const endStr = event.end?.dateTime || event.end?.date;
                      const start = new Date(startStr);
                      const end = new Date(endStr);
                      const timeString = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

                      return (
                        <div
                          key={event.id}
                          style={getEventStyle(event)}
                          className="absolute left-1 right-1 p-2 bg-gradient-to-tr from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 border border-indigo-400/30 rounded-lg shadow-lg overflow-hidden flex flex-col justify-between transition-all cursor-pointer z-10 text-left"
                          title={`${event.summary || "(No Title)"}\n${timeString}\n${event.description || ""}`}
                        >
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-[10px] text-white leading-tight truncate">
                              {event.summary || "(No Title)"}
                            </h4>
                            {event.location && (
                              <p className="text-[8px] text-slate-300 font-medium truncate mt-0.5">
                                📍 {event.location}
                              </p>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-indigo-200 mt-1 select-none">
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
      </div>

      {/* MODAL: Invite Creator */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                Create New Calendar Invite
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-all text-xs"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  required
                  placeholder="Meeting / Slot Sync"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="Google Meet / Meeting Room / Remote"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Attendees (Comma Separated)</label>
                <input
                  type="text"
                  value={newAttendees}
                  onChange={(e) => setNewAttendees(e.target.value)}
                  placeholder="guest1@example.com, guest2@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Invite description..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createEventMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-indigo-600/10"
                >
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cheatsheet */}
      {showCheatsheet && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                ⌨️ Calendar Shortcuts
              </h3>
              <button
                onClick={() => setShowCheatsheet(false)}
                className="text-slate-400 hover:text-slate-200 transition-all text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Go to Inbox Page</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">gi</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Refresh Calendar Events</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">gc</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Open Keyboard Help</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">?</kbd>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowCheatsheet(false)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white"
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
