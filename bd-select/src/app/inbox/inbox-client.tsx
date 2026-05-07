"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  readApi,
  writeApi,
  type BarterProposalSummary,
  type MessageThreadSummary,
  type OrderSummary,
  type Persona,
} from "@/lib/client/api";

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

function canSupport(role?: string) {
  return role === "admin" || role === "super_admin";
}

function metadataText(thread: MessageThreadSummary, key: string) {
  const value = thread.metadata?.[key];
  return typeof value === "string" ? value : null;
}

function threadKind(thread: MessageThreadSummary) {
  if (thread.orderId) return "order";
  if (thread.barterProposalId) return "barter";
  return "support";
}

function threadTitle(thread: MessageThreadSummary) {
  if (thread.order?.listing?.title) return thread.order.listing.title;
  if (thread.barterProposal?.targetListing?.title) return thread.barterProposal.targetListing.title;
  return metadataText(thread, "topic") ?? "Support request";
}

function threadSubtitle(thread: MessageThreadSummary) {
  const names = thread.participants
    .map((participant) => participant.user.email ?? participant.user.name ?? participant.userId)
    .join(" / ");

  return `${labelize(threadKind(thread))} / ${names}`;
}

function latestMessage(thread: MessageThreadSummary) {
  return thread.messages[0]?.body ?? "No messages yet.";
}

