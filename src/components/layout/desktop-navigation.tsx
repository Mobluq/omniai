"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Archive,
  Bot,
  Boxes,
  BrainCircuit,
  CircleUserRound,
  FileStack,
  Globe2,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
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
    items: [{ href: "/dashboard", label: "AI Operations", icon: Globe2 }],
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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "82px" : "266px");
  }, [collapsed]);

  return (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-[66px] z-30 hidden border-r border-[#d9e3eb] bg-white transition-[width] duration-200 lg:block",
        collapsed ? "w-[82px]" : "w-[266px]",
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex items-center border-b border-[#e5edf3]",
            collapsed ? "justify-center gap-2 px-3 py-4" : "justify-between gap-3 px-5 py-5",
          )}
        >
          <Link
            href="/account"
            title="Open account profile"
            className={cn(
              "group flex min-w-0 items-center gap-3 transition hover:text-[#111418]",
              collapsed ? "justify-center" : "flex-1",
            )}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#2f3742] text-xs font-semibold text-white">
              {profile.initials}
            </span>
            {!collapsed ? (
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="max-w-[7.8rem] truncate rounded bg-[#e8f2ff] px-1.5 py-0.5 text-[0.62rem] font-semibold text-[#245b93]">
                    {profile.workspaceType}
                  </span>
                  <span className="rounded bg-[#edf5ef] px-1.5 py-0.5 text-[0.62rem] font-semibold capitalize text-[#217547]">
                    {profile.role}
                  </span>
                </span>
                <span className="mt-1 block truncate text-sm font-semibold">{profile.name}</span>
                <span className="block truncate text-[0.72rem] text-[#7a8591]">{profile.workspaceName}</span>
              </span>
            ) : (
              <span className="sr-only">Open account profile</span>
            )}
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#d9e3eb] text-[#5f6975] transition hover:bg-[#f3f7fb] hover:text-[#111418] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className={cn("thin-scrollbar flex-1 overflow-auto py-5", collapsed ? "px-3" : "px-4")}>
          {sections.map((section) => (
            <div key={section.label} className={collapsed ? "mb-3" : "mb-5"}>
              {!collapsed ? (
                <p className="mb-3 text-xs font-medium text-[#8c96a3]">{section.label}</p>
              ) : null}
              <div className="grid gap-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      className={cn(
                        "flex min-h-11 items-center rounded-xl text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30",
                        collapsed ? "justify-center px-0" : "justify-between px-3",
                        active
                          ? "bg-[#eaf4ff] text-[#111418]"
                          : "text-[#404955] hover:bg-[#f3f7fb] hover:text-[#111418]",
                      )}
                    >
                      <span className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}>
                        <item.icon className="h-4 w-4 text-[#5f6975]" aria-hidden="true" />
                        <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                      </span>
                    </Link>
                  );
                })}
              </div>

              {section.label === "Model operations" && !collapsed ? (
                <div className="mt-2 flex flex-nowrap gap-1 rounded-xl border border-[#d9e3eb] bg-[#f7fafd] p-1">
                  {["Manual", "Suggest", "Auto"].map((item) => (
                    <Link
                      key={item}
                      href="/routing"
                      className="min-h-8 min-w-0 flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-semibold text-[#53606d] transition hover:bg-white hover:text-[#111418] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-[#e5edf3]", collapsed ? "p-3" : "p-4")}>
          <Link
            href="/settings"
            title="Provider mesh"
            className={cn(
              "block border border-[#d9e3eb] bg-[#f7fafd] transition hover:border-[#bcd4e8] hover:bg-[#f0f7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7cf6]/30",
              collapsed ? "grid h-12 place-items-center rounded-xl p-0" : "rounded-2xl p-4",
            )}
          >
            <div className={cn("flex items-center gap-2 text-sm font-semibold", collapsed ? "justify-center" : "")}>
              <Bot className="h-4 w-4 text-[#2f7cf6]" aria-hidden="true" />
              {!collapsed ? "Provider mesh" : <span className="sr-only">Provider mesh</span>}
            </div>
            {!collapsed ? (
              <p className="mt-2 text-xs leading-5 text-[#6d7784]">
                OpenAI, Claude, Gemini, Mistral, Stability, and Bedrock keys stay server-side.
              </p>
            ) : null}
          </Link>
        </div>
      </div>
    </aside>
  );
}
