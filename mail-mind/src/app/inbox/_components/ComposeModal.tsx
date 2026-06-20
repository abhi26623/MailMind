"use client";

import type React from "react";

type Tone = "professional" | "shorter" | "grammar";

type ComposeModalProps = {
  isOpen: boolean;
  to: string;
  subject: string;
  body: string;
  aiOpen: boolean;
  aiPrompt: string;
  isSending: boolean;
  isDraftPending: boolean;
  isPolishPending: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onToChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAiOpenChange: (value: boolean) => void;
  onAiPromptChange: (value: string) => void;
  onGenerateDraft: () => void;
  onPolish: (tone: Tone) => void;
};

export function ComposeModal({
  isOpen,
  to,
  subject,
  body,
  aiOpen,
  aiPrompt,
  isSending,
  isDraftPending,
  isPolishPending,
  onClose,
  onSubmit,
  onToChange,
  onSubjectChange,
  onBodyChange,
  onAiOpenChange,
  onAiPromptChange,
  onGenerateDraft,
  onPolish,
}: ComposeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-forest-900/40 flex items-center justify-center p-4">
      <div className="bg-[#F5F6F8] border border-forest-900/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 animate-scale-up">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-forest-900">Compose New Email</h3>
          <button onClick={onClose} className="text-slate-600 font-medium hover:text-cream-100 transition-all text-xs">
            x Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">To</label>
            <input
              type="email"
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              required
              placeholder="recipient@example.com"
              className="w-full bg-white border border-forest-900/10 rounded-xl px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-forest-500 shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-forest-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(event) => onSubjectChange(event.target.value)}
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
                onClick={() => onAiOpenChange(!aiOpen)}
                className="flex items-center space-x-1 text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors"
              >
                <span>Draft with AI</span>
              </button>
            </div>
            {aiOpen && (
              <div className="mb-2 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(event) => onAiPromptChange(event.target.value)}
                  placeholder="What should the AI write?"
                  className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs text-forest-900 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  disabled={isDraftPending || !aiPrompt}
                  onClick={onGenerateDraft}
                  className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {isDraftPending ? "Generating..." : "Generate Draft"}
                </button>
              </div>
            )}
            <textarea
              rows={6}
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              required
              placeholder="Write your email here..."
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
            <button type="button" onClick={onClose} className="px-4 py-2 bg-forest-700 hover:bg-forest-600 text-xs font-semibold rounded-xl text-cream-200">
              Cancel
            </button>
            <button type="submit" disabled={isSending} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-semibold rounded-xl text-white shadow-md shadow-blue-500/20">
              {isSending ? "Sending..." : "Send Email"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
