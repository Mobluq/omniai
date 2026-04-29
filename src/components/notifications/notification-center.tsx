"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Inbox, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export type AppNotification = {
  id: string;
  type: "system" | "security" | "usage" | "provider" | "billing" | "routing" | "workspace";
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationPayload = {
  notifications: {
    items: AppNotification[];
    unreadCount: number;
  };
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

function formatNotificationTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }

  return `${Math.round(hours / 24)}d`;
}

async function loadNotifications(limit: number) {
  const response = await fetch(`/api/notifications?limit=${limit}`, { cache: "no-store" });
  const envelope = await parseEnvelope<NotificationPayload>(response);

  if (!envelope.success) {
    throw new Error(envelope.error.message);
  }

  return envelope.data.notifications;
}

async function updateNotification(id: string, input: { read?: boolean; archived?: boolean }) {
  const response = await fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const envelope = await parseEnvelope<{ notification: AppNotification }>(response);

  if (!envelope.success) {
    throw new Error(envelope.error.message);
  }

  return envelope.data.notification;
}

async function markAllRead() {
  const response = await fetch("/api/notifications", { method: "PATCH" });
  const envelope = await parseEnvelope<{ updatedCount: number }>(response);

  if (!envelope.success) {
    throw new Error(envelope.error.message);
  }
}

export function NotificationCenter() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      try {
        const result = await loadNotifications(8);

        if (!cancelled) {
          setItems(result.items);
          setUnreadCount(result.unreadCount);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitial().catch((loadError: unknown) => {
      if (!cancelled) {
        toast({
          title: "Notifications could not be loaded",
          description: errorMessage(loadError),
          variant: "error",
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function onMarkRead(id: string) {
    try {
      const updated = await updateNotification(id, { read: true });
      setItems((current) => current.map((item) => (item.id === id ? updated : item)));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (markError: unknown) {
      toast({ title: "Could not mark as read", description: errorMessage(markError), variant: "error" });
    }
  }

  async function onArchive(id: string) {
    try {
      await updateNotification(id, { archived: true, read: true });
      setItems((current) => current.filter((item) => item.id !== id));
      setUnreadCount((current) => {
        const archived = items.find((item) => item.id === id);
        return archived?.readAt ? current : Math.max(0, current - 1);
      });
      toast({ title: "Notification archived", variant: "success" });
    } catch (archiveError: unknown) {
      toast({ title: "Could not archive notification", description: errorMessage(archiveError), variant: "error" });
    }
  }

  async function onMarkAllRead() {
    try {
      await markAllRead();
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
      toast({ title: "Notifications marked as read", variant: "success" });
    } catch (markAllError: unknown) {
      toast({ title: "Could not update notifications", description: errorMessage(markAllError), variant: "error" });
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative h-10 w-10 rounded-xl border-[#d9e3eb] bg-white"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="fixed left-3 right-3 top-[74px] z-50 overflow-hidden rounded-2xl border border-[#d9e3eb] bg-white shadow-[0_22px_70px_rgba(17,20,24,0.16)] sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[min(92vw,420px)]">
          <div className="flex min-h-[68px] items-center justify-between border-b border-[#d9e3eb] px-4">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="mt-1 text-xs text-[#667381]">
                {unreadCount ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-10 rounded-xl"
              onClick={onMarkAllRead}
              disabled={!unreadCount}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Read all
            </Button>
          </div>

          <div className="thin-scrollbar max-h-[min(62dvh,440px)] overflow-auto p-2">
            {loading ? (
              <div className="grid min-h-[220px] place-items-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#667381]" aria-hidden="true" />
              </div>
            ) : items.length ? (
              items.map((item) => (
                <article key={item.id} className="rounded-xl p-3 hover:bg-[#f7fafd]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        {!item.readAt ? <Badge className="bg-primary/10 text-primary">New</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#667381]">{item.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#667381]">
                        <span>{formatNotificationTime(item.createdAt)}</span>
                        <span className="capitalize">{item.type}</span>
                        {item.actionUrl ? (
                          <Link
                            href={item.actionUrl}
                            className="inline-flex items-center gap-1 font-medium text-primary"
                            onClick={() => setOpen(false)}
                          >
                            Open
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!item.readAt ? (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => onMarkRead(item.id)}
                          aria-label="Mark notification as read"
                        >
                          <CheckCheck className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-xl"
                        onClick={() => onArchive(item.id)}
                        aria-label="Archive notification"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="grid min-h-[220px] place-items-center rounded-xl border border-dashed border-[#cfdbe5] text-center">
                <div>
                  <Inbox className="mx-auto h-5 w-5 text-[#667381]" aria-hidden="true" />
                  <p className="mt-2 text-sm text-[#667381]">No notifications yet.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#d9e3eb] p-2">
            <Button asChild variant="ghost" className="h-10 w-full justify-center rounded-xl" onClick={() => setOpen(false)}>
              <Link href="/notifications">View notification inbox</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
