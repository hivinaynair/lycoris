import type { Metadata } from "next";
import { Geist, IBM_Plex_Mono, Newsreader } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import "./globals.css";
import { Toaster } from "@repo/ui/components/sonner";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { cn } from "@repo/ui/lib/utils";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://lycoris.vercel.app"),
  title: "Lycoris",
  description: "Agentic USDC settlement demo",
  openGraph: {
    title: "Lycoris",
    description: "Agentic USDC settlement demo",
    url: "https://lycoris.vercel.app",
    siteName: "Lycoris",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lycoris",
    description: "Agentic USDC settlement demo",
  },
};

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  style: ["normal", "italic"],
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "font-sans antialiased",
        geist.variable,
        newsreader.variable,
        plexMono.variable,
      )}
    >
      <body>
        <NuqsAdapter>
          <TooltipProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </TooltipProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
