"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SignOutButton } from "@/app/_components/auth-buttons";
import { api } from "@/trpc/react";

export default function SettingsPage() {
  const { data: status, isLoading, refetch } = api.email.getConnectionStatus.useQuery();

  const [gmailActive, setGmailActive] = useState(false);
  const [calendarActive, setCalendarActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (status) {
      setGmailActive(status.gmail.connected);
      setCalendarActive(status.googlecalendar.connected);
    }
  }, [status]);

  const disconnectMutation = api.connect.disconnect.useMutation({
    onSuccess: async (_, variables) => {
      setErrorMsg("");
      setSuccessMsg(`${variables.plugin === "gmail" ? "Gmail" : "Google Calendar"} disconnected successfully.`);
      if (variables.plugin === "gmail") setGmailActive(false);
      else setCalendarActive(false);
      await refetch();
      setTimeout(() => setSuccessMsg(""), 3000);
    },
    onError: (err) => {
      setErrorMsg(`Failed to disconnect: ${err.message}`);
    },
  });

  const handleToggleGmail = () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!gmailActive) {
      window.location.href = "/api/connect?plugin=gmail";
    } else {
      disconnectMutation.mutate({ plugin: "gmail" });
    }
  };

  const handleToggleCalendar = () => {
    setErrorMsg("");
    setSuccessMsg("");
    if (!calendarActive) {
      window.location.href = "/api/connect?plugin=googlecalendar";
    } else {
      disconnectMutation.mutate({ plugin: "googlecalendar" });
    }
  };

  const isDisconnecting = disconnectMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-slate-800 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-white border border-forest-900/10 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        {/* Decorative Gradients */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Integrations Settings
            </h1>
            <div className="flex items-center space-x-2">
              <Link
                href="/inbox"
                id="back-to-inbox"
                className="text-xs font-semibold px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 rounded-lg transition-all"
              >
                Go to Inbox
              </Link>
              <SignOutButton className="px-4 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-sm text-rose-600 rounded-lg transition-all" />
            </div>
          </div>

          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Manage your connection to Google Services. MailMind uses Corsair to securely sync your emails and calendar events.
          </p>

          {isLoading ? (
            <div className="space-y-4 py-6">
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
              <div className="h-16 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Gmail Toggle */}
              <div className="flex items-center justify-between p-5 bg-forest-800/30 border border-forest-700 rounded-xl hover:border-forest-600/50 transition-all">
                <div className="flex items-center space-x-4 flex-1 min-w-0 pr-4">
                  <div className="p-2.5 bg-red-500/10 text-red-400 rounded-lg shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">Gmail Integration</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isDisconnecting && gmailActive
                        ? "Disconnecting..."
                        : gmailActive
                        ? "Connected \u2713"
                        : status?.gmail.error?.includes("Account not found") || status?.gmail.error?.includes("auth-missing")
                        ? "Please connect to Gmail to use this integration."
                        : status?.gmail.error && status.gmail.error !== "Not connected"
                        ? status.gmail.error
                        : "Click connect to link your account"}
                    </p>
                  </div>
                </div>

                <button
                  id="toggle-gmail"
                  onClick={handleToggleGmail}
                  disabled={isDisconnecting}
                  className={`shrink-0 px-4 py-2 font-semibold text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-forest-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                    gmailActive
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-500"
                      : "bg-wheat-500 text-forest-950 hover:bg-wheat-400 focus:ring-wheat-500"
                  }`}
                >
                  {gmailActive ? "Disconnect" : "Connect"}
                </button>
              </div>

              {/* Google Calendar Toggle */}
              <div className="flex items-center justify-between p-5 bg-forest-800/30 border border-forest-700 rounded-xl hover:border-forest-600/50 transition-all">
                <div className="flex items-center space-x-4 flex-1 min-w-0 pr-4">
                  <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate">Google Calendar</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isDisconnecting && calendarActive
                        ? "Disconnecting..."
                        : calendarActive
                        ? "Connected \u2713"
                        : status?.googlecalendar.error?.includes("Account not found") || status?.googlecalendar.error?.includes("auth-missing")
                        ? "Please connect to Google Calendar to use this integration."
                        : status?.googlecalendar.error && status.googlecalendar.error !== "Not connected"
                        ? status.googlecalendar.error
                        : "Click connect to link your account"}
                    </p>
                  </div>
                </div>

                <button
                  id="toggle-calendar"
                  onClick={handleToggleCalendar}
                  disabled={isDisconnecting}
                  className={`shrink-0 px-4 py-2 font-semibold text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-forest-900 disabled:opacity-50 disabled:cursor-not-allowed ${
                    calendarActive
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-500"
                      : "bg-wheat-500 text-forest-950 hover:bg-wheat-400 focus:ring-wheat-500"
                  }`}
                >
                  {calendarActive ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
              {successMsg}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            <button
              id="refresh-status"
              onClick={() => void refetch()}
              className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-forest-900/10 shadow-sm text-forest-800 text-slate-800 font-medium text-sm rounded-xl transition-all"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
