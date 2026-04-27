"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ExternalLink, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import type { AppNotification } from "@/components/notifications/notification-center";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type NotificationFilter = "all" | "unread" | AppNotification["type"];

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

async function loadNotifications() {
  const response = await fetch("/api/notifications?limit=80", { cache: "no-store" });
  const envelope = await parseEnvelope<{
    notifications: { items: AppNotification[]; unreadCount: number };
  }>(response);

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function NotificationInbox() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const filteredItems = useMemo(() => {
    if (filter === "unread") {
      return items.filter((item) => !item.readAt);
    }

    if (filter === "all") {
      return items;
    }

    return items.filter((item) => item.type === filter);
  }, [filter, items]);

  useEffect(() => {
    loadNotifications()
      .then((result) => {
        setItems(result.items);
        setUnreadCount(result.unreadCount);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function onMarkRead(id: string) {
    const updated = await updateNotification(id, { read: true });
    setItems((current) => current.map((item) => (item.id === id ? updated : item)));
    setUnreadCount((current) => Math.max(0, current - 1));
  }

  async function onArchive(id: string) {
    const archived = items.find((item) => item.id === id);
    await updateNotification(id, { archived: true, read: true });
    setItems((current) => current.filter((item) => item.id !== id));
    setUnreadCount((current) => (archived?.readAt ? current : Math.max(0, current - 1)));
  }

  async function onMarkAllRead() {
    await markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Notification inbox</CardTitle>
            </div>
            <CardDescription>
              Security, usage, provider, billing, routing, and workspace events appear here.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-muted">{unreadCount} unread</Badge>
            <Select
              aria-label="Notification filter"
              value={filter}
              onChange={(event) => setFilter(event.target.value as NotificationFilter)}
              className="h-9 w-40"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="security">Security</option>
              <option value="usage">Usage</option>
              <option value="provider">Providers</option>
              <option value="billing">Billing</option>
              <option value="routing">Routing</option>
              <option value="workspace">Workspace</option>
              <option value="system">System</option>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={onMarkAllRead} disabled={!unreadCount}>
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Read all
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {status === "loading" ? (
          <div className="grid min-h-64 place-items-center rounded-lg border border-dashed">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : status === "error" ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            Notifications could not be loaded.
          </div>
        ) : filteredItems.length ? (
          <div className="grid gap-3">
            {filteredItems.map((item) => (
              <article key={item.id} className="rounded-md border p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-semibold">{item.title}</h2>
                      {!item.readAt ? <Badge className="bg-primary/10 text-primary">Unread</Badge> : null}
                      <Badge className="bg-muted capitalize">{item.type}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(item.createdAt)}</span>
                      {item.actionUrl ? (
                        <Link href={item.actionUrl} className="inline-flex items-center gap-1 font-medium text-primary">
                          Open related page
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!item.readAt ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => onMarkRead(item.id)}>
                        <CheckCheck className="h-4 w-4" aria-hidden="true" />
                        Mark read
                      </Button>
                    ) : null}
                    <Button type="button" size="sm" variant="ghost" onClick={() => onArchive(item.id)}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      Archive
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            No notifications match this filter.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
