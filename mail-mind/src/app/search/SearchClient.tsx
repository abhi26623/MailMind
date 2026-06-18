"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the input to avoid spamming the local model on every keystroke
  // Normally we'd use a useDebounce hook, but a simple timeout works too
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    // We could debounce here or just let the user hit enter, but let's do real-time since it's "lightning fast"
    // We'll set debouncedQuery after a short delay
    const timeout = setTimeout(() => {
      setDebouncedQuery(val);
    }, 500);
    return () => clearTimeout(timeout);
  };

  const { data: results, isLoading, error } = api.search.semanticSearch.useQuery(
    { query: debouncedQuery },
    { 
      enabled: debouncedQuery.length > 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: false,
    }
  );

  return (
    <div className="space-y-6">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Semantic search (e.g., 'flight itinerary', 'meeting about project x')..."
          className="w-full rounded-2xl border border-forest-700 bg-forest-900 px-6 py-4 text-cream-100 placeholder-olive-500 shadow-xl shadow-forest-950/50 outline-none transition-all focus:border-wheat-500/50 focus:ring-2 focus:ring-wheat-500/20"
        />
        {isLoading && query.length > 2 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-olive-500 border-t-wheat-500" />
          </div>
        )}
      </div>

      <div className="space-y-4">
        {error && debouncedQuery.length > 2 && !isLoading && (
          <div className="rounded-2xl border border-wheat-500/20 bg-wheat-500/5 p-5 text-center">
            <p className="text-sm font-medium text-wheat-400">Semantic search is currently unavailable</p>
            <p className="mt-1 text-xs text-olive-500">The AI model could not be loaded. Please restart the dev server and try again.</p>
          </div>
        )}
        {results?.length === 0 && debouncedQuery.length > 2 && !isLoading && !error && (
          <p className="text-olive-500">No semantic matches found.</p>
        )}
        
        {results?.map((email) => (
          <div 
            key={email.id} 
            className="group relative overflow-hidden rounded-2xl border border-forest-700 bg-forest-900 p-5 transition-all hover:border-wheat-500/30 hover:shadow-lg hover:shadow-wheat-500/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-wheat-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            
            <div className="relative z-10 flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-cream-100">{email.subject || "No Subject"}</h3>
                <p className="text-sm text-olive-400">{email.from} → {email.to}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-cream-200/70">
                  {email.snippet}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-forest-800 px-2.5 py-1 text-[10px] font-medium text-olive-400">
                  {(email.score * 100).toFixed(1)}% match
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
