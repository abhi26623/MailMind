"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const { data: status, isLoading, refetch } = api.email.getConnectionStatus.useQuery();

  const [gmailActive, setGmailActive] = useState(false);
  const [calendarActive, setCalendarActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status) {
      setGmailActive(status.gmail);
      setCalendarActive(status.googlecalendar);
    }
  }, [status]);

  const handleToggleGmail = () => {
    if (!gmailActive) {
      setErrorMsg("");
      window.location.href = "/api/connect?plugin=gmail";
    } else {
      setErrorMsg("Disconnecting is not implemented.");
    }
  };

  const handleToggleCalendar = () => {
    if (!calendarActive) {
      setErrorMsg("");
      window.location.href = "/api/connect?plugin=googlecalendar";
    } else {
      setErrorMsg("Disconnecting is not implemented.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Integrations Settings
            </h1>
            <Link
              href="/inbox"
              id="back-to-inbox"
              className="text-xs font-semibold px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg transition-all"
            >
              Go to Inbox
            </Link>
          </div>

          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Manage your connection to Google Services. MailMind uses Corsair to securely sync your emails and calendar events.
          </p>

          {isLoading ? (
            <div className="space-y-4 py-6">
              <div className="h-16 bg-slate-800/40 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-800/40 animate-pulse rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gmail Toggle */}
              <div className="flex items-center justify-between p-5 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-700/50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200">Gmail Integration</h3>
                    <p className="text-xs text-slate-400">
                      {gmailActive ? "Connected ✓" : "Click toggle to connect"}
                    </p>
                  </div>
                </div>

                <button
                  id="toggle-gmail"
                  onClick={handleToggleGmail}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    gmailActive ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gmailActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Google Calendar Toggle */}
              <div className="flex items-center justify-between p-5 bg-slate-800/30 border border-slate-800 rounded-xl hover:border-slate-700/50 transition-all">
                <div className="flex items-center space-x-4">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-200">Google Calendar</h3>
                    <p className="text-xs text-slate-400">
                      {calendarActive ? "Connected ✓" : "Click toggle to connect"}
                    </p>
                  </div>
                </div>

                <button
                  id="toggle-calendar"
                  onClick={handleToggleCalendar}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    calendarActive ? "bg-indigo-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      calendarActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              id="refresh-status"
              onClick={() => void refetch()}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-200 font-medium text-sm rounded-xl transition-all"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
