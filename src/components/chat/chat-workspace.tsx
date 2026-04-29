"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  MessageSquare,
  Plus,
  Search,
  SendHorizontal,
  Trash2,
} from "@/components/ui/huge-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { ModelControls } from "@/components/chat/model-controls";
import { ProviderLogo } from "@/components/integrations/provider-logo";
import { useChatStore, type RoutingMode } from "@/components/chat/chat-store";
import { errorMessage } from "@/lib/api/client";
import { modelRegistry } from "@/modules/ai/registry/model-registry";
import {
  RecommendationBanner,
  type RecommendationViewModel,
} from "@/components/recommendation/recommendation-banner";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  provider?: string | null;
  modelId?: string | null;
  modelDisplayName?: string | null;
  createdAt?: string;
};

type ConversationListItem = {
  id: string;
  title: string;
  routingMode: RoutingMode;
  activeProvider?: string | null;
  activeModelId?: string | null;
  updatedAt: string;
  messages: ChatMessage[];
};

type WorkspacePayload = {
  workspaces: Array<{
    id: string;
    name: string;
    defaultRoutingMode?: RoutingMode;
    defaultModelId?: string | null;
  }>;
};

type ConversationPayload = {
  conversation: ConversationListItem;
};

type ConversationListPayload = {
  conversations: ConversationListItem[];
};

