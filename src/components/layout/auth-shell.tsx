import Link from "next/link";
import type { ReactNode } from "react";
import { Bot } from "lucide-react";

export function AuthShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          OmniAI
        </Link>
        <section className="rounded-lg border bg-card p-6 shadow-soft">
          <h1 className="text-xl font-semibold">{title}</h1>
          {children}
        </section>
      </div>
    </main>
  );
}
