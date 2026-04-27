"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Inbox, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

    void loadInitial();

    return () => {
      cancelled = true;
    };
  }, []);

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
    const updated = await updateNotification(id, { read: true });
    setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function onArchive(id: string) {
    await updateNotification(id, { archived: true, read: true });
    setItems((current) => current.filter((item) => item.id !== id));
    setUnreadCount((current) => {
      const archived = items.find((item) => item.id === id);
      return archived?.readAt ? current : Math.max(0, current - 1);
    });
  }

  async function onMarkAllRead() {
    await markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setOpen((current) => !current)}
        aria-label="Open notifications"
        className="relative"
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,420px)] overflow-hidden rounded-lg border bg-card shadow-xl">
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <div className="text-sm font-semibold">Notifications</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {unreadCount ? `${unreadCount} unread` : "All caught up"}
              </div>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={onMarkAllRead} disabled={!unreadCount}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Read all
            </Button>
          </div>

          <div className="max-h-[440px] overflow-auto p-2">
            {loading ? (
              <div className="grid h-32 place-items-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-hidden="true" />
              </div>
            ) : items.length ? (
              items.map((item) => (
                <article key={item.id} className="rounded-md p-3 hover:bg-muted">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        {!item.readAt ? <Badge className="bg-primary/10 text-primary">New</Badge> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                          className="h-8 w-8"
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
                        className="h-8 w-8"
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
              <div className="grid h-36 place-items-center rounded-md border border-dashed text-center">
                <div>
                  <Inbox className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-2 text-sm text-muted-foreground">No notifications yet.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-2">
            <Button asChild variant="ghost" className="w-full justify-center" onClick={() => setOpen(false)}>
              <Link href="/notifications">View notification inbox</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
