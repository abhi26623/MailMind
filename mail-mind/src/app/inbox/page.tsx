
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { SettingsModal } from "@/app/_components/settings-modal";
import { SignOutButton } from "@/app/_components/auth-buttons";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useKeyboard } from "@/hooks/useKeyboard";
import { authClient } from "@/server/better-auth/client";
import { CommandPalette } from "@/app/_components/CommandPalette";
import { PeekCalendarModal } from "@/app/_components/PeekCalendarModal";

interface Thread {
  id: string;
  snippet: string;
  historyId: string;
  messages?: Array<{
    id: string;
    payload?: any;
    internalDate?: string;
    labelIds?: string[];
  }>;
}

function ShadowEmail({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (ref.current) {
      const shadow = ref.current.shadowRoot || ref.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
    }
  }, [html]);

  return <div ref={ref} className={className} />;
}

export default function InboxPage() {
  const router = useRouter();

  // Auth Session
  const { data: session } = authClient.useSession();

  // Seed mutation -- must complete before data queries run
  const [seeded, setSeeded] = useState(false);

  const seedMutation = api.connect.seedFromBetterAuth.useMutation({
    onSuccess: () => {
      console.log("Seeding and webhook registration completed.");
      setSeeded(true);
    },
    onError: (err) => {
      console.error("Seeding/webhook registration failed:", err);
      // Still allow queries to run so the user sees the actual error
      setSeeded(true);
    }
  });

  useEffect(() => {
    if (session?.user?.id && !seeded && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [session?.user?.id]);

  // Queries -- only enabled AFTER seed completes to avoid DEK race condition
  const { data: status } = api.email.getConnectionStatus.useQuery(undefined, {
    enabled: seeded,
  });
  const gmailConnected = !!status?.gmail?.connected;
  const calendarConnected = !!status?.googlecalendar?.connected;
  const gmailError = status?.gmail?.error;
  const calendarError = status?.googlecalendar?.error;

  const [activeFolder, setActiveFolder] = useState<string>("inbox");

  const queryLabelIds = useMemo(() => {
    switch (activeFolder) {
      case "inbox": return ["INBOX"];
      case "unread": return ["UNREAD"];
      case "drafts": return ["DRAFT"];
      case "sent": return ["SENT"];
      case "favorite": return ["STARRED"];
      case "trash": return ["TRASH"];
      default: return undefined;
    }
  }, [activeFolder]);

  const queryQ = useMemo(() => {
    switch (activeFolder) {
      case "archive": return "-in:inbox -in:trash";
      default: return undefined;
    }
  }, [activeFolder]);

  const { 
    data, 
    isLoading, 
    error, 
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = api.email.threads.useInfiniteQuery({
    labelIds: queryLabelIds,
    q: queryQ,
  }, {
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    refetchOnWindowFocus: false,
    enabled: seeded && activeFolder !== "readLater",
  });

  const {
    data: readLaterData,
    isLoading: isReadLaterLoading,
    refetch: refetchReadLater
  } = api.email.getReadLaterThreads.useQuery(undefined, {
    enabled: seeded && activeFolder === "readLater",
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 100;
    if (bottom && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const { data: calendarData, refetch: refetchCalendar } = api.email.calendarEvents.useQuery({}, {
    refetchOnWindowFocus: false,
    refetchInterval: 30000, // Auto-poll calendar every 30 seconds
    enabled: seeded && calendarConnected,
  });



  // Listen to Server-Sent Events (SSE) for real-time webhook updates
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      if (event.data === "refresh") {
        console.log("Real-time webhook notification received. Refetching data...");
        void refetch();
        if (calendarConnected) {
          void refetchCalendar();
        }
        showToast("New updates received!", "info");
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection lost. Reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, [refetch, refetchCalendar, calendarConnected]);

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

  const [threadSummary, setThreadSummary] = useState<Record<string, string>>({});
  const summarizeMutation = api.email.summarizeThread.useMutation({
    onSuccess: (res, variables) => {
      setThreadSummary(prev => ({ ...prev, [variables.threadId]: res.summary }));
      showToast("Thread summarized!", "success");
    },
    onError: (err) => showToast(`Failed to summarize: ${err.message}`, "error"),
  });

  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const unsubscribeMutation = api.email.unsubscribeAndClean.useMutation({
    onSuccess: (res) => {
      if (res.listUnsubscribeFound) {
        showToast(`Unsubscribed! Cleaned up ${res.deletedCount} past emails.`, "success");
      } else {
        showToast(`No unsubscribe link found. Cleaned up ${res.deletedCount} past emails.`, "info");
      }
      setShowUnsubscribeConfirm(false);
      void refetch();
    },
    onError: (err) => showToast(`Failed to unsubscribe: ${err.message}`, "error"),
  });

  const composePolishMutation = api.agent.polishTone.useMutation({
    onSuccess: (res) => {
      setComposeBody(res.polished);
      showToast("Tone polished!", "success");
    },
    onError: (err) => showToast(`Failed to polish tone: ${err.message}`, "error"),
  });

  const replyPolishMutation = api.agent.polishTone.useMutation({
    onSuccess: (res) => {
      setReplyBody(res.polished);
      showToast("Tone polished!", "success");
    },
    onError: (err) => showToast(`Failed to polish tone: ${err.message}`, "error"),
  });

  // Thread Memoization
  const threads: Thread[] = useMemo(() => {
    if (activeFolder === "readLater") {
      return (readLaterData?.threads as unknown as Thread[]) || [];
    }
    if (!data) return [];
    return data.pages.flatMap((page) => page.threads as unknown as Thread[]) ?? [];
  }, [data, readLaterData, activeFolder]);

  // Read Later Mutations
  const toggleReadLaterMutation = api.email.toggleReadLater.useMutation({
    onSuccess: () => {
      showToast("Read Later updated!", "success");
      void refetchReadLater();
    },
    onError: (err) => showToast(`Failed: ${err.message}`, "error")
  });

  const [weeklyDigest, setWeeklyDigest] = useState<string | null>(null);
  const digestMutation = api.email.generateReadLaterDigest.useMutation({
    onSuccess: (res) => setWeeklyDigest(res.digest),
    onError: (err) => showToast(`Failed to generate digest: ${err.message}`, "error")
  });

  // Smart Replies Query (Runs when active thread changes)
  const { data: smartRepliesData } = api.agent.generateSmartReplies.useQuery(
    { context: activeThread?.snippet || "" },
    {
      enabled: !!activeThread?.snippet && activeFolder !== "readLater",
      staleTime: Infinity, // don't refetch on focus
    }
  );

  const smartReplyDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => {
      setReplyBody(res.draft);
      setIsReplyOpen(true);
      showToast("Draft generated!", "success");
    },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error")
  });

  // States
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const threadIds = useMemo(() => threads.map(t => t.id), [threads]);
  const { data: insights, refetch: refetchInsights } = api.insights.getInsightsBatch.useQuery(
    { threadIds },
    { enabled: threadIds.length > 0 }
  );

  // Trigger insight generation for threads missing insights (POST mutation avoids URL size limits)
  const generateMutation = api.insights.generateMissingInsights.useMutation({
    onSuccess: (data) => {
      if (data.generated > 0) {
        void refetchInsights();
      }
    },
  });

  const composeDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => {
      setComposeBody(res.draft);
      setIsComposeAiOpen(false);
      setComposeAiPrompt("");
      showToast("Draft generated!", "success");
    },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error"),
  });

  const replyDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => {
      setReplyBody(res.draft);
      setIsReplyAiOpen(false);
      setReplyAiPrompt("");
      showToast("Draft generated!", "success");
    },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error"),
  });

  const generationTriggered = useRef<string>("");
  useEffect(() => {
    if (!insights || !threads.length) return;
    const existingIds = new Set(insights.map((i: any) => i.threadId));
    const missing = threads.filter(t => !existingIds.has(t.id) && t.snippet);
    if (missing.length === 0) return;
    // Dedupe: only trigger once per unique set of missing IDs
    const key = missing.map(m => m.id).sort().join(",");
    if (generationTriggered.current === key) return;
    generationTriggered.current = key;
    generateMutation.mutate({
      threadMeta: missing.map(t => ({ threadId: t.id, snippet: t.snippet || undefined })),
    });
  }, [insights, threads]);

  // Fetch full details of the currently active thread
  const { data: threadDetails, isLoading: isLoadingDetails } = api.email.threadDetails.useQuery(
    { threadId: activeThread?.id ?? "" },
    {
      enabled: seeded && !!activeThread?.id,
      refetchOnWindowFocus: false,
    }
  );

  // Modal States
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [isComposeAiOpen, setIsComposeAiOpen] = useState(false);
  const [composeAiPrompt, setComposeAiPrompt] = useState("");

  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isReplyAiOpen, setIsReplyAiOpen] = useState(false);
  const [replyAiPrompt, setReplyAiPrompt] = useState("");

  // Helper: Toast
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Category mapping: map AI categories to sidebar categories
  const categoryMap: Record<string, string> = {
    work: "work",
    needs_reply: "work",
    meeting: "events",
    newsletter: "social",
    social: "social",
    personal: "personal",
    receipt: "personal",
    other: "other",
  };

  // Filter threads by category
  const filteredThreads = useMemo(() => {
    if (!activeCategory) return threads;
    return threads.filter(thread => {
      const insight = insights?.find((i: any) => i.threadId === thread.id);
      if (!insight) return false;
      const mapped = categoryMap[(insight as any).category] || "other";
      return mapped === activeCategory;
    });
  }, [threads, activeCategory, insights]);

  // Helper: Get active / selected thread
  const selectedThread = filteredThreads[selectedIndex] ?? null;
  const activeInsight = insights?.find((i: any) => i && i.threadId === activeThread?.id);

  const scheduleMutation = api.workflow.scheduleFromEmail.useMutation({
    onSuccess: () => {
      showToast("Meeting scheduled & reply sent", "success");
      void refetch();
      if (calendarConnected) void refetchCalendar();
    },
    onError: (err) => {
      showToast(`Failed to schedule: ${err.message}`, "error");
    }
  });

  const [showPeekModal, setShowPeekModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenPeekModal = () => {
    if (!activeThread || !activeInsight) return;
    setShowPeekModal(true);
  };

  const handleConfirmPeekSchedule = (start: string, end: string) => {
    setShowPeekModal(false);
    if (!activeThread || !activeInsight) return;
    
    const attendeeEmail = activeInsight.extractedEmail || "guest@example.com";

    scheduleMutation.mutate({
      threadId: activeThread.id,
      attendeeEmail,
      summary: "Meeting: " + activeInsight.summary,
      start,
      end,
      replyBody: "I've scheduled a 30-minute meeting based on your request. See the calendar invite for details."
    });
  };

  // Keep old handler for the Command Palette
  const handleScheduleFromInsight = () => {
    handleOpenPeekModal();
  };

  // Active Thread update on selection or load
  useEffect(() => {
    if (filteredThreads.length > 0) {
      if (!activeThread || !filteredThreads.some(t => t.id === activeThread.id)) {
        setActiveThread(filteredThreads[0] ?? null);
        setSelectedIndex(0);
      }
    } else {
      setActiveThread(null);
    }
  }, [filteredThreads, activeThread]);

  // Sync index with activeThread
  const handleSelectThread = (thread: Thread, index: number) => {
    setSelectedIndex(index);
    setActiveThread(thread);
  };

  // Handle category selection
  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category);
    if (category) {
      setActiveFolder("inbox");
    }
    setSelectedIndex(0);
  };

  // Check if thread is starred
  const isThreadStarred = (thread: Thread | null) => {
    if (!thread) return false;
    // We can only reliably check stars on the full thread details if it's the active thread, 
    // or fallback to snippet messages if present
    const messages = thread.id === activeThread?.id && threadDetails?.messages
      ? threadDetails.messages
      : thread.messages;
    return messages?.some(m => m.labelIds?.includes("STARRED")) ?? false;
  };

  // Gmail body decoder helper
  const getMessageBody = (payload: any): string => {
    if (!payload) return "(No body)";
    let bodyData = "";
    if (payload.body?.data) {
      bodyData = payload.body.data;
    } else if (payload.parts) {
      const textPart = payload.parts.find((p: any) => p.mimeType === "text/plain");
      const htmlPart = payload.parts.find((p: any) => p.mimeType === "text/html");
      const part = htmlPart || textPart; // prefer html, fallback to text

      if (part?.body?.data) {
        bodyData = part.body.data;
      } else if (payload.parts[0]?.parts) { // nested parts (multipart/alternative)
        const subPart = payload.parts[0].parts.find((p: any) => p.mimeType === "text/html")
          || payload.parts[0].parts.find((p: any) => p.mimeType === "text/plain");
        if (subPart?.body?.data) bodyData = subPart.body.data;
      }
    }

    if (bodyData) {
      try {
        const base64 = bodyData.replace(/-/g, "+").replace(/_/g, "/");
        return decodeURIComponent(escape(window.atob(base64)));
      } catch (e) {
        return "(Error decoding message body)";
      }
    }
    return "(No readable body found)";
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
    if (filteredThreads.length === 0) return;
    const nextIdx = Math.min(selectedIndex + 1, filteredThreads.length - 1);
    setSelectedIndex(nextIdx);
    setActiveThread(filteredThreads[nextIdx] ?? null);
  };

  const handleSelectPrev = () => {
    if (filteredThreads.length === 0) return;
    const prevIdx = Math.max(selectedIndex - 1, 0);
    setSelectedIndex(prevIdx);
    setActiveThread(filteredThreads[prevIdx] ?? null);
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

  // Up Next events memoization (future events)
  const upcomingEvents = useMemo(() => {
    if (!calendarData?.items) return [];
    const now = new Date();
    return [...calendarData.items]
      .filter((event: any) => {
        const start = new Date(event.start?.dateTime || event.start?.date || 0);
        return start >= now;
      })
      .sort((a: any, b: any) => {
        const aStart = new Date(a.start?.dateTime || a.start?.date || 0).getTime();
        const bStart = new Date(b.start?.dateTime || b.start?.date || 0).getTime();
        return aStart - bStart;
      });
  }, [calendarData]);

  // Gmail / Calendar connection redirect handlers
  const handleToggleGmail = () => {
    if (!gmailConnected) {
      window.location.href = "/api/connect?plugin=gmail";
    }
  };

  const handleToggleCalendar = () => {
    if (!calendarConnected) {
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
    <div className="h-screen overflow-hidden bg-[#F5F6F8] text-forest-950 flex flex-col font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${toast.type === "success"
            ? "bg-emerald-50 border-emerald-500/20 text-emerald-600"
            : toast.type === "error"
              ? "bg-rose-50 border-rose-500/20 text-rose-600"
              : "bg-white border-forest-900/10 text-forest-900"
          }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white flex-shrink-0 sticky top-0 z-40 px-8 py-3 flex justify-between items-center border-b border-forest-900/5">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white shadow-md">
            M
          </div>
          <span className="font-extrabold tracking-tight text-xl text-forest-950">
            MailMind
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <Link
            href="/agent"
            id="agent-link"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-900 hover:bg-forest-800 border border-transparent rounded-xl transition-all text-cream-100 text-xs font-bold shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Agent
          </Link>

          <Link
            href="/settings"
            id="settings-link"
            className="p-2.5 hover:bg-white/50 text-forest-600 hover:text-forest-950 border border-transparent rounded-xl transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button
            onClick={() => setShowCheatsheet(true)}
            className="p-2.5 hover:bg-white/50 text-forest-600 hover:text-forest-950 border border-transparent rounded-xl transition-all"
            title="Shortcuts (?)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button
            onClick={() => {
              void refetch();
              if (calendarConnected) void refetchCalendar();
            }}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-forest-900/10 hover:border-forest-900/20 text-forest-800 rounded-xl transition-all shadow-sm"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10 h-full">
        {/* Navigation Sidebar: Icon only, name on hover */}
        <div className={`${isSidebarOpen ? "w-56" : "w-[72px]"} h-full border-r border-forest-900/10 bg-white py-4 flex flex-col justify-between items-center text-forest-700 flex-shrink-0 transition-all duration-300 overflow-y-auto overflow-x-hidden z-20`}>
          <div className="w-full flex justify-start px-4 mb-4"><button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-forest-500 hover:bg-forest-50 rounded-lg"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg></button></div><div className="flex flex-col space-y-2 w-full px-3">
            <button
              onClick={() => setIsComposeOpen(true)}
              className={`py-3 bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-xl shadow-lg flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} mb-6 transition-all w-full flex-shrink-0`}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              {isSidebarOpen && <span className="ml-3 font-semibold text-sm whitespace-nowrap">Compose</span>}
            </button>

            {/* Core Folders */}
            <div className="space-y-1 w-full flex flex-col items-start">
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("inbox"); }} className={`py-3 ${activeFolder === "inbox" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Inbox</span>}
              </button>

              <button onClick={() => { handleCategorySelect(null); setActiveFolder("drafts"); }} className={`py-3 ${activeFolder === "drafts" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Drafts</span>}
              </button>
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("sent"); }} className={`py-3 ${activeFolder === "sent" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Sent</span>}
              </button>
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("archive"); }} className={`py-3 ${activeFolder === "archive" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Archive</span>}
              </button>
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("favorite"); }} className={`py-3 ${activeFolder === "favorite" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Favorite</span>}
              </button>
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("readLater"); }} className={`py-3 ${activeFolder === "readLater" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Read Later</span>}
              </button>
              <button onClick={() => { handleCategorySelect(null); setActiveFolder("trash"); }} className={`py-3 ${activeFolder === "trash" && !activeCategory ? "bg-wheat-100 text-wheat-700" : "text-forest-600 hover:bg-white/60 hover:text-forest-950"} rounded-xl w-full flex items-center ${isSidebarOpen ? "justify-start px-4" : "justify-center"} group/btn transition-all`}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Trash</span>}
              </button>
            </div>


          </div>
          
          <div className="w-full px-3 mt-auto mb-4 space-y-2">
            <button onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/") } })} className={`py-3 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all flex items-center w-full ${isSidebarOpen ? "justify-start px-4" : "justify-center"}`} title="Sign Out">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              {isSidebarOpen && <span className="ml-4 font-semibold text-xs whitespace-nowrap">Sign Out</span>}
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div 
          className="w-[320px] xl:w-[380px] flex-shrink-0 border-r border-forest-900/10 bg-white h-full overflow-y-auto flex flex-col"
          onScroll={handleScroll}
        >
          <div className="p-4 border-b border-forest-900/10 bg-white sticky top-0 z-10 flex flex-col space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-sm text-slate-800">{activeCategory ? activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1) : activeFolder.charAt(0).toUpperCase() + activeFolder.slice(1)}</h2>
              <div className="flex items-center gap-2">
                {activeCategory && (
                  <button onClick={() => handleCategorySelect(null)} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Vector Search..." 
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 rounded-lg text-xs outline-none transition-all placeholder:text-slate-400 text-slate-700 shadow-sm" 
              />
              <svg className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            
            <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-1 pt-1">
              <button 
                onClick={() => handleCategorySelect("work")} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeCategory === "work" ? "bg-purple-100 border-purple-200 text-purple-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Work
              </button>
              <button 
                onClick={() => handleCategorySelect("social")} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeCategory === "social" ? "bg-blue-100 border-blue-200 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Social
              </button>
              <button 
                onClick={() => handleCategorySelect("events")} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeCategory === "events" ? "bg-cyan-100 border-cyan-200 text-cyan-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Events
              </button>
              <button 
                onClick={() => handleCategorySelect("personal")} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all border ${activeCategory === "personal" ? "bg-amber-100 border-amber-200 text-amber-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              >
                Personal
              </button>
            </div>
          </div>

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
                onClick={handleToggleGmail}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-xs font-semibold rounded-xl text-white shadow-lg shadow-blue-500/30"
              >
                Connect Gmail
              </button>
            </div>
          ) : error || (data?.pages?.[0] as any)?._error ? (
            <div className="p-8 text-center text-forest-500">
              <p className="text-red-400 font-medium mb-3">Failed to load threads</p>
              <p className="text-xs">{(data?.pages?.[0] as any)?._error || error?.message}</p>
            </div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center text-forest-500">
              <p className="font-medium text-xs">Your inbox is clean</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredThreads.map((thread, index) => {
                const isSelected = index === selectedIndex;
                const isActive = thread.id === activeThread?.id;
                const isStarred = isThreadStarred(thread);
                const threadInsight = insights?.find((i: any) => i.threadId === thread.id);
                const priority = (threadInsight as any)?.priority;
                const category = (threadInsight as any)?.category;
                return (
                  <div
                    key={thread.id}
                    id={`thread-${thread.id}`}
                    onClick={() => handleSelectThread(thread, index)}
                    className={`group p-3.5 rounded-xl cursor-pointer transition-all border ${isActive
                        ? "bg-slate-800 text-white shadow-md border-transparent rounded-xl"
                        : isSelected
                          ? "bg-slate-100 border-transparent shadow-sm"
                          : "bg-transparent border-transparent hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md ${
                        isSelected ? "bg-gradient-to-tr from-blue-500 to-indigo-600" : "bg-gradient-to-tr from-sky-400 to-blue-500"
                      }`}>
                        {String.fromCharCode(65 + (parseInt(thread.id.substring(0, 8), 16) % 26))}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-bold text-xs truncate pr-2 ${isActive ? "text-white" : "text-slate-900"}`}>
                            {thread.snippet ? thread.snippet.substring(0, 30) + "..." : "Thread " + thread.id.substring(0, 6)}
                          </span>
                          <div className="flex space-x-1 items-center flex-shrink-0">
                            {/* Priority Label */}
                            {priority === "urgent" && (
                              <span className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${isActive ? "bg-rose-500 border-rose-400 text-white" : "bg-rose-100 border-rose-200 text-rose-600"}`}>Urgent</span>
                            )}
                            {priority === "high" && (
                              <span className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${isActive ? "bg-amber-400 border-amber-300 text-amber-900" : "bg-amber-100 border-amber-200 text-amber-600"}`}>High</span>
                            )}
                            {priority === "normal" && (
                              <span className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${isActive ? "bg-slate-500 border-slate-400 text-white" : "bg-slate-100 border-slate-200 text-slate-500"}`}>Normal</span>
                            )}
                            {priority === "low" && (
                              <span className={`px-1.5 py-0.5 rounded flex items-center text-[9px] font-bold uppercase tracking-wider shadow-sm border ${isActive ? "bg-forest-600 border-forest-500 text-white" : "bg-forest-50 border-forest-200 text-forest-500"}`}>Low</span>
                            )}
                            {isStarred && (
                              <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400 drop-shadow-md" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            )}
                            <button
                              title="Toggle Read Later"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReadLaterMutation.mutate({ threadId: thread.id, isReadLater: activeFolder !== "readLater" });
                              }}
                              className={`p-0.5 rounded transition-all opacity-0 group-hover:opacity-100 ${isActive ? "text-slate-300 hover:text-white hover:bg-slate-700" : "text-slate-400 hover:text-forest-600 hover:bg-forest-50"}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </button>
                          </div>
                        </div>
                        <p className={`text-xs line-clamp-2 leading-relaxed ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                          {thread.snippet || "(No content)"}
                        </p>
                        {/* Category chip */}
                        {category && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              category === "work" || category === "meeting" || category === "needs_reply"
                                ? isActive ? "bg-purple-500/30 text-purple-200" : "bg-purple-50 text-purple-600 border border-purple-100"
                                : category === "newsletter" || category === "social"
                                  ? isActive ? "bg-blue-500/30 text-blue-200" : "bg-blue-50 text-blue-600 border border-blue-100"
                                  : category === "personal" || category === "receipt"
                                    ? isActive ? "bg-amber-500/30 text-amber-200" : "bg-amber-50 text-amber-600 border border-amber-100"
                                    : isActive ? "bg-slate-500/30 text-slate-200" : "bg-slate-50 text-slate-500 border border-slate-100"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                category === "work" || category === "meeting" || category === "needs_reply" ? "bg-purple-500"
                                : category === "newsletter" || category === "social" ? "bg-blue-500"
                                : category === "personal" || category === "receipt" ? "bg-amber-500"
                                : "bg-slate-400"
                              }`} />
                              {category.replace("_", " ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isFetchingNextPage && (
                <div className="p-4 text-center text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
                  <div className="w-3 h-3 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  Loading more...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Thread Detail / Main Workspace View */}
        <div className="flex-1 h-full bg-transparent overflow-y-auto p-6 flex flex-col items-center min-w-0">
          {activeThread ? (
            <div className="space-y-6 w-full max-w-3xl">
              {/* Toolbar */}
              <div className="flex items-center justify-between bg-white border border-forest-900/10 px-4 py-2 rounded-xl sticky top-0 z-20 shadow-sm">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleArchive(activeThread)}
                    className="group px-3 py-1.5 hover:bg-white text-forest-500 hover:text-forest-900 rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span className="hidden lg:inline text-xs font-medium">Archive</span>
                    <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-wheat-500 transition-colors">E</kbd>
                  </button>
                  <button
                    onClick={() => handleDelete(activeThread)}
                    className="group px-3 py-1.5 hover:bg-white text-forest-500 hover:text-rose-600 rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden lg:inline text-xs font-medium">Delete</span>
                    <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-rose-400 transition-colors">#</kbd>
                  </button>
                  <button
                    onClick={() => handleToggleStar(activeThread)}
                    className={`group px-3 py-1.5 hover:bg-white rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm ${isThreadStarred(activeThread) ? "text-amber-500" : "text-forest-500 hover:text-amber-500"}`}
                  >
                    <svg className="w-4 h-4" fill={isThreadStarred(activeThread) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="hidden lg:inline text-xs font-medium">Star</span>
                    <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-amber-400 transition-colors">S</kbd>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleOpenReply}
                    className="group px-4 py-2 bg-forest-900 hover:bg-forest-800 text-cream-100 text-xs font-bold rounded-lg transition-all shadow-md flex items-center space-x-2"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>Reply</span>
                    <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-950/20 text-forest-950 px-1.5 py-0.5 rounded border border-forest-950/20">R</kbd>
                  </button>
                </div>
              </div>

              {/* Thread Content */}
              {/* Thread Content Header */}
              <div className="bg-white border border-forest-900/10 p-6 rounded-2xl shadow-sm mb-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-full">
                    <div className="flex justify-between items-start">
                      <h2 className="text-xl font-bold text-slate-900 mb-2">{activeThread.snippet || "New Message"}</h2>
                      {/* Unsubscribe Button for Newsletters */}
                      {(activeInsight?.category === "newsletter" || activeInsight?.category === "promotional") && (
                        <button
                          onClick={() => setShowUnsubscribeConfirm(true)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 whitespace-nowrap"
                        >
                          <span>🔕 Unsubscribe & Clean Up</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {String.fromCharCode(65 + (parseInt(activeThread.id.substring(0, 8), 16) % 26))}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Sender Name <span className="text-xs font-normal text-slate-500">&lt;sender@example.com&gt;</span></p>
                          <p className="text-xs text-slate-500">To: me</p>
                        </div>
                      </div>

                      {/* Summarize Thread Button */}
                      {threadDetails?.messages && threadDetails.messages.length > 2 && !threadSummary[activeThread.id] && (
                        <button
                          onClick={() => summarizeMutation.mutate({ threadId: activeThread.id })}
                          disabled={summarizeMutation.isPending}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center space-x-1"
                        >
                          {summarizeMutation.isPending ? (
                            <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block"></span>
                          ) : (
                            <span>✨ Summarize Thread</span>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Summary Display Box */}
                    {threadSummary[activeThread.id] && (
                      <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2 flex items-center">
                          <span>✨ AI Summary</span>
                        </h4>
                        <div className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
                          {threadSummary[activeThread.id]}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Smart Replies */}
                {smartRepliesData?.intents && smartRepliesData.intents.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2 items-center">
                    <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
                      <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      Smart Reply:
                    </span>
                    {smartRepliesData.intents.map((intent, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const prompt = `Draft a reply intent: ${intent}`;
                          smartReplyDraftMutation.mutate({ prompt, context: activeThread.snippet });
                        }}
                        disabled={smartReplyDraftMutation.isPending}
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-full border border-sky-200 transition-colors"
                      >
                        {intent}
                      </button>
                    ))}
                    {smartReplyDraftMutation.isPending && (
                       <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin inline-block ml-2"></span>
                    )}
                  </div>
                )}
              </div>

              {/* Messages details */}
              {isLoadingDetails ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-600 font-medium uppercase tracking-widest px-2 animate-pulse">
                    Loading Messages...
                  </h3>
                  <div className="bg-forest-800/40 border border-forest-700/80 p-8 rounded-xl flex justify-center">
                    <span className="w-6 h-6 border-2 border-wheat-500 border-t-transparent rounded-full animate-spin"></span>
                  </div>
                </div>
              ) : threadDetails?.messages && threadDetails.messages.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-forest-500 uppercase tracking-widest px-2">
                    Messages ({threadDetails.messages.length})
                  </h3>
                  <div className="space-y-3">
                    {threadDetails.messages.map((message: any, idx: number) => {
                      const bodyText = getMessageBody(message.payload);
                      const isHtml = bodyText.includes("<html") || bodyText.includes("<body") || bodyText.includes("<div") || bodyText.includes("<p>") || bodyText.includes("<table") || bodyText.includes("<!DOCTYPE");
                      
                      // Alternate messages left and right to look like a chat bubble flow
                      const isMe = idx % 2 !== 0; 

                      return (
                        <div key={message.id} className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs mt-auto mb-1 mr-3 shadow-sm">
                              {String.fromCharCode(65 + (parseInt(activeThread.id.substring(0, 8), 16) % 26))}
                            </div>
                          )}
                          <div className={`max-w-full lg:max-w-[85%] rounded-2xl p-5 shadow-lg border relative min-w-0 overflow-hidden ${
                            isMe 
                              ? "bg-blue-600 text-white border-transparent rounded-br-sm ml-8 shadow-sm" 
                              : "bg-slate-100 border-transparent rounded-bl-sm mr-8 text-slate-900 shadow-sm"
                          }`}>
                            <div className={`flex justify-between items-center text-[9px] font-semibold mb-3 pb-2 border-b ${isMe ? "text-forest-300 border-forest-800" : "text-forest-400 border-forest-100"}`}>
                              <span className="font-mono opacity-60">ID: {message.id.substring(0,8)}</span>
                              <span>{new Date(parseInt(message.internalDate)).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                              })}</span>
                            </div>
                            {isHtml ? (
                              <ShadowEmail
                                className={`text-sm leading-relaxed overflow-x-auto max-w-full ${isMe ? "text-cream-100" : "text-forest-900"}`}
                                html={bodyText}
                              />
                            ) : (
                              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe ? "text-cream-100" : "text-forest-900"}`}>{bodyText}</p>
                            )}
                          </div>
                          {isMe && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-wheat-500 to-amber-500 flex items-center justify-center text-forest-950 font-bold text-xs mt-auto mb-1 ml-3 shadow-sm">
                              ME
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-forest-400 min-h-[400px]">
              <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-xs font-medium">Select a thread or compose a new email</p>
              <p className="text-[10px] text-forest-400 mt-1">Use J / K to navigate, Enter to open</p>
            </div>
          )}
        </div>

        {/* Sidebar: AI Insights & Calendar */}
        <div className="hidden xl:flex w-[260px] 2xl:w-[300px] h-full flex-col flex-shrink-0 border-l border-forest-900/10 bg-slate-50 p-6 overflow-y-auto space-y-6 z-10">
          
          {/* Read Later Weekly Digest */}
          {activeFolder === "readLater" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-forest-700/80">
                <h3 className="font-extrabold text-xs tracking-wider uppercase text-forest-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span>Weekly Digest</span>
                </h3>
                <button
                  onClick={() => digestMutation.mutate()}
                  disabled={digestMutation.isPending}
                  className="text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                >
                  {digestMutation.isPending ? "Generating..." : "Generate"}
                </button>
              </div>
              
              <div className="p-4 bg-white/80 border border-indigo-100 rounded-xl space-y-3 shadow-sm">
                <div className="text-sm text-indigo-900 leading-relaxed whitespace-pre-wrap">
                  {weeklyDigest || "Click Generate to create a summary of your Read Later queue."}
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Panel */}
          {activeInsight && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-forest-700/80">
                <h3 className="font-extrabold text-xs tracking-wider uppercase text-forest-600 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>AI Insight</span>
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  activeInsight.priority === 'urgent' ? 'bg-danger-light text-danger border-rose-500/30' :
                  activeInsight.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-forest-700 text-cream-200 border-forest-600'
                }`}>
                  {activeInsight.priority}
                </span>
              </div>
              
              <div className="p-4 bg-white/80 border border-forest-900/10 rounded-xl space-y-3 shadow-sm">
                <p className="text-sm font-semibold text-forest-900 leading-snug">{activeInsight.summary}</p>
                <div className="bg-forest-50 py-3 rounded-lg border border-forest-900/10">
                  <p className="text-xs text-forest-600 italic">"{activeInsight.reason}"</p>
                </div>
                
                {activeInsight.suggestedAction === "schedule" && (
                  <button
                    onClick={handleOpenPeekModal}
                    disabled={scheduleMutation.isPending}
                    className="w-full mt-2 py-2 bg-wheat-500 hover:bg-wheat-400 text-xs font-bold text-cream-100 rounded-lg transition-all shadow-lg shadow-wheat-500/20 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{scheduleMutation.isPending ? "Scheduling..." : "Schedule + Reply"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

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
                  onClick={handleToggleCalendar}
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
                {upcomingEvents.slice(0, 2).map((event: any) => {
                  const startStr = event.start?.dateTime || event.start?.date;
                  const endStr = event.end?.dateTime || event.end?.date;
                  const start = new Date(startStr);
                  const isToday = start.toDateString() === new Date().toDateString();
                  const dateLabel = isToday ? "Today" : start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
                  const startTime = startStr ? new Date(startStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "All Day";
                  const endTime = endStr ? new Date(endStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                  return (
                    <div key={event.id} className="py-3 bg-white border border-forest-900/10 rounded-xl hover:border-forest-900/20 shadow-sm transition-all space-y-1 relative overflow-hidden group hover:bg-white/60 cursor-pointer">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-forest-500 rounded-l-xl"></div>
                      <div className="flex justify-between items-start ml-1">
                        <h4 className="font-bold text-[11px] text-forest-900 line-clamp-1">{event.summary || "(No Title)"}</h4>
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
      </div>

      {/* MODAL: Compose */}
      {isComposeOpen && (
        <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
          <div className="bg-[#F5F6F8] border border-forest-900/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-forest-900">Compose New Email</h3>
              <button
                onClick={() => setIsComposeOpen(false)}
                className="text-slate-600 font-medium hover:text-cream-100 transition-all text-xs"
              >
                x Close
              </button>
            </div>

            <form onSubmit={handleSendCompose} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                  placeholder="recipient@example.com"
                  className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  required
                  placeholder="Subject details"
                  className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600">Message Body</label>
                  <button
                    type="button"
                    onClick={() => setIsComposeAiOpen(!isComposeAiOpen)}
                    className="flex items-center space-x-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <span>✨ Draft with AI</span>
                  </button>
                </div>
                {isComposeAiOpen && (
                  <div className="mb-2 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                    <input
                      type="text"
                      value={composeAiPrompt}
                      onChange={(e) => setComposeAiPrompt(e.target.value)}
                      placeholder="What should the AI write?"
                      className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      disabled={composeDraftMutation.isPending || !composeAiPrompt}
                      onClick={() => composeDraftMutation.mutate({ prompt: composeAiPrompt })}
                      className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {composeDraftMutation.isPending ? "Generating..." : "Generate Draft"}
                    </button>
                  </div>
                )}
                <textarea
                  rows={6}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  required
                  placeholder="Write your email here..."
                  className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner resize-none"
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => composePolishMutation.mutate({ text: composeBody, tone: "professional" })}
                    disabled={!composeBody || composePolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    👔 Professional
                  </button>
                  <button
                    type="button"
                    onClick={() => composePolishMutation.mutate({ text: composeBody, tone: "shorter" })}
                    disabled={!composeBody || composePolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    ✂️ Shorter
                  </button>
                  <button
                    type="button"
                    onClick={() => composePolishMutation.mutate({ text: composeBody, tone: "grammar" })}
                    disabled={!composeBody || composePolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    📝 Fix Grammar
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsComposeOpen(false)}
                  className="px-4 py-2 bg-forest-700 hover:bg-forest-600 text-xs font-semibold rounded-xl text-cream-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-blue-500/20"
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
        <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
          <div className="bg-[#F5F6F8] border border-forest-900/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-forest-900">
                Reply to Thread #{activeThread.id.substring(0, 8)}
              </h3>
              <button
                onClick={() => setIsReplyOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold"
              >
                x Close
              </button>
            </div>

            <form onSubmit={handleSendReply} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">Subject</label>
                <div className="w-full bg-forest-950/50 border border-forest-700 rounded-xl px-3 py-2 text-xs text-slate-600 font-medium">
                  Re: {activeThread.snippet.substring(0, 50)}...
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600">Your Reply</label>
                  <button
                    type="button"
                    onClick={() => setIsReplyAiOpen(!isReplyAiOpen)}
                    className="flex items-center space-x-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
                  >
                    <span>✨ Draft with AI</span>
                  </button>
                </div>
                {isReplyAiOpen && (
                  <div className="mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                    <input
                      type="text"
                      value={replyAiPrompt}
                      onChange={(e) => setReplyAiPrompt(e.target.value)}
                      placeholder="What should the AI write?"
                      className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      disabled={replyDraftMutation.isPending || !replyAiPrompt}
                      onClick={() => replyDraftMutation.mutate({ 
                        prompt: replyAiPrompt,
                        context: activeThread.snippet
                      })}
                      className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                    >
                      {replyDraftMutation.isPending ? "Generating..." : "Generate Reply"}
                    </button>
                  </div>
                )}
                <textarea
                  rows={6}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  required
                  placeholder="Write reply here..."
                  className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner resize-none"
                />
                <div className="flex space-x-2 mt-2">
                  <button
                    type="button"
                    onClick={() => replyPolishMutation.mutate({ text: replyBody, tone: "professional" })}
                    disabled={!replyBody || replyPolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    👔 Professional
                  </button>
                  <button
                    type="button"
                    onClick={() => replyPolishMutation.mutate({ text: replyBody, tone: "shorter" })}
                    disabled={!replyBody || replyPolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    ✂️ Shorter
                  </button>
                  <button
                    type="button"
                    onClick={() => replyPolishMutation.mutate({ text: replyBody, tone: "grammar" })}
                    disabled={!replyBody || replyPolishMutation.isPending}
                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
                  >
                    📝 Fix Grammar
                  </button>
                </div>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <span>{"\u2328\uFE0F"} Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowCheatsheet(false)}
                className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold"
              >
                x Close
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Archive Selected Thread</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">e</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Reply to Thread</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">r</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Compose New Email</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">c</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Delete / Trash Selected Thread</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">#</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Toggle Star Status</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">s</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Select Next Thread</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">j</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Select Previous Thread</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">k</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Go to Inbox Page</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">gi</kbd>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                <span className="text-slate-600 font-medium">Go to Calendar Page</span>
                <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">gc</kbd>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setShowCheatsheet(false)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-blue-500/20"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <CommandPalette 
        isOpen={isCommandOpen} 
        setIsOpen={setIsCommandOpen} 
        hasActiveThread={!!activeThread}
        onArchive={() => handleArchive(activeThread)}
        onReply={() => handleOpenReply()}
        onSchedule={() => {
          if (activeInsight?.suggestedAction === 'schedule') {
             handleScheduleFromInsight();
          } else {
             showToast("AI doesn't suggest scheduling for this thread.", "info");
          }
        }}
        onDelete={() => handleDelete(activeThread)}
      />
      
      {/* Peek Calendar Modal */}
      <PeekCalendarModal 
        isOpen={showPeekModal} 
        onClose={() => setShowPeekModal(false)} 
        onConfirm={handleConfirmPeekSchedule} 
      />

      {/* Unsubscribe Confirmation Modal */}
      {showUnsubscribeConfirm && activeThread && (
        <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-forest-900/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 flex items-center space-x-1.5">
                <span>🔕 Confirm Unsubscribe</span>
              </h3>
              <button
                onClick={() => setShowUnsubscribeConfirm(false)}
                className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold"
              >
                x Close
              </button>
            </div>
            
            <p className="text-sm text-slate-700">
              Are you sure you want to unsubscribe from this sender?
            </p>

            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
              <input 
                type="checkbox" 
                id="cleanupCheckbox" 
                defaultChecked 
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <label htmlFor="cleanupCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                Also move all past emails from this sender to the Trash
              </label>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setShowUnsubscribeConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700"
              >
                Cancel
              </button>
              <button
                disabled={unsubscribeMutation.isPending}
                onClick={() => {
                  const cleanup = (document.getElementById('cleanupCheckbox') as HTMLInputElement)?.checked ?? true;
                  unsubscribeMutation.mutate({ threadId: activeThread.id, cleanUp: cleanup });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-rose-500/20"
              >
                {unsubscribeMutation.isPending ? "Processing..." : "Unsubscribe Now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
}
