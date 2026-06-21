
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { SettingsModal } from "@/app/_components/settings-modal";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useKeyboard } from "@/hooks/useKeyboard";
import { authClient } from "@/server/better-auth/client";
import { CommandPalette } from "@/app/_components/CommandPalette";
import { PeekCalendarModal } from "@/app/_components/PeekCalendarModal";
import { ComposeModal } from "./_components/ComposeModal";
import { ReplyModal } from "./_components/ReplyModal";
import { NavigationSidebar } from "./_components/NavigationSidebar";
import { ThreadList } from "./_components/ThreadList";
import { ThreadDetail } from "./_components/ThreadDetail";
import { InboxSidebar } from "./_components/InboxSidebar";
import type { Thread } from "./_utils/email";
import type { GmailPayload } from "./_utils/email";

export default function InboxPage() {
  const router = useRouter();

  // ─── Auth ───────────────────────────────────────────────────────────────────
  const { data: session } = authClient.useSession();

  // ─── Seed ───────────────────────────────────────────────────────────────────
  const [seeded, setSeeded] = useState(false);
  const seedMutation = api.connect.seedFromBetterAuth.useMutation({
    onSuccess: () => { console.log("Seeding and webhook registration completed."); setSeeded(true); },
    onError: (err) => { console.error("Seeding/webhook registration failed:", err); setSeeded(true); },
  });
  useEffect(() => {
    if (session?.user?.id && !seeded && !seedMutation.isPending) seedMutation.mutate();
  }, [session?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Connection Status ───────────────────────────────────────────────────────
  const { data: status } = api.email.getConnectionStatus.useQuery(undefined, { enabled: seeded });
  const gmailConnected = !!status?.gmail?.connected;
  const calendarConnected = !!status?.googlecalendar?.connected;

  // ─── Folder / Category State ─────────────────────────────────────────────────
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
    if (activeFolder === "archive") return "-in:inbox -in:trash";
    return undefined;
  }, [activeFolder]);

  // ─── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.email.threads.useInfiniteQuery(
      { labelIds: queryLabelIds, q: queryQ },
      { getNextPageParam: (lastPage) => lastPage.nextCursor, refetchOnWindowFocus: false, enabled: seeded && activeFolder !== "readLater" }
    );

  const { data: readLaterData, refetch: refetchReadLater } = api.email.getReadLaterThreads.useQuery(undefined, {
    enabled: seeded && activeFolder === "readLater",
  });

  const { data: calendarData, refetch: refetchCalendar } = api.email.calendarEvents.useQuery({}, {
    refetchOnWindowFocus: false, refetchInterval: 30000, enabled: seeded && calendarConnected,
  });

  const threads: Thread[] = useMemo(() => {
    if (activeFolder === "readLater") return (readLaterData?.threads as unknown as Thread[]) ?? [];
    if (!data) return [];
    return data.pages.flatMap((page) => page.threads as unknown as Thread[]);
  }, [data, readLaterData, activeFolder]);

  const threadIds = useMemo(() => threads.map((t) => t.id), [threads]);
  const { data: insights, refetch: refetchInsights } = api.insights.getInsightsBatch.useQuery(
    { threadIds },
    { enabled: threadIds.length > 0 }
  );

  // ─── Selected Thread ─────────────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);

  const categoryMap: Record<string, string> = {
    work: "work", needs_reply: "work", meeting: "events",
    newsletter: "social", social: "social",
    personal: "personal", receipt: "personal", other: "other",
  };

  const filteredThreads = useMemo(() => {
    if (!activeCategory) return threads;
    return threads.filter((thread) => {
      const insight = insights?.find((i: { threadId: string }) => i.threadId === thread.id);
      if (!insight) return false;
      const mapped = categoryMap[(insight as { category: string }).category] ?? "other";
      return mapped === activeCategory;
    });
  }, [threads, activeCategory, insights]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeInsight = insights?.find((i: { threadId: string }) => i.threadId === activeThread?.id);

  useEffect(() => {
    if (filteredThreads.length > 0) {
      if (!activeThread || !filteredThreads.some((t) => t.id === activeThread.id)) {
        setActiveThread(filteredThreads[0] ?? null);
        setSelectedIndex(0);
      }
    } else {
      setActiveThread(null);
    }
  }, [filteredThreads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Thread Details & Smart Replies ─────────────────────────────────────────
  const { data: threadDetails, isLoading: isLoadingDetails } = api.email.threadDetails.useQuery(
    { threadId: activeThread?.id ?? "" },
    { enabled: seeded && !!activeThread?.id, refetchOnWindowFocus: false }
  );

  const { data: smartRepliesData } = api.agent.generateSmartReplies.useQuery(
    { context: activeThread?.snippet ?? "" },
    { enabled: !!activeThread?.snippet && activeFolder !== "readLater", staleTime: Infinity }
  );

  // ─── Insight generation for new threads ─────────────────────────────────────
  const generateMutation = api.insights.generateMissingInsights.useMutation({
    onSuccess: (res) => { if (res.generated > 0) void refetchInsights(); },
  });
  const generationTriggered = useRef<string>("");
  useEffect(() => {
    if (!insights || !threads.length) return;
    const existingIds = new Set(insights.map((i: { threadId: string }) => i.threadId));
    const missing = threads.filter((t) => !existingIds.has(t.id) && t.snippet);
    if (missing.length === 0) return;
    const key = missing.map((m) => m.id).sort().join(",");
    if (generationTriggered.current === key) return;
    generationTriggered.current = key;
    generateMutation.mutate({ threadMeta: missing.map((t) => ({ threadId: t.id, snippet: t.snippet || undefined })) });
  }, [insights, threads]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Calendar Events ─────────────────────────────────────────────────────────
  const upcomingEvents = useMemo(() => {
    if (!calendarData?.items) return [];
    const now = new Date();
    return [...(calendarData.items as { id: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }; summary?: string; location?: string }[])]
      .filter((e) => new Date(e.start?.dateTime ?? e.start?.date ?? 0) >= now)
      .sort((a, b) =>
        new Date(a.start?.dateTime ?? a.start?.date ?? 0).getTime() -
        new Date(b.start?.dateTime ?? b.start?.date ?? 0).getTime()
      );
  }, [calendarData]);

  // ─── SSE Real-time updates ────────────────────────────────────────────────────
  useEffect(() => {
    const es = new EventSource("/api/sse");
    es.onmessage = (event) => {
      if (event.data === "refresh") {
        void refetch();
        if (calendarConnected) void refetchCalendar();
        showToast("New updates received!", "info");
      }
    };
    es.onerror = () => console.warn("SSE connection lost. Reconnecting...");
    return () => es.close();
  }, [refetch, refetchCalendar, calendarConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Toast ───────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─── Modal States ─────────────────────────────────────────────────────────────
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

  const [showCheatsheet, setShowCheatsheet] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showPeekModal, setShowPeekModal] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnsubscribeConfirm, setShowUnsubscribeConfirm] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState<string | null>(null);
  const [threadSummary, setThreadSummary] = useState<Record<string, string>>({});

  // ─── Mutations ────────────────────────────────────────────────────────────────
  const archiveMutation = api.email.archive.useMutation({
    onSuccess: () => { showToast("Email archived successfully", "success"); void refetch(); },
    onError: (err) => showToast(`Failed to archive: ${err.message}`, "error"),
  });
  const deleteMutation = api.email.delete.useMutation({
    onSuccess: () => { showToast("Email moved to trash", "success"); void refetch(); },
    onError: (err) => showToast(`Failed to delete: ${err.message}`, "error"),
  });
  const toggleStarMutation = api.email.toggleStar.useMutation({
    onSuccess: () => { showToast("Star status updated", "success"); void refetch(); },
    onError: (err) => showToast(`Failed to toggle star: ${err.message}`, "error"),
  });
  const replyMutation = api.email.reply.useMutation({
    onSuccess: () => { showToast("Reply sent successfully", "success"); setIsReplyOpen(false); setReplyBody(""); void refetch(); },
    onError: (err) => showToast(`Failed to send reply: ${err.message}`, "error"),
  });
  const sendMutation = api.email.send.useMutation({
    onSuccess: () => { showToast("Email sent successfully", "success"); setIsComposeOpen(false); setComposeTo(""); setComposeSubject(""); setComposeBody(""); void refetch(); },
    onError: (err) => showToast(`Failed to send: ${err.message}`, "error"),
  });
  const summarizeMutation = api.email.summarizeThread.useMutation({
    onSuccess: (res, variables) => { setThreadSummary((prev) => ({ ...prev, [variables.threadId]: res.summary })); showToast("Thread summarized!", "success"); },
    onError: (err) => showToast(`Failed to summarize: ${err.message}`, "error"),
  });
  const unsubscribeMutation = api.email.unsubscribeAndClean.useMutation({
    onSuccess: (res) => {
      if (res.listUnsubscribeFound) showToast(`Unsubscribed! Cleaned up ${res.deletedCount} past emails.`, "success");
      else showToast(`No unsubscribe link found. Cleaned up ${res.deletedCount} past emails.`, "info");
      setShowUnsubscribeConfirm(false);
      void refetch();
    },
    onError: (err) => showToast(`Failed to unsubscribe: ${err.message}`, "error"),
  });
  const toggleReadLaterMutation = api.email.toggleReadLater.useMutation({
    onSuccess: (_data, variables) => {
      showToast(variables.isReadLater ? "Added to Read Later" : "Removed from Read Later", "success");
      void refetchReadLater();
    },
    onError: (err) => showToast(`Failed: ${err.message}`, "error"),
  });
  const digestMutation = api.email.generateReadLaterDigest.useMutation({
    onSuccess: (res) => setWeeklyDigest(res.digest),
    onError: (err) => showToast(`Failed to generate digest: ${err.message}`, "error"),
  });
  const scheduleMutation = api.workflow.scheduleFromEmail.useMutation({
    onSuccess: () => { showToast("Meeting scheduled & reply sent", "success"); void refetch(); if (calendarConnected) void refetchCalendar(); },
    onError: (err) => showToast(`Failed to schedule: ${err.message}`, "error"),
  });
  const smartReplyDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => { setReplyBody(res.draft); setIsReplyOpen(true); showToast("Draft generated!", "success"); },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error"),
  });
  const composeDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => { setComposeBody(res.draft); setIsComposeAiOpen(false); setComposeAiPrompt(""); showToast("Draft generated!", "success"); },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error"),
  });
  const replyDraftMutation = api.agent.generateDraft.useMutation({
    onSuccess: (res) => { setReplyBody(res.draft); setIsReplyAiOpen(false); setReplyAiPrompt(""); showToast("Draft generated!", "success"); },
    onError: (err) => showToast(`Failed to generate draft: ${err.message}`, "error"),
  });
  const composePolishMutation = api.agent.polishTone.useMutation({
    onSuccess: (res) => { setComposeBody(res.polished); showToast("Tone polished!", "success"); },
    onError: (err) => showToast(`Failed to polish tone: ${err.message}`, "error"),
  });
  const replyPolishMutation = api.agent.polishTone.useMutation({
    onSuccess: (res) => { setReplyBody(res.polished); showToast("Tone polished!", "success"); },
    onError: (err) => showToast(`Failed to polish tone: ${err.message}`, "error"),
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleArchive = (thread: Thread | null) => { if (!thread) return; archiveMutation.mutate({ threadId: thread.id }); };
  const handleDelete = (thread: Thread | null) => { if (!thread) return; deleteMutation.mutate({ threadId: thread.id }); };

  const isThreadStarred = (thread: Thread | null) => {
    if (!thread) return false;
    const messages = thread.id === activeThread?.id && threadDetails?.messages ? threadDetails.messages : thread.messages;
    return (messages as Array<{ labelIds?: string[] }> | undefined)?.some((m) => m.labelIds?.includes("STARRED")) ?? false;
  };

  const handleToggleStar = (thread: Thread | null) => {
    if (!thread) return;
    toggleStarMutation.mutate({ threadId: thread.id, starred: !isThreadStarred(thread) });
  };

  const handleSelectThread = (thread: Thread, index: number) => { setSelectedIndex(index); setActiveThread(thread); };
  const handleSelectNext = () => {
    const nextIdx = Math.min(selectedIndex + 1, filteredThreads.length - 1);
    setSelectedIndex(nextIdx);
    setActiveThread(filteredThreads[nextIdx] ?? null);
  };
  const handleSelectPrev = () => {
    const prevIdx = Math.max(selectedIndex - 1, 0);
    setSelectedIndex(prevIdx);
    setActiveThread(filteredThreads[prevIdx] ?? null);
  };
  const handleCategorySelect = (category: string | null) => {
    setActiveCategory(category);
    if (category) setActiveFolder("inbox");
    setSelectedIndex(0);
  };
  const handleSelectFolder = (folder: string) => { handleCategorySelect(null); setActiveFolder(folder); };
  const handleOpenReply = () => { if (!activeThread) { showToast("No active email to reply to", "error"); return; } setIsReplyOpen(true); };
  const handleOpenPeekModal = () => { if (!activeThread || !activeInsight) return; setShowPeekModal(true); };
  const handleConfirmPeekSchedule = (start: string, end: string) => {
    setShowPeekModal(false);
    if (!activeThread || !activeInsight) return;
    scheduleMutation.mutate({
      threadId: activeThread.id,
      attendeeEmail: (activeInsight as { extractedEmail?: string }).extractedEmail ?? "guest@example.com",
      summary: "Meeting: " + (activeInsight.summary ?? ""),
      start, end,
      replyBody: "I've scheduled a 30-minute meeting based on your request. See the calendar invite for details.",
    });
  };
  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread) return;
    replyMutation.mutate({ threadId: activeThread.id, to: activeSenderEmail, subject: activeThread.snippet.substring(0, 50), body: replyBody });
  };
  const handleSendCompose = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate({ to: composeTo, subject: composeSubject, body: composeBody });
  };
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 100;
    if (bottom && hasNextPage && !isFetchingNextPage) void fetchNextPage();
  };

  // ─── Sender info from active thread ─────────────────────────────────────────
  let activeSenderName = "Unknown Sender";
  let activeSenderEmail = "unknown@example.com";
  let activeSenderInitial = "U";

  if (activeThread && threadDetails?.messages && (threadDetails.messages as Array<{ payload?: GmailPayload }>).length > 0) {
    const firstMsg = (threadDetails.messages as Array<{ payload?: GmailPayload }>)[0];
    if (firstMsg) {
      const headers = firstMsg.payload?.headers ?? [];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from");
      if (fromHeader?.value) {
        const match = fromHeader.value.match(/(.*?)\s*<(.+?)>/);
        if (match?.[2]) {
          activeSenderName = (match[1] ?? "").replace(/"/g, "").trim() || match[2].split("@")[0] || "Unknown";
          activeSenderEmail = match[2];
        } else {
          activeSenderName = fromHeader.value.split("@")[0] ?? "Unknown";
          activeSenderEmail = fromHeader.value;
        }
        activeSenderInitial = activeSenderName.charAt(0).toUpperCase() || "U";
      }
    }
  } else if (activeThread) {
    activeSenderInitial = String.fromCharCode(65 + (parseInt(activeThread.id.substring(0, 8), 16) % 26));
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
  const selectedThread = filteredThreads[selectedIndex] ?? null;
  useKeyboard({
    "e": () => handleArchive(selectedThread),
    "r": () => handleOpenReply(),
    "c": () => setIsComposeOpen(true),
    "#": () => handleDelete(selectedThread),
    "s": () => handleToggleStar(selectedThread),
    "j": () => handleSelectNext(),
    "k": () => handleSelectPrev(),
    "?": () => setShowCheatsheet(true),
    "gi": () => router.push("/inbox"),
    "gc": () => router.push("/calendar"),
  });

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen overflow-hidden bg-[#F5F6F8] text-forest-950 flex flex-col font-sans relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 animate-slide-up ${
          toast.type === "success" ? "bg-red-50 text-black border-red-400"
            : toast.type === "error" ? "bg-rose-50 border-rose-500/20 text-rose-600"
            : "bg-white border-forest-900/10 text-forest-900"
        }`}>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white flex-shrink-0 sticky top-0 z-40 px-8 py-3 flex justify-between items-center border-b border-forest-900/5">
        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-bold text-white shadow-md">M</div>
          <span className="font-extrabold tracking-tight text-xl text-forest-950">MailMind</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/agent" id="agent-link" className="flex items-center gap-1.5 px-3 py-1.5 bg-forest-900 hover:bg-forest-800 border border-transparent rounded-xl transition-all text-cream-100 text-xs font-bold shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Agent
          </Link>
          <Link href="/settings" id="settings-link" className="p-2.5 hover:bg-white/50 text-forest-600 hover:text-forest-950 border border-transparent rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          <button onClick={() => setShowCheatsheet(true)} className="p-2.5 hover:bg-white/50 text-forest-600 hover:text-forest-950 border border-transparent rounded-xl transition-all" title="Shortcuts (?)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
          <button
            onClick={() => { void refetch(); if (calendarConnected) void refetchCalendar(); }}
            className="px-4 py-1.5 text-xs font-semibold bg-white border border-forest-900/10 hover:border-forest-900/20 text-forest-800 rounded-xl transition-all shadow-sm"
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10 h-full">
        <NavigationSidebar
          isSidebarOpen={isSidebarOpen}
          activeFolder={activeFolder}
          activeCategory={activeCategory}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onCompose={() => setIsComposeOpen(true)}
          onSelectFolder={handleSelectFolder}
        />

        <ThreadList
          isLoading={isLoading}
          gmailConnected={gmailConnected}
          data={data}
          error={error}
          threads={threads}
          filteredThreads={filteredThreads}
          selectedIndex={selectedIndex}
          activeThread={activeThread}
          activeCategory={activeCategory}
          activeFolder={activeFolder}
          insights={insights as Array<{ threadId: string; priority?: string; category?: string }> | undefined}
          isFetchingNextPage={isFetchingNextPage}
          isThreadStarred={isThreadStarred}
          onScroll={handleScroll}
          onSelectThread={handleSelectThread}
          onCategorySelect={handleCategorySelect}
          onConnectGmail={() => { window.location.href = "/api/connect?plugin=gmail"; }}
          onToggleReadLater={(threadId, isReadLater) => toggleReadLaterMutation.mutate({ threadId, isReadLater })}
        />

        <ThreadDetail
          activeThread={activeThread}
          threadDetails={threadDetails}
          isLoadingDetails={isLoadingDetails}
          smartRepliesData={smartRepliesData}
          activeInsight={activeInsight as { threadId: string; summary?: string; reason?: string; priority?: string; category?: string; suggestedAction?: string } | undefined}
          threadSummary={threadSummary}
          activeSenderName={activeSenderName}
          activeSenderEmail={activeSenderEmail}
          activeSenderInitial={activeSenderInitial}
          summarizeIsPending={summarizeMutation.isPending}
          smartReplyDraftIsPending={smartReplyDraftMutation.isPending}
          isThreadStarred={isThreadStarred}
          onArchive={() => handleArchive(activeThread)}
          onDelete={() => handleDelete(activeThread)}
          onToggleStar={() => handleToggleStar(activeThread)}
          onOpenReply={handleOpenReply}
          onSummarize={() => activeThread && summarizeMutation.mutate({ threadId: activeThread.id })}
          onSmartReply={(intent) => smartReplyDraftMutation.mutate({ prompt: `Draft a reply intent: ${intent}`, context: activeThread?.snippet ?? "" })}
          onSetShowUnsubscribeConfirm={setShowUnsubscribeConfirm}
        />

        <InboxSidebar
          activeFolder={activeFolder}
          weeklyDigest={weeklyDigest}
          activeInsight={activeInsight as { threadId: string; summary?: string; reason?: string; priority?: string; suggestedAction?: string } | undefined}
          digestMutation={{ isPending: digestMutation.isPending, mutate: () => digestMutation.mutate() }}
          scheduleMutation={{ isPending: scheduleMutation.isPending }}
          calendarConnected={calendarConnected}
          upcomingEvents={upcomingEvents}
          onOpenPeekModal={handleOpenPeekModal}
          onConnectCalendar={() => { window.location.href = "/api/connect?plugin=googlecalendar"; }}
        />
      </div>

      {/* Modals */}
      <ComposeModal
        isOpen={isComposeOpen}
        to={composeTo} subject={composeSubject} body={composeBody}
        aiOpen={isComposeAiOpen} aiPrompt={composeAiPrompt}
        isSending={sendMutation.isPending} isDraftPending={composeDraftMutation.isPending} isPolishPending={composePolishMutation.isPending}
        onClose={() => setIsComposeOpen(false)} onSubmit={handleSendCompose}
        onToChange={setComposeTo} onSubjectChange={setComposeSubject} onBodyChange={setComposeBody}
        onAiOpenChange={setIsComposeAiOpen} onAiPromptChange={setComposeAiPrompt}
        onGenerateDraft={() => composeDraftMutation.mutate({ prompt: composeAiPrompt })}
        onPolish={(tone) => composePolishMutation.mutate({ text: composeBody, tone })}
      />

      {activeThread && (
        <ReplyModal
          isOpen={isReplyOpen} threadId={activeThread.id} threadSnippet={activeThread.snippet}
          body={replyBody} aiOpen={isReplyAiOpen} aiPrompt={replyAiPrompt}
          isSending={replyMutation.isPending} isDraftPending={replyDraftMutation.isPending} isPolishPending={replyPolishMutation.isPending}
          onClose={() => setIsReplyOpen(false)} onSubmit={handleSendReply} onBodyChange={setReplyBody}
          onAiOpenChange={setIsReplyAiOpen} onAiPromptChange={setReplyAiPrompt}
          onGenerateDraft={() => replyDraftMutation.mutate({ prompt: replyAiPrompt, context: activeThread.snippet })}
          onPolish={(tone) => replyPolishMutation.mutate({ text: replyBody, tone })}
        />
      )}

      {/* Keyboard Cheatsheet Modal */}
      {showCheatsheet && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                <span>⌨️ Keyboard Shortcuts</span>
              </h3>
              <button onClick={() => setShowCheatsheet(false)} className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold">x Close</button>
            </div>
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {[
                ["Archive Selected Thread", "e"], ["Reply to Thread", "r"], ["Compose New Email", "c"],
                ["Delete / Trash Selected Thread", "#"], ["Toggle Star Status", "s"],
                ["Select Next Thread", "j"], ["Select Previous Thread", "k"],
                ["Go to Inbox Page", "gi"], ["Go to Calendar Page", "gc"],
              ].map(([label, key]) => (
                <div key={key} className="flex justify-between items-center py-1 border-b border-slate-50 text-xs">
                  <span className="text-slate-600 font-medium">{label}</span>
                  <kbd className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono font-bold shadow-sm">{key}</kbd>
                </div>
              ))}
            </div>
            <button onClick={() => setShowCheatsheet(false)} className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-blue-500/20">Got it</button>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isCommandOpen} setIsOpen={setIsCommandOpen} hasActiveThread={!!activeThread}
        onArchive={() => handleArchive(activeThread)} onReply={() => handleOpenReply()}
        onSchedule={() => {
          if ((activeInsight as { suggestedAction?: string } | undefined)?.suggestedAction === "schedule") handleOpenPeekModal();
          else showToast("AI doesn't suggest scheduling for this thread.", "info");
        }}
        onDelete={() => handleDelete(activeThread)}
      />

      <PeekCalendarModal isOpen={showPeekModal} onClose={() => setShowPeekModal(false)} onConfirm={handleConfirmPeekSchedule} />

      {/* Unsubscribe Confirmation */}
      {showUnsubscribeConfirm && activeThread && (
        <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
          <div className="bg-white border border-forest-900/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-rose-600 flex items-center space-x-1.5"><span>🔕 Confirm Unsubscribe</span></h3>
              <button onClick={() => setShowUnsubscribeConfirm(false)} className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold">x Close</button>
            </div>
            <p className="text-sm text-slate-700">Are you sure you want to unsubscribe from this sender?</p>
            <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
              <input type="checkbox" id="cleanupCheckbox" defaultChecked className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500" />
              <label htmlFor="cleanupCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">Also move all past emails from this sender to the Trash</label>
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button onClick={() => setShowUnsubscribeConfirm(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-semibold rounded-xl text-slate-700">Cancel</button>
              <button
                disabled={unsubscribeMutation.isPending}
                onClick={() => {
                  const cleanup = (document.getElementById("cleanupCheckbox") as HTMLInputElement)?.checked ?? true;
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
