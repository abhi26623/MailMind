const fs = require('fs');
let code = fs.readFileSync('src/app/inbox/page.tsx', 'utf8');

code = code.replace(
  `import { authClient } from "@/server/better-auth/client";`,
  `import { authClient } from "@/server/better-auth/client";\nimport { CommandPalette } from "@/app/_components/CommandPalette";`
);

code = code.replace(
  `  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);`,
  `  const [showCheatsheet, setShowCheatsheet] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const threadIds = useMemo(() => threads.map(t => t.id), [threads]);
  const { data: insights } = api.insights.getInsightsBatch.useQuery(
    { threadIds },
    { enabled: threadIds.length > 0 }
  );`
);

code = code.replace(
  `  const selectedThread = threads[selectedIndex] ?? null;`,
  `  const selectedThread = threads[selectedIndex] ?? null;
  const activeInsight = insights?.find(i => i.threadId === activeThread?.id);

  const scheduleMutation = api.workflow.scheduleFromEmail.useMutation({
    onSuccess: () => {
      showToast("Meeting scheduled & reply sent", "success");
      void refetch();
      if (calendarConnected) void refetchCalendar();
    },
    onError: (err) => {
      showToast(\`Failed to schedule: \${err.message}\`, "error");
    }
  });

  const handleScheduleFromInsight = () => {
    if (!activeThread || !activeInsight) return;
    if (!activeInsight.extractedEmail || !activeInsight.extractedDateTime) {
      showToast("Cannot schedule: Missing email or time", "error");
      return;
    }
    
    const startObj = new Date(activeInsight.extractedDateTime);
    const start = isNaN(startObj.getTime()) ? new Date(Date.now() + 3600000).toISOString() : startObj.toISOString();
    const end = new Date(new Date(start).getTime() + 30*60000).toISOString();

    scheduleMutation.mutate({
      threadId: activeThread.id,
      attendeeEmail: activeInsight.extractedEmail,
      summary: "Meeting: " + activeInsight.summary,
      start,
      end,
      replyBody: "I've scheduled a 30-minute meeting based on your request. See the calendar invite for details."
    });
  };`
);

code = code.replace(
  `                      <span className="font-bold text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700/60">
                        {thread.id.substring(0, 8)}
                      </span>
                      {isStarred && (
                        <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      )}
                    </div>`,
  `                      <span className="font-bold text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700/60">
                        {thread.id.substring(0, 8)}
                      </span>
                      <div className="flex space-x-1 items-center">
                        {insights?.find(i => i.threadId === thread.id)?.priority === "urgent" && (
                          <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-rose-500/30">
                            Urgent
                          </span>
                        )}
                        {insights?.find(i => i.threadId === thread.id)?.priority === "high" && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest border border-amber-500/30">
                            High
                          </span>
                        )}
                        {isStarred && (
                          <svg className="w-3.5 h-3.5 text-amber-400 fill-amber-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        )}
                      </div>
                    </div>`
);

code = code.replace(
  `        {/* Sidebar: Calendar Today's Events */}
        <div className="col-span-3 border-l border-slate-800/80 bg-slate-900/10 p-4 overflow-y-auto max-h-[calc(100vh-73px)]">
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">`,
  `        {/* Sidebar: AI Insights & Calendar */}
        <div className="col-span-3 border-l border-slate-800/80 bg-slate-900/10 p-4 overflow-y-auto max-h-[calc(100vh-73px)] space-y-6">
          
          {/* AI Insights Panel */}
          {activeInsight && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
                <h3 className="font-extrabold text-xs tracking-wider uppercase text-slate-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>AI Insight</span>
                </h3>
                <span className={\`text-[10px] font-bold px-2 py-0.5 rounded border uppercase \${
                  activeInsight.priority === 'urgent' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                  activeInsight.priority === 'high' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-slate-800 text-slate-300 border-slate-700'
                }\`}>
                  {activeInsight.priority}
                </span>
              </div>
              
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-slate-200 leading-snug">{activeInsight.summary}</p>
                <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
                  <p className="text-xs text-slate-400 italic">"{activeInsight.reason}"</p>
                </div>
                
                {activeInsight.suggestedAction === "schedule" && (
                  <button
                    onClick={handleScheduleFromInsight}
                    disabled={scheduleMutation.isPending}
                    className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    <span>{scheduleMutation.isPending ? "Scheduling..." : "Schedule + Reply"}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">`
);

let parts = code.split('    </div>\n  );\n}');
if (parts.length === 2) {
  code = parts[0] + `    </div>

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
    </div>
  );
}` + parts[1];
}

fs.writeFileSync('src/app/inbox/page.tsx', code);