export function InboxClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [threadDetail, setThreadDetail] = useState<MessageThreadSummary | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [proposals, setProposals] = useState<BarterProposalSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [supportTopic, setSupportTopic] = useState("Authentication or escrow support");
  const [messageBody, setMessageBody] = useState("");
  const [message, setMessage] = useState("Loading inbox.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );
  const activeUserCanSupport = canSupport(activeUser?.role);

  const supportParticipants = useMemo(
    () => personas.filter((persona) => persona.id !== activeUserId && !canSupport(persona.role)),
    [activeUserId, personas],
  );
  const activeSupportParticipantId = useMemo(() => {
    if (supportParticipants.some((persona) => persona.id === selectedParticipantId)) {
      return selectedParticipantId;
    }
    return supportParticipants[0]?.id ?? "";
  }, [selectedParticipantId, supportParticipants]);

  const activeThread = useMemo(() => {
    if (threadDetail?.id === selectedThreadId) return threadDetail;
    return threads.find((thread) => thread.id === selectedThreadId) ?? null;
  }, [selectedThreadId, threadDetail, threads]);

  const stats = useMemo(() => {
    return threads.reduce(
      (current, thread) => {
        current.total += 1;
        if (threadKind(thread) === "support") current.support += 1;
        if (threadKind(thread) === "order") current.order += 1;
        if (threadKind(thread) === "barter") current.barter += 1;

        const self = thread.participants.find((participant) => participant.userId === activeUserId);
        const newestMessage = thread.messages[0];
        if (newestMessage && newestMessage.senderId !== activeUserId) {
          const lastReadAt = self?.lastReadAt ? new Date(self.lastReadAt).getTime() : 0;
          const newestAt = new Date(newestMessage.createdAt).getTime();
          if (newestAt > lastReadAt) current.unread += 1;
        }

        return current;
      },
      { total: 0, support: 0, order: 0, barter: 0, unread: 0 },
    );
  }, [activeUserId, threads]);

  const loadInboxData = useCallback(
    async (userId: string, preferredThreadId?: string) => {
      if (!userId) return;

      const [threadResult, orderResult, proposalResult] = await Promise.all([
        readApi<{ threads: MessageThreadSummary[] }>("/api/v1/messages/threads", userId),
        readApi<{ orders: OrderSummary[] }>("/api/v1/orders", userId).catch(() => ({ orders: [] })),
        readApi<{ proposals: BarterProposalSummary[] }>("/api/v1/barter/proposals", userId).catch(() => ({
          proposals: [],
        })),
      ]);

      setThreads(threadResult.threads);
      setThreadDetail(null);
      setOrders(orderResult.orders);
      setProposals(proposalResult.proposals);
      setSelectedOrderId(orderResult.orders[0]?.id ?? "");
      setSelectedProposalId(proposalResult.proposals[0]?.id ?? "");
      setSelectedThreadId((current) => {
        if (preferredThreadId && threadResult.threads.some((thread) => thread.id === preferredThreadId)) {
          return preferredThreadId;
        }
        return threadResult.threads.some((thread) => thread.id === current)
          ? current
          : threadResult.threads[0]?.id ?? "";
      });
      setMessage(threadResult.threads.length ? "Inbox loaded." : "No threads for this persona yet.");
    },
    [],
  );

  const loadThreadDetail = useCallback(async (userId: string, threadId: string) => {
    if (!userId || !threadId) return;
    const result = await readApi<{ thread: MessageThreadSummary }>(
      `/api/v1/messages/threads/${threadId}`,
      userId,
    );
    setThreadDetail(result.thread);
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        const firstParticipant = result.users.find((persona) => persona.id !== admin?.id && !canSupport(persona.role));
        setActiveUserId(admin?.id ?? "");
        setSelectedParticipantId(firstParticipant?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Inbox failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadInboxData(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Inbox data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadInboxData]);

  useEffect(() => {
    if (!selectedThreadId || !activeUserId) return;

    async function refreshThread() {
      try {
        await loadThreadDetail(activeUserId, selectedThreadId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Thread failed to load.");
      }
    }

    void refreshThread();
  }, [activeUserId, loadThreadDetail, selectedThreadId]);

  async function createSupportThread() {
    if (!activeUserId) {
      setMessage("Select a persona first.");
      return;
    }
    if (activeUserCanSupport && !activeSupportParticipantId) {
      setMessage("Select a participant for support outreach.");
      return;
    }

    setBusyAction("support");
    try {
      const result = await writeApi<{ thread: MessageThreadSummary }>(
        "/api/v1/messages/threads",
        activeUserId,
        {
          participantId: activeUserCanSupport ? activeSupportParticipantId : undefined,
          topic: supportTopic,
        },
      );
      setSelectedThreadId(result.thread.id);
      setMessage("Support thread created.");
      await loadInboxData(activeUserId, result.thread.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Support thread failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function createContextThread(target: "order" | "barter") {
    if (!activeUserId) {
      setMessage("Select a persona first.");
      return;
    }

    const targetId = target === "order" ? selectedOrderId : selectedProposalId;
    if (!targetId) {
      setMessage(target === "order" ? "Select an order first." : "Select a barter proposal first.");
      return;
    }

    setBusyAction(target);
    try {
      const result = await writeApi<{ thread: MessageThreadSummary }>(
        "/api/v1/messages/threads",
        activeUserId,
        target === "order" ? { orderId: targetId } : { barterProposalId: targetId },
      );
      setSelectedThreadId(result.thread.id);
      setMessage(`${labelize(target)} thread ready.`);
      await loadInboxData(activeUserId, result.thread.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Thread creation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function sendMessage() {
    if (!activeUserId || !activeThread) {
      setMessage("Select a thread first.");
      return;
    }

    setBusyAction("send");
    try {
      await writeApi<{ message: unknown }>(
        `/api/v1/messages/threads/${activeThread.id}/messages`,
        activeUserId,
        { body: messageBody },
      );
      setMessageBody("");
      setMessage("Message sent with marketplace contact redaction applied.");
      await Promise.all([
        loadInboxData(activeUserId, activeThread.id),
        loadThreadDetail(activeUserId, activeThread.id),
      ]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Message failed to send.");
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
            Protected messaging
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Inbox</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Support, order, and barter conversations with participant gating, operator visibility,
            and automatic contact redaction.
          </p>
        </div>
        <PersonaSelector
          label="Inbox persona"
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

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-5">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Threads</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Unread</p>
          <p className="mt-2 text-3xl font-semibold">{stats.unread}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Support</p>
          <p className="mt-2 text-3xl font-semibold">{stats.support}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="mt-2 text-3xl font-semibold">{stats.order}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Barter</p>
          <p className="mt-2 text-3xl font-semibold">{stats.barter}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[0.42fr_1fr]">
        <aside className="grid gap-4">
          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-xl font-semibold">Start thread</h2>
            <div className="mt-4 grid gap-3">
              {activeUserCanSupport ? (
                <label className="grid gap-2 text-sm font-medium">
                  Participant
                  <select
                    value={activeSupportParticipantId}
                    onChange={(event) => setSelectedParticipantId(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    <option value="">Choose participant</option>
                    {supportParticipants.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.email ?? persona.name} / {persona.role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm font-medium">
                Support topic
                <input
                  value={supportTopic}
                  onChange={(event) => setSupportTopic(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                />
              </label>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                disabled={busyAction === "support"}
                onClick={() => void createSupportThread()}
              >
                {busyAction === "support" ? "Creating..." : "Create support thread"}
              </button>
            </div>

            <div className="mt-5 grid gap-3 border-t border-border pt-4">
              <label className="grid gap-2 text-sm font-medium">
                Order
                <select
                  value={selectedOrderId}
                  onChange={(event) => setSelectedOrderId(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  <option value="">No order selected</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.listing.title} / {labelize(order.status)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedOrderId || busyAction === "order"}
                onClick={() => void createContextThread("order")}
              >
                {busyAction === "order" ? "Opening..." : "Open order thread"}
              </button>

              <label className="grid gap-2 text-sm font-medium">
                Barter proposal
                <select
                  value={selectedProposalId}
                  onChange={(event) => setSelectedProposalId(event.target.value)}
                  className="rounded-md border border-border bg-white px-3 py-2"
                >
                  <option value="">No proposal selected</option>
                  {proposals.map((proposal) => (
                    <option key={proposal.id} value={proposal.id}>
                      {proposal.targetListing.title} / {labelize(proposal.status)}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!selectedProposalId || busyAction === "barter"}
                onClick={() => void createContextThread("barter")}
              >
                {busyAction === "barter" ? "Opening..." : "Open barter thread"}
              </button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white">
            <div className="border-b border-border p-4">
              <h2 className="text-xl font-semibold">Threads</h2>
            </div>
            <div className="max-h-[42rem] overflow-y-auto">
              {threads.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No visible threads.</div>
              ) : null}

              {threads.map((thread) => {
                const selected = thread.id === selectedThreadId;
                const last = latestMessage(thread);
                return (
                  <button
                    key={thread.id}
                    type="button"
                    className={`grid w-full gap-2 border-b border-border p-4 text-left ${
                      selected ? "bg-background" : "bg-white"
                    }`}
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {labelize(threadKind(thread))} / {labelize(thread.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(thread.updatedAt)}</p>
                    </div>
                    <h3 className="font-semibold">{threadTitle(thread)}</h3>
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{last}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="min-h-[44rem] rounded-md border border-border bg-white">
          {activeThread ? (
            <div className="grid min-h-[44rem] grid-rows-[auto_1fr_auto]">
              <header className="border-b border-border p-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {threadSubtitle(activeThread)}
                </p>
                <h2 className="mt-2 text-3xl font-semibold">{threadTitle(activeThread)}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {activeThread.participants.map((participant) => (
                    <span key={participant.id} className="rounded-md border border-border bg-background px-2 py-1">
                      {participant.user.email ?? participant.user.name ?? participant.userId} /{" "}
                      {labelize(participant.role)}
                    </span>
                  ))}
                </div>
              </header>

              <div className="grid content-start gap-3 overflow-y-auto p-5">
                {activeThread.messages.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background p-6 text-center text-sm text-muted-foreground">
                    No messages have been sent in this thread.
                  </div>
                ) : null}

                {activeThread.messages.map((threadMessage) => {
                  const ownMessage = threadMessage.senderId === activeUserId;
                  return (
                    <article
                      key={threadMessage.id}
                      className={`max-w-3xl rounded-md border border-border p-4 ${
                        ownMessage ? "ml-auto bg-foreground text-background" : "bg-background"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase">
                          {threadMessage.sender.email ?? threadMessage.sender.name ?? threadMessage.senderId}
                        </p>
                        <div className="flex items-center gap-2 text-xs opacity-75">
                          {threadMessage.redacted ? <span>Redacted</span> : null}
                          <span>{formatDate(threadMessage.createdAt)}</span>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{threadMessage.body}</p>
                    </article>
                  );
                })}
              </div>

              <footer className="border-t border-border p-4">
                <label className="grid gap-2 text-sm font-medium">
                  Message
                  <textarea
                    value={messageBody}
                    rows={4}
                    onChange={(event) => setMessageBody(event.target.value)}
                    className="resize-none rounded-md border border-border bg-white px-3 py-2 text-foreground"
                    placeholder="Write a message"
                  />
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Phone numbers, handles, and external links are replaced before display.
                  </p>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!messageBody.trim() || busyAction === "send"}
                    onClick={() => void sendMessage()}
                  >
                    {busyAction === "send" ? "Sending..." : "Send message"}
                  </button>
                </div>
              </footer>
            </div>
          ) : (
            <div className="grid min-h-[44rem] place-items-center p-8 text-center">
              <div>
                <h2 className="text-3xl font-semibold">No thread selected</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Create a support thread or select an order, barter, or support conversation from the list.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
