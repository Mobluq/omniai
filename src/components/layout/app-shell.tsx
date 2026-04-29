import Link from "next/link";
import type { ReactNode } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { DesktopNavigation } from "@/components/layout/desktop-navigation";
import { GlobalSearch } from "@/components/layout/global-search";
import { getCurrentUser } from "@/lib/auth/session";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

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

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.split("@")[0] || "OmniAI";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatWorkspaceType(value?: string | null) {
  if (!value) {
    return "Workspace";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const workspaces = user ? await new WorkspaceService().listForUser(user.id) : [];
  const workspace = workspaces[0];
  const profile = {
    name: user?.name || user?.email?.split("@")[0] || "OmniAI user",
    email: user?.email ?? "Signed out",
    initials: getInitials(user?.name, user?.email),
    workspaceName: workspace?.name ?? "No workspace selected",
    workspaceType: formatWorkspaceType(workspace?.type),
    role: workspace?.members[0]?.role ?? "viewer",
  };

  return (
    <div className="min-h-[100dvh] bg-[#f5f8fb] text-[#111418]">
      <header className="fixed inset-x-0 top-0 z-40 h-[66px] border-b border-[#d9e3eb] bg-white/95 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-9">
          <div className="flex min-w-0 items-center gap-4">
            <MobileNavigation profile={profile} />
            <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
              <OmniMark />
              <span className="hidden text-[1.05rem] font-semibold tracking-[-0.03em] sm:inline">OMNIAI</span>
            </Link>
          </div>

          <div className="flex min-w-0 items-center justify-end gap-2">
            <div className="w-10 md:w-[min(34vw,380px)]">
              <GlobalSearch />
            </div>
            <NotificationCenter />
            <Button
              asChild
              variant="outline"
              size="sm"
              className="inline-flex h-10 w-10 rounded-xl border-[#d9e3eb] bg-white px-0 md:w-auto md:px-3"
            >
              <Link href="/chat" aria-label="New chat">
                <MessageSquarePlus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">New chat</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              aria-label="Open account profile"
              className="h-10 min-w-10 rounded-full bg-[#2f3742] px-0 text-xs font-semibold text-white hover:bg-[#202833] hover:text-white md:px-3"
            >
              <Link href="/account">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10">
                  {profile.initials}
                </span>
                <span className="hidden max-w-28 truncate md:inline">{profile.name}</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <DesktopNavigation profile={profile} />
      <main className="px-3 pb-5 pt-[84px] transition-[padding-left] duration-200 sm:px-5 lg:pl-[calc(var(--sidebar-width)+24px)] lg:pr-6 xl:pr-7">
        {children}
      </main>
    </div>
  );
}
