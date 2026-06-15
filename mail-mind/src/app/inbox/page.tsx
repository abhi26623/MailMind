"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useKeyboard } from "@/hooks/useKeyboard";

interface Thread {
  id: string;
  snippet: string;
  historyId: string;
  messages?: Array<{
    id: string;
    snippet: string;
    internalDate: string;
    labelIds?: string[];
  }>;
}

export default function InboxPage() {
  const router = useRouter();
  
  // Queries
  const { data: status } = api.email.getConnectionStatus.useQuery();
  const { data, isLoading, error, refetch } = api.email.threads.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const { data: calendarData, refetch: refetchCalendar } = api.email.calendarEvents.useQuery({}, {
    refetchOnWindowFocus: false,
    enabled: !!status?.googlecalendar,
  });

  // Mutations
  const archiveMutation = api.email.archive.useMutation({
    onSuccess: () => {
      showToast("Email archived successfully", "success");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to archive: ${err.message}`, "error");
    }
  });

  const deleteMutation = api.email.delete.useMutation({
    onSuccess: () => {
      showToast("Email moved to trash", "success");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to delete: ${err.message}`, "error");
    }
  });

  const toggleStarMutation = api.email.toggleStar.useMutation({
    onSuccess: () => {
      showToast("Star status updated", "success");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to toggle star: ${err.message}`, "error");
    }
  });

  const replyMutation = api.email.reply.useMutation({
    onSuccess: () => {
      showToast("Reply sent successfully", "success");
      setIsReplyOpen(false);
      setReplyBody("");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to send reply: ${err.message}`, "error");
    }
  });

  const sendMutation = api.email.send.useMutation({
    onSuccess: () => {
      showToast("Email sent successfully", "success");
      setIsComposeOpen(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      void refetch();
    },
    onError: (err) => {
      showToast(`Failed to send: ${err.message}`, "error");
    }
  });

  // Thread Memoization
  const threads: Thread[] = useMemo(() => {
    if (!data) return [];
    const rawData = data as unknown as { threads?: Thread[] };
    return rawData.threads ?? [];
  }, [data]);

  // States
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Modal States
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");

  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  // Helper: Toast
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Helper: Get active / selected thread
  const selectedThread = threads[selectedIndex] ?? null;

  // Active Thread update on selection or load
  useEffect(() => {
    if (threads.length > 0) {
      if (!activeThread || !threads.some(t => t.id === activeThread.id)) {
        setActiveThread(threads[0] ?? null);
        setSelectedIndex(0);
      }
    } else {
      setActiveThread(null);
    }
  }, [threads, activeThread]);

  // Sync index with activeThread
  const handleSelectThread = (thread: Thread, index: number) => {
    setSelectedIndex(index);
    setActiveThread(thread);
  };

  // Check if thread is starred
  const isThreadStarred = (thread: Thread | null) => {
    if (!thread) return false;
    return thread.messages?.some(m => m.labelIds?.includes("STARRED")) ?? false;
  };

  // Actions
  const handleArchive = (thread: Thread | null) => {
    if (!thread) return;
    archiveMutation.mutate({ threadId: thread.id });
  };

  const handleDelete = (thread: Thread | null) => {
    if (!thread) return;
    deleteMutation.mutate({ threadId: thread.id });
  };

  const handleToggleStar = (thread: Thread | null) => {
    if (!thread) return;
    const isStarred = isThreadStarred(thread);
    toggleStarMutation.mutate({ threadId: thread.id, starred: !isStarred });
  };

  const handleOpenReply = () => {
    if (!activeThread) {
      showToast("No active email to reply to", "error");
      return;
    }
    setIsReplyOpen(true);
  };

  const handleOpenCompose = () => {
    setIsComposeOpen(true);
  };

  const handleSelectNext = () => {
    if (threads.length === 0) return;
    const nextIdx = Math.min(selectedIndex + 1, threads.length - 1);
    setSelectedIndex(nextIdx);
    setActiveThread(threads[nextIdx] ?? null);
  };

  const handleSelectPrev = () => {
    if (threads.length === 0) return;
    const prevIdx = Math.max(selectedIndex - 1, 0);
    setSelectedIndex(prevIdx);
    setActiveThread(threads[prevIdx] ?? null);
  };

  // Keyboard Hook
  useKeyboard({
    "e": () => handleArchive(selectedThread),
    "r": () => handleOpenReply(),
    "c": () => handleOpenCompose(),
    "#": () => handleDelete(selectedThread),
    "s": () => handleToggleStar(selectedThread),
    "j": () => handleSelectNext(),
    "k": () => handleSelectPrev(),
    "?": () => setShowCheatsheet(true),
    "gi": () => router.push("/inbox"),
    "gc": () => router.push("/calendar"),
  });

  // Today's Calendar events memoization
  const todaysEvents = useMemo(() => {
    if (!calendarData?.items) return [];
    const todayStr = new Date().toDateString();
    return calendarData.items.filter((event: any) => {
      const start = event.start?.dateTime || event.start?.date;
      if (!start) return false;
      return new Date(start).toDateString() === todayStr;
    });
  }, [calendarData]);

  // Gmail / Calendar connection redirect handlers
  const handleToggleGmail = () => {
    if (!status?.gmail) {
      window.location.href = "/api/connect?plugin=gmail";
    }
  };

  const handleToggleCalendar = () => {
    if (!status?.googlecalendar) {
      window.location.href = "/api/connect?plugin=googlecalendar";
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    replyMutation.mutate({
      threadId: activeThread.id,
      to: "me",
      subject: activeThread.snippet.substring(0, 50),
      body: replyBody,
    });
  };

  const handleSendCompose = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate({
      to: composeTo,
      subject: composeSubject,
      body: composeBody,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            : toast.type === "error"
            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
            : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
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
            MailMind
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 mr-2">
            {/* Gmail Connection Toggle */}
            <button
              onClick={handleToggleGmail}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                status?.gmail
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-slate-300 hover:text-slate-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status?.gmail ? "bg-emerald-400" : "bg-slate-500 animate-pulse"}`} />
              <span>Gmail</span>
            </button>

            {/* Calendar Connection Toggle */}
            <button
              onClick={handleToggleCalendar}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                status?.googlecalendar
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 cursor-default"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700/50 text-slate-300 hover:text-slate-100"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status?.googlecalendar ? "bg-emerald-400" : "bg-slate-500 animate-pulse"}`} />
              <span>Calendar</span>
            </button>
          </div>

          <Link
            href="/settings"
            id="settings-link"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-xl transition-all text-slate-300 hover:text-slate-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button
            onClick={() => {
              void refetch();
              if (status?.googlecalendar) void refetchCalendar();
            }}
            className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 rounded-xl transition-all shadow-md shadow-indigo-600/10"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Navigation Sidebar & Hotkeys helper */}
        <div className="col-span-1 border-r border-slate-800/80 bg-slate-900/20 p-4 flex flex-col justify-between items-center text-slate-500">
          <div className="flex flex-col space-y-6 w-full items-center">
            <button 
              onClick={() => setIsComposeOpen(true)} 
              title="Compose Email (C)" 
              className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button 
              onClick={() => setShowCheatsheet(true)} 
              title="Keyboard Cheatsheet (?)"
              className="p-3 bg-slate-800/40 hover:bg-slate-800 text-slate-400 rounded-xl transition-all"
            >
              <span className="font-bold text-xs">?</span>
            </button>
          </div>

          <div className="flex flex-col space-y-4 w-full items-center text-[10px] text-slate-600 border-t border-slate-800/60 pt-4">
            <div className="text-center">
              <kbd className="block bg-slate-800 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-700">J</kbd>
              <span>next</span>
            </div>
            <div className="text-center">
              <kbd className="block bg-slate-800 text-slate-300 px-1 py-0.5 rounded font-mono border border-slate-700">K</kbd>
              <span>prev</span>
            </div>
          </div>
        </div>

        {/* Thread List */}
        <div className="col-span-3 border-r border-slate-800/80 overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-bold text-sm text-slate-300">All Threads</h2>
            <span className="text-xs bg-slate-800/60 px-2 py-0.5 rounded text-slate-400 border border-slate-700/50">
              {threads.length} total
            </span>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-slate-900/50 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : error || (data as any)?._error ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-red-400 font-medium mb-3">Failed to load threads</p>
              {((data as any)?._error || error?.message || "").includes("auth-missing") ? (
                <a
                  href="/api/connect?plugin=gmail"
                  className="inline-block px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
                >
                  Connect Gmail
                </a>
              ) : (
                <p className="text-xs">{(data as any)?._error || error?.message}</p>
              )}
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="font-medium text-xs">Your inbox is clean</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {threads.map((thread, index) => {
                const isSelected = index === selectedIndex;
                const isActive = thread.id === activeThread?.id;
                const isStarred = isThreadStarred(thread);
                return (
                  <div
                    key={thread.id}
                    id={`thread-${thread.id}`}
                    onClick={() => handleSelectThread(thread, index)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? "bg-indigo-600/10 border-indigo-500/50 shadow-md shadow-indigo-500/5"
                        : isSelected
                        ? "bg-slate-900/90 border-slate-700"
                        : "bg-slate-900/30 border-slate-800/40 hover:bg-slate-900/50 hover:border-slate-800"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700/60">
                        {thread.id.substring(0, 8)}
                      </span>
                      {isStarred && (
                        <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {thread.snippet || "(No content)"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Thread Detail / Main Workspace View */}
        <div className="col-span-5 bg-slate-900/10 overflow-y-auto max-h-[calc(100vh-73px)] p-6">
          {activeThread ? (
            <div className="space-y-6">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-4 py-2 rounded-xl backdrop-blur-md">
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => handleArchive(activeThread)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition-all"
                    title="Archive (E)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleDelete(activeThread)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition-all"
                    title="Delete (#)"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => handleToggleStar(activeThread)}
                    className={`p-2 hover:bg-slate-800 rounded-lg transition-all ${isThreadStarred(activeThread) ? "text-amber-400" : "text-slate-400 hover:text-amber-300"}`}
                    title="Toggle Star (S)"
                  >
                    <svg className="w-4 h-4" fill={isThreadStarred(activeThread) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={handleOpenReply}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-all border border-slate-700/50 flex items-center space-x-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>Reply (R)</span>
                  </button>
                </div>
              </div>

              {/* Thread Content */}
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl shadow-xl backdrop-blur-md">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-slate-800">
                  <div>
                    <h2 className="text-md font-bold text-slate-100 mb-1">Thread #{activeThread.id}</h2>
                    <p className="text-[10px] text-slate-400">History ID: {activeThread.historyId}</p>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] rounded-full border border-emerald-500/20 font-bold uppercase tracking-wider">
                    Synced Gmail
                  </span>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initial Snippet</h3>
                  <div className="bg-slate-950/60 border border-slate-800/60 p-4 rounded-xl text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {activeThread.snippet || "(No content)"}
                  </div>
                </div>
              </div>

              {/* Messages details */}
              {activeThread.messages && activeThread.messages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
                    Messages ({activeThread.messages.length})
                  </h3>
                  <div className="space-y-3">
                    {activeThread.messages.map((message) => (
                      <div key={message.id} className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between text-[10px] text-slate-500 border-b border-slate-800/40 pb-2">
                          <span>Message ID: {message.id}</span>
                          <span>{new Date(parseInt(message.internalDate)).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{message.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 min-h-[400px]">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium">Select a thread or compose a new email</p>
              <p className="text-[10px] text-slate-600 mt-1">Use J / K to navigate, Enter to open</p>
            </div>
          )}
        </div>

        {/* Sidebar: Calendar Today's Events */}
        <div className="col-span-3 border-l border-slate-800/80 bg-slate-900/10 p-4 overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
              <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-400 flex items-center space-x-1">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Today's Schedule</span>
              </h3>
              <Link
                href="/calendar"
                id="calendar-link"
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest"
              >
                View Week (GC)
              </Link>
            </div>

            {!status?.googlecalendar ? (
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl text-center space-y-2">
                <p className="text-[11px] text-slate-400">Calendar integration not connected</p>
                <button
                  onClick={handleToggleCalendar}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold rounded-lg text-white"
                >
                  Connect Calendar
                </button>
              </div>
            ) : todaysEvents.length === 0 ? (
              <div className="p-6 bg-slate-900/20 border border-slate-800/60 rounded-xl text-center text-slate-500">
                <p className="text-[11px]">No events scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaysEvents.map((event: any) => {
                  const startVal = event.start?.dateTime || event.start?.date;
                  const endVal = event.end?.dateTime || event.end?.date;
                  const startTime = startVal ? new Date(startVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All Day";
                  const endTime = endVal ? new Date(endVal).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                  
                  return (
                    <div key={event.id} className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl hover:border-slate-700/60 transition-all space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-xs text-slate-200 line-clamp-1">{event.summary || "(No Title)"}</h4>
                        <span className="text-[9px] bg-slate-800 text-indigo-300 px-1 py-0.2 rounded border border-slate-750 font-mono">
                          {startTime} {endTime ? `- ${endTime}` : ""}
                        </span>
                      </div>
                      {event.description && <p className="text-[10px] text-slate-400 line-clamp-1">{event.description}</p>}
                      {event.location && (
                        <div className="flex items-center space-x-1 text-[9px] text-slate-500">
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
      </div>

      {/* MODAL: Compose */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">Compose New Email</h3>
              <button 
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-all text-xs"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSendCompose} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">To</label>
                <input 
                  type="email" 
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                  placeholder="recipient@example.com" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <input 
                  type="text" 
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  placeholder="Subject details" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Message Body</label>
                <textarea 
                  rows={6}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  placeholder="Write your email here..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-indigo-600/10"
                >
                  {sendMutation.isPending ? "Sending..." : "Send Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reply */}
      {isReplyOpen && activeThread && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200">
                Reply to Thread #{activeThread.id.substring(0, 8)}
              </h3>
              <button 
                onClick={() => setIsReplyOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-all text-xs"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subject</label>
                <div className="w-full bg-slate-950/50 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-400">
                  Re: {activeThread.snippet.substring(0, 50)}...
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Your Reply</label>
                <textarea 
                  rows={6}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  required
                  placeholder="Write reply here..." 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsReplyOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={replyMutation.isPending}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-indigo-600/10"
                >
                  {replyMutation.isPending ? "Sending..." : "Send Reply"}
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
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-200 flex items-center space-x-1.5">
                <span>⌨️ Keyboard Shortcuts</span>
              </h3>
              <button 
                onClick={() => setShowCheatsheet(false)}
                className="text-slate-400 hover:text-slate-200 transition-all text-xs"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Archive Selected Thread</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">e</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Reply to Thread</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">r</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Compose New Email</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">c</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Delete / Trash Selected Thread</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">#</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Toggle Star Status</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">s</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Select Next Thread</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">j</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Select Previous Thread</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">k</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Go to Inbox Page</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">gi</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-800/40 text-xs">
                <span className="text-slate-400">Go to Calendar Page</span>
                <kbd className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-indigo-400 font-mono font-bold">gc</kbd>
              </div>
            </div>

            <div className="pt-2 text-center">
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
