import Link from "next/link";
import type { ReactNode } from "react";
import { MessageSquarePlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DesktopNavigation } from "@/components/layout/desktop-navigation";
import { GlobalSearch } from "@/components/layout/global-search";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background">
      <DesktopNavigation />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-3 sm:px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-2">
              <MobileNavigation />
              <Link
                href="/dashboard"
                className="flex min-w-0 items-center gap-2 font-semibold tracking-tight lg:hidden"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-foreground text-background">
                  AI
                </span>
                <span className="truncate">OmniAI</span>
              </Link>
            </div>
            <GlobalSearch />
            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationCenter />
              <Button asChild variant="default" size="sm" className="hidden sm:inline-flex">
                <Link href="/chat">
                  <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                  New chat
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Account">
                <Link href="/account">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1480px] px-3 py-4 sm:px-4 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
