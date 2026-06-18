import { HydrateClient } from "@/trpc/server";
import { SearchClient } from "./SearchClient";

export default function SearchPage() {
  return (
    <HydrateClient>
      <main className="min-h-screen bg-forest-950 p-8 text-cream-100">
        <div className="mx-auto max-w-4xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-cream-100">
              Semantic Search
            </h1>
            <p className="text-olive-400">
              Lightning-fast local vector search across your cached emails.
            </p>
          </header>
          <SearchClient />
        </div>
      </main>
    </HydrateClient>
  );
}
