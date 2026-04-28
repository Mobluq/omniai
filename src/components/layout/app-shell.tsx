import Link from "next/link";
import type { ReactNode } from "react";
import { Bot, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { navItems } from "@/components/layout/nav-items";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-4 py-5 lg:block">
        <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          OmniAI
        </Link>
        <nav className="mt-8 grid gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <MobileNavigation />
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold lg:hidden">
              <Bot className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">OmniAI</span>
            </Link>
          </div>
          <div className="hidden text-sm text-muted-foreground lg:block">Multi-model AI workspace</div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" aria-label="Search">
              <Link href="/search">
                <Search className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <NotificationCenter />
            <Button asChild variant="outline" size="sm">
              <Link href="/settings">Workspace</Link>
            </Button>
            <Button asChild variant="ghost" size="icon" aria-label="Account">
              <Link href="/account">
                <UserRound className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </header>
        <main className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
