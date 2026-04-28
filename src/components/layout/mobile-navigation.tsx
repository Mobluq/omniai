"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-label="Close navigation overlay"
          />
          <aside className="relative flex h-full w-[min(88vw,360px)] flex-col border-r border-border/70 bg-card shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-border/70 px-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
                  <Bot className="h-5 w-5" aria-hidden="true" />
                </span>
                OmniAI
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="m-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              Routing, memory, provider settings, usage, and team controls stay available from one
              drawer.
            </div>
            <nav className="thin-scrollbar grid gap-1 overflow-auto p-3 pt-0">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-auto border-t p-4">
              <Button asChild className="w-full">
                <Link href="/chat" onClick={() => setOpen(false)}>
                  New conversation
                </Link>
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
