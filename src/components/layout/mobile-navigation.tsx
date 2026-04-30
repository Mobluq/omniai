"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "@/components/ui/huge-icons";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { navItems } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

type ShellProfile = {
  name: string;
  email: string;
  initials: string;
  workspaceName: string;
  workspaceType: string;
  role: string;
};

export function MobileNavigation({ profile }: { profile: ShellProfile }) {
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

  const drawer = open ? (
    <div
      className="fixed inset-0 z-[80] lg:hidden"
      id="mobile-navigation-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#171314]/40 backdrop-blur-[2px]"
        onClick={() => setOpen(false)}
        aria-label="Close navigation overlay"
      />
      <aside className="relative flex h-full w-[min(88vw,360px)] flex-col border-r border-[#c9d8dc] bg-white shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-[#d5e4e7] px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-base font-semibold"
            onClick={() => setOpen(false)}
          >
            <AppLogo markClassName="h-9 w-9 rounded-xl" />
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="rounded-xl"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
        <Link
          href="/account"
          onClick={() => setOpen(false)}
          className="mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-[#c9d8dc] bg-[#edf7f9] p-3 transition active:scale-[0.99]"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#2a1f1e] text-xs font-semibold text-white">
            {profile.initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{profile.name}</span>
            <span className="mt-0.5 block truncate text-xs text-[#627177]">
              {profile.workspaceName}
            </span>
            <span className="mt-2 inline-flex rounded bg-[#f6ded9] px-1.5 py-0.5 text-[0.62rem] font-semibold capitalize text-[#8f2a20]">
              {profile.workspaceType} / {profile.role}
            </span>
          </span>
        </Link>
        <nav className="thin-scrollbar grid gap-1 overflow-auto p-3">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c93a29]/30",
                  active
                    ? "bg-[#f6ded9] text-[#171314]"
                    : "text-[#56666b] hover:bg-[#edf7f9] hover:text-[#171314]",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  ) : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-xl border border-[#c9d8dc] bg-white lg:hidden"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open navigation"
        aria-controls="mobile-navigation-drawer"
        aria-expanded={open}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>

      {drawer && typeof document !== "undefined" ? createPortal(drawer, document.body) : null}
    </>
  );
}
