"use client";

import type React from "react";

type Tone = "professional" | "shorter" | "grammar";

type ReplyModalProps = {
  isOpen: boolean;
  threadId: string;
  threadSnippet: string;
  body: string;
  aiOpen: boolean;
  aiPrompt: string;
  isSending: boolean;
  isDraftPending: boolean;
  isPolishPending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onBodyChange: (value: string) => void;
  onAiOpenChange: (value: boolean) => void;
  onAiPromptChange: (value: string) => void;
  onGenerateDraft: () => void;
  onPolish: (tone: Tone) => void;
};

export function ReplyModal({
  isOpen,
  threadId,
  threadSnippet,
  body,
  aiOpen,
  aiPrompt,
  isSending,
  isDraftPending,
  isPolishPending,
  onClose,
  onSubmit,
  onBodyChange,
  onAiOpenChange,
  onAiPromptChange,
  onGenerateDraft,
  onPolish,
}: ReplyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
      <div className="bg-[#F5F6F8] border border-forest-900/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-forest-900">
            Reply to Thread #{threadId.substring(0, 8)}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-all text-xs font-semibold">
            x Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">Subject</label>
            <div className="w-full bg-forest-950/50 border border-forest-700 rounded-xl px-3 py-2 text-xs text-slate-600 font-medium">
              Re: {threadSnippet.substring(0, 50)}...
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600">Your Reply</label>
              <button
                type="button"
                onClick={() => onAiOpenChange(!aiOpen)}
                className="flex items-center space-x-1 text-xs font-semibold text-indigo-500 hover:text-indigo-600 transition-colors"
              >
                <span>Draft with AI</span>
              </button>
            </div>
            {aiOpen && (
              <div className="mb-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(event) => onAiPromptChange(event.target.value)}
                  placeholder="What should the AI write?"
                  className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={isDraftPending || !aiPrompt}
                  onClick={onGenerateDraft}
                  className="w-full py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {isDraftPending ? "Generating..." : "Generate Reply"}
                </button>
              </div>
            )}
            <textarea
              rows={6}
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              required
              placeholder="Write reply here..."
              className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner resize-none"
            />
            <div className="flex space-x-2 mt-2">
              <button
                type="button"
                onClick={() => onPolish("professional")}
                disabled={!body || isPolishPending}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
              >
                Professional
              </button>
              <button
                type="button"
                onClick={() => onPolish("shorter")}
                disabled={!body || isPolishPending}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
              >
                Shorter
              </button>
              <button
                type="button"
                onClick={() => onPolish("grammar")}
                disabled={!body || isPolishPending}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-[10px] font-semibold text-slate-700 rounded transition-colors disabled:opacity-50"
              >
                Fix Grammar
              </button>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-300">
              Cancel
            </button>
            <button type="submit" disabled={isSending} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-indigo-600/10">
              {isSending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
