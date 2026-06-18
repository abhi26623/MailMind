import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";

export const metadata: Metadata = {
  title: "MailMind — AI Scheduling & Email Assistant",
  description: "Mark your availability. Let AI negotiate the meeting. Book with one click.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  other: {
    "darkreader": "NO-DARKREADER",
    "darkreader-lock": "true"
  }
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
