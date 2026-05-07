"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { readApi, writeApi, type NotificationSummary, type Persona } from "@/lib/client/api";

const statusFilters = ["active", "unread", "read", "archived", "all"] as const;
const typeFilters = [
  "all",
  "system",
  "security",
  "listing",
  "order",
  "dispute",
  "barter",
  "payout",
  "review",
  "authentication",
] as const;

type StatusFilter = (typeof statusFilters)[number];
type TypeFilter = (typeof typeFilters)[number];

const typeStyles: Record<string, string> = {
  system: "border-l-foreground",
  security: "border-l-red-700",
  listing: "border-l-emerald-700",
  order: "border-l-blue-700",
  dispute: "border-l-amber-700",
  barter: "border-l-fuchsia-700",
  payout: "border-l-cyan-700",
  review: "border-l-lime-700",
  authentication: "border-l-violet-700",
};

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function notificationState(notification: NotificationSummary) {
  if (notification.archivedAt) return "Archived";
  if (notification.readAt) return "Read";
  return "Unread";
}

export function NotificationsClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [message, setMessage] = useState("Loading event center.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const stats = useMemo(() => {
    return notifications.reduce(
      (current, notification) => {
        current.total += 1;
        if (!notification.readAt && !notification.archivedAt) current.unread += 1;
        if (notification.archivedAt) current.archived += 1;
        if (["dispute", "payout", "security", "authentication"].includes(notification.type)) {
          current.trust += 1;
        }
        return current;
      },
      { total: 0, unread: 0, archived: 0, trust: 0 },
    );
  }, [notifications]);

  const loadNotifications = useCallback(
    async (userId: string, status: StatusFilter, type: TypeFilter) => {
      if (!userId) return;

      const params = new URLSearchParams({ status });
      if (type !== "all") params.set("type", type);

      const result = await readApi<{ notifications: NotificationSummary[] }>(
        `/api/v1/notifications?${params.toString()}`,
        userId,
      );
      setNotifications(result.notifications);
      setMessage(
        result.notifications.length
          ? "Event center loaded."
          : "No notifications match the current filter.",
      );
    },
    [],
  );

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const buyer = result.users.find((persona) => persona.role === "buyer") ?? result.users[0];
        setActiveUserId(buyer?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Event center failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadNotifications(activeUserId, statusFilter, typeFilter);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Notifications failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadNotifications, statusFilter, typeFilter]);

  async function markRead(notificationId: string) {
    if (!activeUserId) return;

    setBusyAction(`read:${notificationId}`);
    try {
      await writeApi(`/api/v1/notifications/${notificationId}/read`, activeUserId);
      setMessage("Notification marked read.");
      await loadNotifications(activeUserId, statusFilter, typeFilter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Read update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function archiveNotification(notificationId: string) {
    if (!activeUserId) return;

    setBusyAction(`archive:${notificationId}`);
    try {
      await writeApi(`/api/v1/notifications/${notificationId}/archive`, activeUserId);
      setMessage("Notification archived.");
      await loadNotifications(activeUserId, statusFilter, typeFilter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Archive failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function markAllRead() {
    if (!activeUserId) return;

    setBusyAction("read-all");
    try {
      await writeApi("/api/v1/notifications/read-all", activeUserId);
      setMessage("All active notifications marked read.");
      await loadNotifications(activeUserId, statusFilter, typeFilter);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bulk read update failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/marketplace" className="text-sm font-semibold text-muted-foreground">
            Back to marketplace
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Event fanout
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Notifications</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            A durable in-app feed for marketplace, support, trust, payout, barter, and
            authentication events.
          </p>
        </div>
        <PersonaSelector
          label="Notification persona"
          personas={personas}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
        />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span> : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-4">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">In view</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="mt-2 text-3xl font-semibold">{stats.unread}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Trust events</p>
          <p className="mt-2 text-3xl font-semibold">{stats.trust}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Archived</p>
          <p className="mt-2 text-3xl font-semibold">{stats.archived}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 lg:grid-cols-[18rem_1fr]">
        <aside className="h-fit rounded-md border border-border bg-white p-4">
          <h2 className="text-xl font-semibold">Filters</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm font-medium">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="rounded-md border border-border bg-white px-3 py-2"
              >
                {statusFilters.map((status) => (
                  <option key={status} value={status}>
                    {labelize(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium">
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
                className="rounded-md border border-border bg-white px-3 py-2"
              >
                {typeFilters.map((type) => (
                  <option key={type} value={type}>
                    {labelize(type)}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              disabled={busyAction === "read-all" || stats.unread === 0}
              onClick={() => void markAllRead()}
            >
              {busyAction === "read-all" ? "Saving..." : "Mark all read"}
            </button>
          </div>
        </aside>

        <section className="grid gap-3">
          {notifications.length === 0 ? (
            <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
              <h2 className="text-2xl font-semibold">No notifications</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Workflow events appear here as orders, disputes, payouts, support messages, and barter
                proposals move.
              </p>
            </article>
          ) : null}

          {notifications.map((notification) => {
            const state = notificationState(notification);
            const style = typeStyles[notification.type] ?? "border-l-foreground";
            return (
              <article
                key={notification.id}
                className={`grid gap-4 rounded-md border border-l-4 border-border bg-white p-4 ${style} lg:grid-cols-[1fr_auto]`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <span>{labelize(notification.type)}</span>
                    <span>/</span>
                    <span>{state}</span>
                    <span>/</span>
                    <span>{formatDate(notification.createdAt)}</span>
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold">{notification.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{notification.body}</p>
                </div>

                <div className="flex flex-wrap items-start gap-2 lg:grid lg:min-w-40">
                  {notification.actionUrl ? (
                    <Link
                      href={notification.actionUrl}
                      className="rounded-md border border-border px-3 py-2 text-center text-sm font-semibold"
                    >
                      Open
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={Boolean(notification.readAt) || busyAction === `read:${notification.id}`}
                    onClick={() => void markRead(notification.id)}
                  >
                    {busyAction === `read:${notification.id}` ? "Saving..." : "Mark read"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={Boolean(notification.archivedAt) || busyAction === `archive:${notification.id}`}
                    onClick={() => void archiveNotification(notification.id)}
                  >
                    {busyAction === `archive:${notification.id}` ? "Archiving..." : "Archive"}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
