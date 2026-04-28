import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, ChevronDown, MessageSquarePlus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DesktopNavigation } from "@/components/layout/desktop-navigation";
import { GlobalSearch } from "@/components/layout/global-search";

const topNavItems = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/chat", label: "Chat" },
  { href: "/routing", label: "Automation" },
  { href: "/settings", label: "Integration" },
  { href: "/usage", label: "Reports" },
];

function OmniMark() {
  return (
    <span
      className="relative h-5 w-10 overflow-hidden rounded-[0.15rem] bg-[#111418]"
      aria-hidden="true"
    >
      <span className="absolute -bottom-5 left-1/2 h-9 w-9 -translate-x-1/2 rounded-full bg-white" />
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-[#f5f8fb] text-[#111418]">
      <header className="fixed inset-x-0 top-0 z-40 h-[66px] border-b border-[#d9e3eb] bg-white/95 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-9">
          <div className="flex min-w-0 items-center gap-4">
            <MobileNavigation />
            <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
              <OmniMark />
              <span className="text-[1.05rem] font-semibold tracking-[-0.03em]">OMNIAI</span>
            </Link>
          </div>

          <nav className="hidden items-center gap-12 text-sm font-medium text-[#111418] lg:flex">
            {topNavItems.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-[#2f7cf6]">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden w-[min(32vw,360px)] xl:block">
              <GlobalSearch />
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-xl border-[#d9e3eb] bg-white md:inline-flex"
            >
              <Link href="/chat">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                New chat
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden h-9 rounded-xl border-[#d9e3eb] bg-white text-xs font-medium lg:inline-flex"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Last 14 Days
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <div className="w-10 md:w-[260px] xl:hidden">
              <GlobalSearch />
            </div>
            <NotificationCenter />
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Account"
              className="rounded-full bg-[#2f3742] text-white hover:bg-[#202833] hover:text-white"
            >
              <Link href="/account">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <DesktopNavigation />
      <main className="pt-[66px] lg:pl-[266px]">{children}</main>
    </div>
  );
}