type MessagePayload = {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage | null;
  recommendation: RecommendationViewModel;
  routingDecision: {
    provider: string;
    modelId: string;
    modelDisplayName: string;
    mode: RoutingMode;
  } | null;
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

function formatRelative(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return date.toLocaleDateString();
}

function upsertMessage(messages: ChatMessage[], message: ChatMessage) {
  const exists = messages.some((item) => item.id === message.id);
  return exists
    ? messages.map((item) => (item.id === message.id ? message : item))
    : [...messages, message];
}

function getConversationTitle(conversation: ConversationListItem) {
  if (conversation.title && conversation.title !== "New conversation") {
    return conversation.title;
  }

  const firstMessage = conversation.messages.find((message) => message.role === "user")?.content;
  return firstMessage ? firstMessage.slice(0, 70) : "New conversation";
}

function getConversationPreview(conversation: ConversationListItem) {
  return conversation.messages.at(-1)?.content ?? "No messages yet";
}

function formatRoleLabel(role: ChatMessage["role"]) {
  if (role === "assistant") {
    return "OmniAI";
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

function MessageContent({ content }: { content: string }) {
  const imageMatch = content.match(/!\[(.*?)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)/);

  if (!imageMatch) {
    return <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>;
  }

  const [markdown, alt, src] = imageMatch;
  const before = content.slice(0, content.indexOf(markdown)).trim();
  const after = content.slice(content.indexOf(markdown) + markdown.length).trim();

  return (
    <div className="grid gap-3">
      {before ? <p className="whitespace-pre-wrap text-sm leading-6">{before}</p> : null}
      <Image
        src={src}
        alt={alt || "Generated image"}
        width={1024}
        height={1024}
        unoptimized
        className="max-h-[520px] w-full rounded-md border object-contain"
      />
      {after ? <p className="whitespace-pre-wrap text-sm leading-6">{after}</p> : null}
    </div>
  );
}

export function ChatWorkspace() {
  const { toast } = useToast();
  const { routingMode, selectedModel, setRoutingMode, setSelectedModel } = useChatStore();
  const [workspace, setWorkspace] = useState<{ id: string; name: string } | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationViewModel | null>(null);
  const [status, setStatus] = useState<"booting" | "idle" | "loading" | "error">("booting");
  const [error, setError] = useState<string | null>(null);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === conversationId,
  );
  const canSend = useMemo(
    () => prompt.trim().length > 0 && Boolean(conversationId) && status !== "loading",
    [conversationId, prompt, status],
  );

  async function refreshConversations(workspaceId = workspace?.id) {
    if (!workspaceId) {
      return [];
    }

    const response = await fetch(`/api/conversations?workspaceId=${workspaceId}`);
    const envelope = await parseEnvelope<ConversationListPayload>(response);

    if (!envelope.success) {
      throw new Error(envelope.error.message);
    }

    setConversations(envelope.data.conversations);
    return envelope.data.conversations;
  }

  async function openConversation(id: string) {
    setStatus("loading");
    setError(null);
    const response = await fetch(`/api/conversations/${id}`);
    const envelope = await parseEnvelope<ConversationPayload>(response);

    if (!envelope.success) {
      setError(envelope.error.message);
      toast({
        title: "Conversation could not be opened",
        description: envelope.error.message,
        variant: "error",
      });
      setStatus("error");
      return;
    }

    const conversation = envelope.data.conversation;
    setConversationId(conversation.id);
    setMessages(conversation.messages);
    setRecommendation(null);
    setPendingMessageId(null);
    setRoutingMode(conversation.routingMode);

    if (conversation.activeProvider && conversation.activeModelId) {
      setSelectedModel({
        provider: conversation.activeProvider,
        modelId: conversation.activeModelId,
      });
    }

    setStatus("idle");
  }

  async function createConversation(
    workspaceId = workspace?.id,
    activeProjectId = projectId,
    defaults?: {
      routingMode?: RoutingMode;
      provider?: string;
      modelId?: string;
    },
  ) {
    if (!workspaceId) {
      return;
    }

    setStatus("loading");
    setError(null);
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        projectId: activeProjectId ?? undefined,
        title: "New conversation",
        routingMode: defaults?.routingMode ?? routingMode,
        provider: defaults?.provider ?? selectedModel.provider,
        modelId: defaults?.modelId ?? selectedModel.modelId,
      }),
    });
    const envelope = await parseEnvelope<ConversationPayload>(response);

    if (!envelope.success) {
      setError(envelope.error.message);
      toast({
        title: "Conversation could not be created",
        description: envelope.error.message,
        variant: "error",
      });
      setStatus("error");
      return;
    }

    setConversationId(envelope.data.conversation.id);
    setMessages([]);
    setRecommendation(null);
    setPendingMessageId(null);
    await refreshConversations(workspaceId);
    setStatus("idle");
    toast({ title: "New conversation created", variant: "success" });
  }

  async function deleteConversation(id: string) {
    if (!workspace) {
      return;
    }

    const deleteResponse = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    const deleteEnvelope = await parseEnvelope<{ archived: boolean }>(deleteResponse);

    if (!deleteEnvelope.success) {
      toast({
        title: "Conversation could not be deleted",
        description: deleteEnvelope.error.message,
        variant: "error",
      });
      return;
    }

    const updated = await refreshConversations(workspace.id);
    const next = updated.find((conversation) => conversation.id !== id);

    if (conversationId === id) {
      if (next) {
        await openConversation(next.id);
      } else {
        await createConversation(workspace.id);
      }
    }

    toast({ title: "Conversation deleted", variant: "success" });
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      setStatus("booting");
      const workspaceResponse = await fetch("/api/workspaces");
      const workspaceEnvelope = await parseEnvelope<WorkspacePayload>(workspaceResponse);

      if (!workspaceEnvelope.success || !workspaceEnvelope.data.workspaces[0]) {
        throw new Error("Sign in and create a workspace to use persistent chat.");
      }

      const activeWorkspace = workspaceEnvelope.data.workspaces[0];
      const defaultModel = activeWorkspace.defaultModelId
        ? modelRegistry.find((model) => model.modelId === activeWorkspace.defaultModelId)
        : null;
      const initialRoutingMode = activeWorkspace.defaultRoutingMode ?? routingMode;
      const initialModel = defaultModel
        ? { provider: defaultModel.provider, modelId: defaultModel.modelId }
        : selectedModel;
      const requestedProjectId =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("projectId");
      if (cancelled) {
        return;
      }

      setWorkspace(activeWorkspace);
      setProjectId(requestedProjectId);
      setRoutingMode(initialRoutingMode);
      setSelectedModel(initialModel);
      const list = await refreshConversations(activeWorkspace.id);

      if (cancelled) {
        return;
      }

      const requestedConversationId =
        typeof window === "undefined"
          ? null
          : new URLSearchParams(window.location.search).get("conversationId");
      const initialConversation =
        list.find((conversation) => conversation.id === requestedConversationId) ?? list[0];

      if (initialConversation) {
        await openConversation(initialConversation.id);
      } else {
        await createConversation(activeWorkspace.id, requestedProjectId, {
          routingMode: initialRoutingMode,
          provider: initialModel.provider,
          modelId: initialModel.modelId,
        });
      }
    }

    bootstrap().catch((bootError: unknown) => {
      if (!cancelled) {
        const message = errorMessage(bootError, "Could not initialize chat.");
        setError(message);
        toast({ title: "Chat could not be loaded", description: message, variant: "error" });
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
    // Bootstrap should run once; controls are applied when a conversation is created or selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyMessagePayload(payload: MessagePayload) {
    setMessages((current) => {
      const withUser = upsertMessage(current, payload.userMessage);
      return payload.assistantMessage
        ? upsertMessage(withUser, payload.assistantMessage)
        : withUser;
    });

    if (payload.routingDecision) {
      setSelectedModel({
        provider: payload.routingDecision.provider,
        modelId: payload.routingDecision.modelId,
      });
      setRoutingMode(payload.routingDecision.mode);
    }

    setRecommendation(payload.assistantMessage ? null : payload.recommendation);
    setPendingMessageId(payload.assistantMessage ? null : payload.userMessage.id);

    if (!payload.assistantMessage && payload.recommendation?.shouldAskToSwitch) {
      toast({
        title: "Model recommendation ready",
        description: `${payload.recommendation.recommendedModelDisplayName} may be better for this task.`,
        variant: "info",
      });
    }
  }

  async function sendToConversation(input: {
    content?: string;
    pendingId?: string;
    acceptRecommendation?: boolean;
    routingModeOverride?: RoutingMode;
  }) {
    if (!conversationId) {
      setError("Chat is not connected to a conversation yet.");
      toast({
        title: "Chat is not ready",
        description: "Open or create a conversation first.",
        variant: "error",
      });
      return;
    }

    setStatus("loading");
    setError(null);
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: input.content,
        pendingMessageId: input.pendingId,
        routingMode: input.routingModeOverride ?? routingMode,
        selectedProvider: selectedModel.provider,
        selectedModelId: selectedModel.modelId,
        acceptRecommendation: input.acceptRecommendation,
      }),
    });
    const envelope = await parseEnvelope<MessagePayload>(response);

    if (!envelope.success) {
      setStatus("error");
      setError(envelope.error.message);
      toast({ title: "Message failed", description: envelope.error.message, variant: "error" });
      return;
    }

    applyMessagePayload(envelope.data);
    setStatus("idle");

    if (envelope.data.assistantMessage) {
      toast({
        title: "Response ready",
        description: `${envelope.data.assistantMessage.modelDisplayName ?? "Selected model"} answered.`,
        variant: "success",
      });
    }

    if (workspace) {
      void refreshConversations(workspace.id);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();

    if (!content) {
      return;
    }

    setPrompt("");
    await sendToConversation({
      content,
      acceptRecommendation: routingMode === "auto" ? true : undefined,
    });
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    const form = event.currentTarget.form;
    if (form) {
      form.requestSubmit();
    }
  }

  return (
    <div className="page-shell overflow-hidden rounded-[1.35rem] border border-border/80 bg-card/95 shadow-panel">
      <ModelControls />
      <div className="grid min-h-[calc(100svh-12rem)] lg:min-h-[720px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-b border-border/70 bg-[#edf7f9] p-3 lg:block lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">History</h2>
              <p className="mt-1 text-xs text-muted-foreground">{workspace?.name ?? "Workspace"}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl"
              onClick={() => createConversation()}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New
            </Button>
          </div>

          <div className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-border/70 bg-white px-3 text-sm text-muted-foreground">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="truncate">
              {conversations.length} threads in {routingMode} mode
            </span>
          </div>

          <div className="thin-scrollbar mt-3 grid max-h-[calc(100svh-18rem)] gap-1.5 overflow-auto pr-1">
            {conversations.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-white p-4 text-sm text-muted-foreground">
                No conversations yet.
              </div>
            ) : (
              conversations.map((conversation) => (
                <article
                  key={conversation.id}
                  className={`group flex items-start gap-2 rounded-xl border p-3 transition-all ${
                    conversation.id === conversationId
                      ? "border-[#c93a29]/35 bg-white shadow-[0_16px_38px_-30px_rgba(28,54,82,0.55)]"
                      : "border-transparent bg-transparent hover:border-border/70 hover:bg-white"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => openConversation(conversation.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                        <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <p className="truncate text-sm font-semibold">
                        {getConversationTitle(conversation)}
                      </p>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {getConversationPreview(conversation)}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        className={
                          conversation.routingMode === "auto"
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "bg-muted"
                        }
                      >
                        {conversation.routingMode}
                      </Badge>
                      <span>{formatRelative(conversation.updatedAt)}</span>
                    </div>
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 opacity-70 lg:opacity-0 lg:group-hover:opacity-100"
                    onClick={() => deleteConversation(conversation.id)}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </article>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[calc(100svh-12rem)] flex-col bg-[#f7fbfc] lg:min-h-[720px]">
          <div className="grid gap-3 border-b border-border/70 bg-white p-3 lg:hidden">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Chat</p>
                <p className="truncate text-xs text-muted-foreground">
                  {workspace?.name ?? "Workspace"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => createConversation()}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New
              </Button>
            </div>
            <Select
              aria-label="Open conversation"
              value={conversationId ?? ""}
              onChange={(event) => {
                if (event.target.value) {
                  void openConversation(event.target.value);
                }
              }}
            >
              {conversations.length ? (
                conversations.map((conversation) => (
                  <option key={conversation.id} value={conversation.id}>
                    {getConversationTitle(conversation)}
                  </option>
                ))
              ) : (
                <option value="">No conversations yet</option>
              )}
            </Select>
          </div>
          <div className="border-b border-border/70 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="group/provider flex min-w-0 items-center gap-3">
                <ProviderLogo provider={selectedModel.provider} className="h-9 w-9 rounded-lg" />
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold tracking-tight">
                    {activeConversation
                      ? getConversationTitle(activeConversation)
                      : "New conversation"}
                  </h2>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {selectedModel.provider} / {selectedModel.modelId}
                  </p>
                </div>
              </div>
              <Badge
                className={
                  routingMode === "auto"
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : undefined
                }
              >
                {routingMode}
              </Badge>
            </div>
          </div>

          <div className="thin-scrollbar flex-1 space-y-5 overflow-auto bg-[#f7fbfc] px-3 py-4 sm:px-5 lg:px-8">
            {recommendation && pendingMessageId ? (
              <RecommendationBanner
                recommendation={recommendation}
                loading={status === "loading"}
                onSwitch={() =>
                  sendToConversation({
                    pendingId: pendingMessageId,
                    acceptRecommendation: true,
                  })
                }
                onStay={() =>
                  sendToConversation({
                    pendingId: pendingMessageId,
                    acceptRecommendation: false,
                  })
                }
                onAutoRoute={() => {
                  setRoutingMode("auto");
                  void sendToConversation({
                    pendingId: pendingMessageId,
                    acceptRecommendation: true,
                    routingModeOverride: "auto",
                  });
                }}
              />
            ) : null}

            {status === "booting" ? (
              <div className="grid h-72 place-items-center rounded-xl border border-dashed bg-card">
                <div className="grid w-full max-w-sm gap-3 px-6">
                  <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
                  <div className="h-20 animate-pulse rounded-xl bg-muted/70" />
                  <div className="h-3 w-40 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed bg-white text-center">
                <div className="max-w-md px-4 py-10">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                    <MessageSquare className="h-7 w-7 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium">Start with the work you need done.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    OmniAI will store the conversation and recommend a stronger model before
                    switching.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl border px-4 py-3 shadow-line sm:max-w-[78%] ${
                      message.role === "user"
                        ? "rounded-br-md border-[#c9d8dc] bg-[#f6ded9]"
                        : "rounded-bl-md border-border/70 bg-white"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {formatRoleLabel(message.role)}
                      {message.modelDisplayName ? <Badge>{message.modelDisplayName}</Badge> : null}
                    </div>
                    <MessageContent content={message.content} />
                  </div>
                </article>
              ))
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <form
            className="sticky bottom-0 border-t border-border/70 bg-white/95 p-3 shadow-[0_-18px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-4"
            onSubmit={onSubmit}
          >
            <div className="relative">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder="Message OmniAI..."
                disabled={status === "booting"}
                className="min-h-14 rounded-2xl bg-white py-3 pl-4 pr-14 text-base shadow-none sm:min-h-16 sm:text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!canSend}
                className="absolute bottom-2.5 right-2.5 h-10 w-10 rounded-xl"
                aria-label="Send message"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Enter sends. Shift+Enter adds a new line. Suggest mode asks before switching.
              </p>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
