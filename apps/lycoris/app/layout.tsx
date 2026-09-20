import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import "./globals.css";
import { DesignFonts } from "@repo/ui/components/design-fonts";
import { Toaster } from "@repo/ui/components/sonner";
import { ThemeProvider } from "@repo/ui/components/theme-provider";
import { TooltipProvider } from "@repo/ui/components/tooltip";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  metadataBase: new URL("https://lycoris.vinaynair.dev"),
  title: "Lycoris",
  description:
    "USDC payments for people and agents. Try a sponsored checkout, see an agent buy a paid API, and inspect the engineering behind Settle Kit.",
  openGraph: {
    title: "Lycoris",
    description:
      "USDC payments for people and agents. Try a sponsored checkout, see an agent buy a paid API, and inspect the engineering behind Settle Kit.",
    url: "https://lycoris.vinaynair.dev",
    siteName: "Lycoris",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lycoris",
    description:
      "USDC payments for people and agents. Try a sponsored checkout, see an agent buy a paid API, and inspect the engineering behind Settle Kit.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="font-sans antialiased">
      <head>
        <DesignFonts />
      </head>
      <body className="bg-canvas bg-[repeating-linear-gradient(0deg,var(--canvas-line)_0px,var(--canvas-line)_1px,transparent_1px,transparent_5px)]">
        <ThemeProvider defaultTheme="dark" storageKey="lycoris-theme">
          <NuqsAdapter>
            <TooltipProvider>
              <AppShell>{children}</AppShell>
              <Toaster />
            </TooltipProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
