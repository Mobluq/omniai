"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ModelControls } from "@/components/chat/model-controls";
import { useChatStore } from "@/components/chat/chat-store";
import {
  RecommendationBanner,
  type RecommendationViewModel,
} from "@/components/recommendation/recommendation-banner";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelDisplayName?: string;
};

type WorkspacePayload = {
  workspaces: Array<{ id: string; name: string }>;
};

type ConversationPayload = {
  conversation: { id: string };
};

type RecommendationPayload = {
  recommendation: RecommendationViewModel;
};

type MessagePayload = {
  userMessage: { id: string; content: string };
  assistantMessage: { id: string; content: string; modelDisplayName?: string } | null;
  recommendation: RecommendationViewModel;
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function ChatWorkspace() {
  const { routingMode, selectedModel, setRoutingMode } = useChatStore();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationViewModel | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => prompt.trim().length > 0 && status !== "loading", [prompt, status]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const workspaceResponse = await fetch("/api/workspaces");
      const workspaceEnvelope = await parseEnvelope<WorkspacePayload>(workspaceResponse);

      if (!workspaceEnvelope.success || !workspaceEnvelope.data.workspaces[0]) {
        if (!cancelled) {
          setError("Sign in and create a workspace to use persistent chat.");
        }
        return;
      }

      const workspace = workspaceEnvelope.data.workspaces[0];
      const conversationResponse = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          title: "OmniAI session",
          routingMode,
          provider: selectedModel.provider,
          modelId: selectedModel.modelId,
        }),
      });
      const conversationEnvelope = await parseEnvelope<ConversationPayload>(conversationResponse);

      if (!cancelled && conversationEnvelope.success) {
        setWorkspaceId(workspace.id);
        setConversationId(conversationEnvelope.data.conversation.id);
      }
    }

    bootstrap().catch(() => {
      if (!cancelled) {
        setError("Could not initialize the chat workspace.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routingMode, selectedModel.modelId, selectedModel.provider]);

  async function evaluatePrompt(content: string) {
    if (!workspaceId) {
      return null;
    }

    const response = await fetch("/api/recommendations/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId,
        prompt: content,
        currentProvider: selectedModel.provider,
        currentModelId: selectedModel.modelId,
        routingMode,
      }),
    });

    const envelope = await parseEnvelope<RecommendationPayload>(response);
    return envelope.success ? envelope.data.recommendation : null;
  }

  async function sendToConversation(content: string, acceptRecommendation?: boolean) {
    if (!conversationId) {
      setError("Chat is not connected to a conversation yet.");
      return;
    }

    setStatus("loading");
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        routingMode,
        selectedProvider: selectedModel.provider,
        selectedModelId: selectedModel.modelId,
        acceptRecommendation,
      }),
    });
    const envelope = await parseEnvelope<MessagePayload>(response);

    if (!envelope.success) {
      setStatus("error");
      setError(envelope.error.message);
      return;
    }

    setMessages((current) => [
      ...current,
      { id: envelope.data.userMessage.id, role: "user", content: envelope.data.userMessage.content },
      ...(envelope.data.assistantMessage
        ? [
            {
              id: envelope.data.assistantMessage.id,
              role: "assistant" as const,
              content: envelope.data.assistantMessage.content,
              modelDisplayName: envelope.data.assistantMessage.modelDisplayName,
            },
          ]
        : []),
    ]);
    setRecommendation(envelope.data.assistantMessage ? null : envelope.data.recommendation);
    setPendingPrompt(envelope.data.assistantMessage ? null : content);
    setStatus("idle");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = prompt.trim();

    if (!content) {
      return;
    }

    setError(null);
    setStatus("loading");
    setPrompt("");

    if (routingMode === "suggest") {
      const evaluated = await evaluatePrompt(content);

      if (evaluated?.shouldAskToSwitch) {
        setRecommendation(evaluated);
        setPendingPrompt(content);
        setStatus("idle");
        return;
      }
    }

    await sendToConversation(content, routingMode === "auto" ? true : undefined);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
      <ModelControls />
      <div className="grid min-h-[560px] lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r bg-muted/40 p-4 lg:block">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Conversations</h2>
            <Badge>Personal</Badge>
          </div>
          <div className="mt-4 rounded-md border bg-background p-3 text-sm">
            <p className="font-medium">OmniAI session</p>
            <p className="mt-1 text-xs text-muted-foreground">Routing: {routingMode}</p>
          </div>
        </aside>
        <section className="flex min-h-[560px] flex-col">
          <div className="flex-1 space-y-4 p-4">
            {recommendation && pendingPrompt ? (
              <RecommendationBanner
                recommendation={recommendation}
                loading={status === "loading"}
                onSwitch={() => sendToConversation(pendingPrompt, true)}
                onStay={() => sendToConversation(pendingPrompt, false)}
                onAutoRoute={() => {
                  setRoutingMode("auto");
                  void sendToConversation(pendingPrompt, true);
                }}
              />
            ) : null}
            {messages.length === 0 ? (
              <div className="grid h-72 place-items-center rounded-lg border border-dashed bg-background text-center">
                <div className="max-w-sm px-4">
                  <p className="text-sm font-medium">Start with a task, not a model choice.</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    OmniAI will classify the prompt and recommend a stronger provider when it matters.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`rounded-lg border p-4 ${
                    message.role === "assistant" ? "bg-muted/50" : "bg-background"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
                    {message.role}
                    {message.modelDisplayName ? <Badge>{message.modelDisplayName}</Badge> : null}
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </article>
              ))
            )}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <form className="border-t bg-background p-4" onSubmit={onSubmit}>
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask OmniAI to write, debug, research, summarize, analyze, or generate an image..."
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Provider keys stay server-side. Suggest mode evaluates intent before routing.
              </p>
              <Button type="submit" disabled={!canSend}>
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                Send
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
