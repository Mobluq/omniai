"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, PanelLeft } from "lucide-react";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

type NavItem = (typeof navItems)[number];

const primaryItems = navItems.filter((item) =>
  ["/dashboard", "/chat", "/projects", "/search"].includes(item.href),
);
const intelligenceItems = navItems.filter((item) =>
  ["/knowledge", "/artifacts", "/routing", "/usage"].includes(item.href),
);
const workspaceItems = navItems.filter((item) =>
  ["/notifications", "/account", "/settings"].includes(item.href),
);

function NavSection({ title, items }: { title: string; items: readonly NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="grid gap-1">
      <p className="px-2 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        {title}
      </p>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-foreground text-background shadow-line"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0",
                active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
              )}
              aria-hidden="true"
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function DesktopNavigation() {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-border/70 bg-card/90 px-4 py-5 shadow-line backdrop-blur-xl lg:block">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-1">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background shadow-line">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold tracking-tight">OmniAI</span>
            <span className="block text-xs text-muted-foreground">AI command center</span>
          </span>
        </Link>

        <div className="mt-5 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            Routing engine online
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Prompts are classified before model execution so users can review the recommended
            provider.
          </p>
        </div>

        <nav className="thin-scrollbar mt-6 grid gap-6 overflow-auto pr-1">
          <NavSection title="Operate" items={primaryItems} />
          <NavSection title="Intelligence" items={intelligenceItems} />
          <NavSection title="Workspace" items={workspaceItems} />
        </nav>

        <div className="mt-auto rounded-lg border border-border/70 bg-background/65 p-3">
          <div className="flex items-start gap-3">
            <PanelLeft className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold">Tenant-safe workspace</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Provider keys stay server-side and workspace access is checked on every protected
                route.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
