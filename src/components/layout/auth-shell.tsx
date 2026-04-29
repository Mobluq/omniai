import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, BrainCircuit, CheckCircle2, LockKeyhole, Route } from "@/components/ui/huge-icons";

export function AuthShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="min-h-[100dvh] bg-background px-3 py-4 sm:px-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-[1180px] overflow-hidden rounded-[1.75rem] border border-border/80 bg-card/95 shadow-panel lg:grid-cols-[minmax(0,1.08fr)_460px]">
        <section className="operational-panel relative hidden min-h-[720px] border-r border-white/10 p-8 text-[#f7fbfc] lg:block">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-lg font-semibold tracking-tight"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#171314] shadow-line">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            OmniAI
          </Link>

          <div className="mt-16 max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
              Multi-model command center
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.05em]">
              Secure access to your routing, memory, usage, and provider mesh.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-6 text-white/60">
              Prompts are stored in your tenant, classified before execution, and routed through
              server-side provider credentials.
            </p>
          </div>

          <div className="mt-12 rounded-2xl border border-white/10 bg-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Routing lifecycle</p>
                <p className="mt-1 text-xs text-white/50">Prompt to selected model</p>
              </div>
              <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70">
                Suggest mode
              </span>
            </div>
            <svg
              viewBox="0 0 560 190"
              className="mt-5 h-48 w-full"
              role="img"
              aria-label="Prompt routing lifecycle preview"
            >
              <defs>
                <linearGradient id="auth-flow-a" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#c93a29" />
                  <stop offset="56%" stopColor="#d85a49" />
                  <stop offset="100%" stopColor="#c93a29" />
                </linearGradient>
                <linearGradient id="auth-flow-b" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#c93a29" />
                  <stop offset="48%" stopColor="#e4eff1" />
                  <stop offset="100%" stopColor="#c93a29" />
                </linearGradient>
              </defs>
              <line
                x1="42"
                x2="42"
                y1="72"
                y2="130"
                stroke="#c93a29"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <line
                x1="274"
                x2="274"
                y1="45"
                y2="104"
                stroke="#c93a29"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <line
                x1="274"
                x2="274"
                y1="114"
                y2="172"
                stroke="#c93a29"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <line
                x1="470"
                x2="470"
                y1="46"
                y2="104"
                stroke="#c93a29"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <line
                x1="470"
                x2="470"
                y1="118"
                y2="174"
                stroke="#c93a29"
                strokeLinecap="round"
                strokeWidth="10"
              />
              <path
                d="M48 101 C130 101 162 70 260 72 C354 75 386 67 464 75"
                fill="none"
                stroke="url(#auth-flow-a)"
                strokeLinecap="round"
                strokeWidth="24"
                opacity="0.9"
              />
              <path
                d="M48 101 C132 106 166 140 260 144 C354 148 386 140 464 146"
                fill="none"
                stroke="url(#auth-flow-b)"
                strokeLinecap="round"
                strokeWidth="24"
                opacity="0.76"
              />
            </svg>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Classify", icon: BrainCircuit },
                { label: "Route", icon: Route },
                { label: "Protect", icon: LockKeyhole },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/10 p-3">
                  <item.icon className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-8 left-8 right-8 grid grid-cols-3 overflow-hidden rounded-2xl border border-white/10 bg-[#171314]/40">
            {[
              ["Keys", "server-side"],
              ["Memory", "tenant scoped"],
              ["Access", "role checked"],
            ].map(([label, value]) => (
              <div key={label} className="border-r border-white/10 p-4 last:border-r-0">
                <CheckCircle2 className="h-4 w-4 text-[#c93a29]" aria-hidden="true" />
                <p className="mt-3 text-xs text-white/40">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-[100%] flex-col justify-center p-5 sm:p-8 lg:p-10">
          <Link href="/" className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground text-background">
              <Bot className="h-5 w-5" aria-hidden="true" />
            </span>
            OmniAI
          </Link>
          <div className="mx-auto w-full max-w-md">
            <p className="page-kicker">Secure access</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Continue to your unified AI workspace.
            </p>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
