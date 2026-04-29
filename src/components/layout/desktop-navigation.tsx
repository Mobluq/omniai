"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppWindow,
  Archive,
  Bot,
  Boxes,
  BrainCircuit,
  ChevronDown,
  CircleUserRound,
  FileStack,
  Globe2,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ShellProfile = {
  name: string;
  email: string;
  initials: string;
  workspaceName: string;
  workspaceType: string;
  role: string;
};

const sections = [
  {
    label: "Command",
    items: [{ href: "/dashboard", label: "AI Operations", icon: Globe2, activeGroup: true }],
  },
  {
    label: "Model operations",
    items: [
      { href: "/chat", label: "Unified Chat", icon: MessageSquare },
      { href: "/routing", label: "Model Routing", icon: BrainCircuit },
      { href: "/usage", label: "Usage & Cost", icon: LayoutDashboard },
    ],
  },
  {
    label: "Knowledge & Output",
    items: [
      { href: "/projects", label: "Projects", icon: Boxes },
      { href: "/knowledge", label: "Knowledge Base", icon: FileStack },
      { href: "/artifacts", label: "Artifacts", icon: Archive },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings", label: "Integration", icon: Share2 },
      { href: "/notifications", label: "Notifications", icon: Inbox },
      { href: "/account", label: "Account", icon: CircleUserRound },
    ],
  },
];

export function DesktopNavigation({ profile }: { profile: ShellProfile }) {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-[66px] z-30 hidden w-[266px] border-r border-[#d9e3eb] bg-white lg:block">
      <div className="flex h-full flex-col">
        <Link
          href="/account"
          className="group flex items-center justify-between border-b border-[#e5edf3] px-5 py-5 transition hover:bg-[#f7fafd]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2f3742] text-xs font-semibold text-white">
              {profile.initials}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="max-w-[7.8rem] truncate rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[0.62rem] font-semibold text-[#245b93]">
                  {profile.workspaceType}
                </span>
                <span className="rounded bg-[#edf5ef] px-1.5 py-0.5 text-[0.62rem] font-semibold capitalize text-[#217547]">
                  {profile.role}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-semibold">{profile.name}</p>
              <p className="truncate text-[0.72rem] text-[#7a8591]">{profile.workspaceName}</p>
            </div>
          </div>
          <AppWindow
            className="h-4 w-4 shrink-0 text-[#6d7784] transition group-hover:text-[#111418]"
            aria-hidden="true"
          />
        </Link>

        <nav className="thin-scrollbar flex-1 overflow-auto px-4 py-5">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-3 text-xs font-medium text-[#8c96a3]">{section.label}</p>
              <div className="grid gap-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30",
                        active
                          ? "bg-[#eaf4ff] text-[#111418]"
                          : "text-[#404955] hover:bg-[#f3f7fb] hover:text-[#111418]",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 text-[#5f6975]" aria-hidden="true" />
                        {item.label}
                      </span>
                      {"activeGroup" in item && item.activeGroup ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[#5f6975]" aria-hidden="true" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>

              {section.label === "Model operations" ? (
                <div className="ml-5 mt-2 grid gap-2 border-l border-[#d9e3eb] pl-4">
                  {["Manual Mode", "Suggest Mode", "Auto Route"].map((item) => (
                    <Link
                      key={item}
                      href="/routing"
                      className="min-h-8 rounded-lg px-2 py-1.5 text-sm text-[#111418] transition hover:bg-[#f3f7fb] hover:text-[#2f7cf6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="border-t border-[#e5edf3] p-4">
          <Link
            href="/settings"
            className="block rounded-2xl border border-[#d9e3eb] bg-[#f7fafd] p-4 transition hover:border-[#bcd4e8] hover:bg-[#f0f7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-[#2f7cf6]" aria-hidden="true" />
              Provider mesh
            </div>
            <p className="mt-2 text-xs leading-5 text-[#6d7784]">
              OpenAI, Claude, Gemini, Mistral, Stability, and Bedrock keys stay server-side.
            </p>
          </Link>
        </div>
      </div>
    </aside>
  );
}
