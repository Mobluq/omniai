import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppAssistant } from "@/components/assistant/app-assistant";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniAI",
  description: "Multi-model AI orchestration for modern teams.",
  icons: {
    icon: "/brand/omniai-logo.png",
    shortcut: "/brand/omniai-logo.png",
    apple: "/brand/omniai-logo.png",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          {children}
          <AppAssistant />
        </AppProviders>
      </body>
    </html>
  );
}
