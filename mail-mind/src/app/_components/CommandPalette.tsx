"use client";

import React, { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";

export function CommandPalette({
  isOpen,
  setIsOpen,
  onArchive,
  onReply,
  onSchedule,
  onDelete,
  hasActiveThread
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onArchive: () => void;
  onReply: () => void;
  onSchedule: () => void;
  onDelete: () => void;
  hasActiveThread: boolean;
}) {
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-forest-950/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-forest-900 border border-forest-700/50 rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        <Command
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === "Escape") setIsOpen(false);
          }}
        >
          <div className="flex items-center px-4 py-3 border-b border-forest-700">
            <svg className="w-4 h-4 text-olive-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Command.Input
              autoFocus
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-sm text-cream-100 outline-none placeholder:text-olive-500"
            />
            <span className="text-[10px] font-mono text-olive-500 bg-forest-800 px-1.5 py-0.5 rounded">ESC</span>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-olive-500">
              No results found.
            </Command.Empty>

            <Command.Group heading={<div className="px-2 py-1 text-[10px] font-bold text-olive-500 uppercase tracking-wider">Navigation</div>}>
              <Command.Item
                onSelect={() => {
                  router.push("/inbox");
                  setIsOpen(false);
                }}
                className="flex items-center px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400"
              >
                Go to Inbox
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  router.push("/calendar");
                  setIsOpen(false);
                }}
                className="flex items-center px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400"
              >
                Go to Calendar
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  router.push("/agent");
                  setIsOpen(false);
                }}
                className="flex items-center px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400"
              >
                Open Agent
              </Command.Item>
            </Command.Group>

            <Command.Group heading={<div className="px-2 py-1 text-[10px] font-bold text-olive-500 uppercase tracking-wider mt-2">Active Thread Actions</div>}>
              <Command.Item
                disabled={!hasActiveThread}
                onSelect={() => {
                  onReply();
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400 data-[disabled=true]:opacity-50"
              >
                <span>Draft Reply</span>
                <span className="text-[10px] font-mono text-olive-500">R</span>
              </Command.Item>
              <Command.Item
                disabled={!hasActiveThread}
                onSelect={() => {
                  onSchedule();
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400 data-[disabled=true]:opacity-50"
              >
                <span>Schedule Meeting from Thread</span>
              </Command.Item>
              <Command.Item
                disabled={!hasActiveThread}
                onSelect={() => {
                  onArchive();
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400 data-[disabled=true]:opacity-50"
              >
                <span>Archive Thread</span>
                <span className="text-[10px] font-mono text-olive-500">E</span>
              </Command.Item>
              <Command.Item
                disabled={!hasActiveThread}
                onSelect={() => {
                  onDelete();
                  setIsOpen(false);
                }}
                className="flex items-center justify-between px-3 py-2.5 text-sm text-cream-200 rounded-xl cursor-pointer aria-selected:bg-wheat-500/20 aria-selected:text-wheat-400 data-[disabled=true]:opacity-50"
              >
                <span className="text-rose-400">Trash Thread</span>
                <span className="text-[10px] font-mono text-olive-500">#</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
