"use client";

import { SafeEmailFrame } from "./SafeEmailFrame";
import { getMessageBody, isHtmlEmail } from "../_utils/email";
import type { Thread } from "../_utils/email";

interface Insight {
  threadId: string;
  summary?: string;
  reason?: string;
  priority?: string;
  category?: string;
  suggestedAction?: string;
  extractedEmail?: string;
}

interface ThreadDetailProps {
  activeThread: Thread | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  threadDetails: any;
  isLoadingDetails: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  smartRepliesData: any;
  activeInsight: Insight | undefined;
  threadSummary: Record<string, string>;
  activeSenderName: string;
  activeSenderEmail: string;
  activeSenderInitial: string;
  summarizeIsPending: boolean;
  smartReplyDraftIsPending: boolean;
  isThreadStarred: (thread: Thread | null) => boolean;
  onArchive: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onOpenReply: () => void;
  onSummarize: () => void;
  onSmartReply: (intent: string) => void;
  onSetShowUnsubscribeConfirm: (show: boolean) => void;
}

export function ThreadDetail({
  activeThread,
  threadDetails,
  isLoadingDetails,
  smartRepliesData,
  activeInsight,
  threadSummary,
  activeSenderName,
  activeSenderEmail,
  activeSenderInitial,
  summarizeIsPending,
  smartReplyDraftIsPending,
  isThreadStarred,
  onArchive,
  onDelete,
  onToggleStar,
  onOpenReply,
  onSummarize,
  onSmartReply,
  onSetShowUnsubscribeConfirm,
}: ThreadDetailProps) {
  if (!activeThread) {
    return (
      <div className="flex-1 h-full bg-transparent overflow-y-auto p-6 flex flex-col items-center min-w-0">
        <div className="h-full flex flex-col items-center justify-center text-forest-400 min-h-[400px]">
          <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <p className="text-xs font-medium">Select a thread or compose a new email</p>
          <p className="text-[10px] text-forest-400 mt-1">Use J / K to navigate, Enter to open</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-transparent overflow-y-auto p-6 flex flex-col items-center min-w-0">
      <div className="space-y-6 w-full max-w-3xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-white border border-forest-900/10 px-4 py-2 rounded-xl sticky top-0 z-20 shadow-sm">
          <div className="flex items-center space-x-2">
            <button
              onClick={onArchive}
              className="group px-3 py-1.5 hover:bg-white text-forest-500 hover:text-forest-900 rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span className="hidden lg:inline text-xs font-medium">Archive</span>
              <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-wheat-500 transition-colors">E</kbd>
            </button>
            <button
              onClick={onDelete}
              className="group px-3 py-1.5 hover:bg-white text-forest-500 hover:text-rose-600 rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span className="hidden lg:inline text-xs font-medium">Delete</span>
              <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-rose-400 transition-colors">#</kbd>
            </button>
            <button
              onClick={onToggleStar}
              className={`group px-3 py-1.5 hover:bg-white rounded-lg transition-all flex items-center space-x-2 border border-transparent hover:border-forest-900/10 shadow-sm ${
                isThreadStarred(activeThread) ? "text-amber-500" : "text-forest-500 hover:text-amber-500"
              }`}
            >
              <svg
                className="w-4 h-4"
                fill={isThreadStarred(activeThread) ? "currentColor" : "none"}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <span className="hidden lg:inline text-xs font-medium">Star</span>
              <kbd className="hidden sm:inline-block text-[9px] font-bold bg-forest-100 px-1.5 py-0.5 rounded border border-forest-200 text-forest-600 group-hover:text-amber-400 transition-colors">S</kbd>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onOpenReply}
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

        {/* Thread header card */}
        <div className="bg-white border border-forest-900/10 p-6 rounded-2xl shadow-sm mb-4">
          <div className="flex justify-between items-start mb-2">
            <div className="w-full">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-slate-900 mb-2">{activeThread.snippet || "New Message"}</h2>
                {(activeInsight?.category === "newsletter" || activeInsight?.category === "promotional") && (
                  <button
                    onClick={() => onSetShowUnsubscribeConfirm(true)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200 transition-colors flex items-center space-x-1 whitespace-nowrap"
                  >
                    <span>🔕 Unsubscribe &amp; Clean Up</span>
                  </button>
                )}
              </div>

              <div className="flex justify-between items-end mt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {activeSenderInitial}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {activeSenderName}{" "}
                      <span className="text-xs font-normal text-slate-500">&lt;{activeSenderEmail}&gt;</span>
                    </p>
                    <p className="text-xs text-slate-500">To: me</p>
                  </div>
                </div>

                {threadDetails?.messages &&
                  threadDetails.messages.length > 2 &&
                  !threadSummary[activeThread.id] && (
                    <button
                      onClick={onSummarize}
                      disabled={summarizeIsPending}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center space-x-1"
                    >
                      {summarizeIsPending ? (
                        <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />
                      ) : (
                        <span>✨ Summarize Thread</span>
                      )}
                    </button>
                  )}
              </div>

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
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Reply:
              </span>
              {(smartRepliesData.intents as string[]).map((intent, idx) => (
                <button
                  key={idx}
                  onClick={() => onSmartReply(intent)}
                  disabled={smartReplyDraftIsPending}
                  className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-full border border-sky-200 transition-colors"
                >
                  {intent}
                </button>
              ))}
              {smartReplyDraftIsPending && (
                <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin inline-block ml-2" />
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        {isLoadingDetails ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 font-medium uppercase tracking-widest px-2 animate-pulse">
              Loading Messages...
            </h3>
            <div className="bg-forest-800/40 border border-forest-700/80 p-8 rounded-xl flex justify-center">
              <span className="w-6 h-6 border-2 border-wheat-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        ) : (
          threadDetails?.messages &&
          threadDetails.messages.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-forest-500 uppercase tracking-widest px-2">
                Messages ({threadDetails.messages.length})
              </h3>
              <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(threadDetails.messages as any[]).map((message: any, idx: number) => {
                  const bodyText = getMessageBody(message.payload);
                  const isHtml = isHtmlEmail(bodyText);
                  const fromHeader = message.payload?.headers?.find((h: any) => h.name?.toLowerCase() === "from")?.value || "";
                  const isMe = !fromHeader.includes(activeSenderEmail);

                  return (
                    <div key={message.id} className={`flex w-full ${!isHtml && isMe ? "justify-end" : "justify-start"}`}>
                      {/* Avatar — hidden for HTML emails to reclaim full width */}
                      {!isMe && !isHtml && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs mt-auto mb-1 mr-3 shadow-sm">
                          {String.fromCharCode(65 + (parseInt(activeThread.id.substring(0, 8), 16) % 26))}
                        </div>
                      )}
                      <div
                        className={`rounded-2xl p-5 shadow-sm border relative min-w-0 ${
                          isHtml
                            ? // HTML emails: full width, horizontally scrollable if email is wider than viewport
                              "w-full overflow-x-auto bg-white border-slate-200 text-slate-900"
                            : isMe
                            ? // Plain text sent by me
                              "max-w-full lg:max-w-[85%] overflow-hidden bg-blue-600 text-white border-transparent rounded-br-sm ml-8"
                            : // Plain text received
                              "max-w-full lg:max-w-[85%] overflow-hidden bg-slate-100 border-transparent rounded-bl-sm mr-8 text-slate-900"
                        }`}
                      >
                        <div
                          className={`flex justify-between items-center text-[9px] font-semibold mb-3 pb-2 border-b ${
                            isHtml
                              ? "text-slate-400 border-slate-100"
                              : isMe
                              ? "text-forest-300 border-forest-800"
                              : "text-forest-400 border-forest-100"
                          }`}
                        >
                          <span className="font-mono opacity-60">ID: {message.id.substring(0, 8)}</span>
                          <span>
                            {new Date(parseInt(message.internalDate as string)).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        {isHtml ? (
                          <SafeEmailFrame
                            className="w-full"
                            html={bodyText}
                          />
                        ) : (
                          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe ? "text-cream-100" : "text-forest-900"}`}>
                            {bodyText}
                          </p>
                        )}
                      </div>
                      {isMe && !isHtml && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-wheat-500 to-amber-500 flex items-center justify-center text-forest-950 font-bold text-xs mt-auto mb-1 ml-3 shadow-sm">
                          ME
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
