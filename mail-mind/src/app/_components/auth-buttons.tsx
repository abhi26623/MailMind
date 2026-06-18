"use client";

import { authClient } from "@/server/better-auth/client";
import { useRouter } from "next/navigation";

export function SignInButton({ className }: { className?: string }) {
  return (
    <button
      className={className || "rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"}
      onClick={async () => {
        await authClient.signIn.social({
          provider: "google",
          callbackURL: "/",
        });
      }}
    >
      Sign in with Google
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      className={className || "rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"}
      onClick={async () => {
        await authClient.signOut();
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
