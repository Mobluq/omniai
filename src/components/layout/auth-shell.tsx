import Link from "next/link";
import type { ReactNode } from "react";
import { Bot } from "lucide-react";

export function AuthShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          OmniAI
        </Link>
        <section className="rounded-lg border border-border/80 bg-card/95 p-6 shadow-panel">
          <p className="page-kicker">Secure access</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
