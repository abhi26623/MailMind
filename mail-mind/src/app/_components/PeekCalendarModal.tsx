"use client";

import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";

interface PeekCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (slotStart: string, slotEnd: string) => void;
}

export function PeekCalendarModal({ isOpen, onClose, onConfirm }: PeekCalendarModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<{start: string, end: string} | null>(null);

  // Connection Status
  const { data: status } = api.email.getConnectionStatus.useQuery(undefined, { enabled: isOpen });

  const now = new Date();
  const timeMin = now.toISOString();
  
  const timeMaxDate = new Date(now);
  timeMaxDate.setDate(timeMaxDate.getDate() + 3); // Check next 3 days
  const timeMax = timeMaxDate.toISOString();

  // Fetch events for the next few days to calculate free slots
  const { data: eventsData, isLoading } = api.email.calendarEvents.useQuery(
    { timeMin, timeMax },
    {
      enabled: isOpen && !!status?.googlecalendar?.connected,
    }
  );

  // Calculate free slots (naive implementation for next 3 days, 9 AM to 5 PM)
  const freeSlots = useMemo(() => {
    if (!eventsData?.items) return [];
    
    const slots: {start: Date, end: Date}[] = [];
    const busyIntervals = eventsData.items.map((e: any) => {
      return {
        start: new Date(e.start?.dateTime || e.start?.date || 0),
        end: new Date(e.end?.dateTime || e.end?.date || 0)
      };
    });

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);
      
      // Suggest slots at 10 AM, 1 PM, 3 PM
      [10, 13, 15].forEach(hour => {
        const slotStart = new Date(day);
        slotStart.setHours(hour, 0, 0, 0);
        
        // Skip if slot is in the past
        if (slotStart <= now) return;

        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1);

        // Check if slot overlaps with busy
        const isBusy = busyIntervals.some((busy: {start: Date, end: Date}) => {
          return (slotStart < busy.end && slotEnd > busy.start);
        });

        if (!isBusy) {
          slots.push({ start: slotStart, end: slotEnd });
        }
      });
    }

    return slots.slice(0, 4); // return top 4 free slots
  }, [eventsData, now]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-forest-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-forest-900 border border-forest-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-up flex flex-col">
        <div className="flex justify-between items-center border-b border-forest-700 pb-3 mb-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-cream-100 flex items-center space-x-2">
            <svg className="w-4 h-4 text-wheat-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span>Select a Time Slot</span>
          </h3>
          <button onClick={onClose} className="text-olive-400 hover:text-cream-100 transition-all text-xs">x Close</button>
        </div>

        {!status?.googlecalendar?.connected ? (
          <div className="py-8 text-center text-olive-500 text-sm">
            Please connect Google Calendar first.
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-olive-500 text-sm animate-pulse">
            Finding free time on your calendar...
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-olive-400">AI found these free blocks in your schedule:</p>
            <div className="grid grid-cols-1 gap-2">
              {freeSlots.length === 0 ? (
                <p className="text-xs text-olive-500 text-center py-4">No free slots found in the next 3 days.</p>
              ) : (
                freeSlots.map((slot, i) => {
                  const isSelected = selectedSlot?.start === slot.start.toISOString();
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot({ start: slot.start.toISOString(), end: slot.end.toISOString() })}
                      className={`text-left p-3 rounded-xl border flex justify-between items-center transition-all ${
                        isSelected 
                          ? "bg-wheat-200 border-wheat-500 text-wheat-900" 
                          : "bg-forest-950/50 border-forest-700/80 hover:border-forest-600 text-cream-200"
                      }`}
                    >
                      <div>
                        <span className="block font-bold text-sm">
                          {slot.start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="block text-xs opacity-80 mt-0.5">
                          {slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-wheat-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            <div className="pt-4 flex justify-end space-x-3">
              <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-cream-200 bg-forest-700 hover:bg-forest-600 rounded-xl">Cancel</button>
              <button 
                disabled={!selectedSlot}
                onClick={() => selectedSlot && onConfirm(selectedSlot.start, selectedSlot.end)}
                className="px-4 py-2 text-xs font-bold text-cream-100 bg-wheat-500 hover:bg-wheat-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg shadow-wheat-500/20"
              >
                Confirm Time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
