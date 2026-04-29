"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Bot, HelpCircle, SendHorizontal, Sparkles, X } from "lucide-react";
import { gsap } from "gsap";
import {
  OMNIAI_ERROR_EVENT,
  type OmniAIErrorEventDetail,
} from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WorkerMessage = {
  id: string;
  role: "worker" | "user";
  body: string;
  tone?: "normal" | "error";
};

const starterMessages: WorkerMessage[] = [
  {
    id: "welcome",
    role: "worker",
    body:
      "I can explain OmniAI, help you connect providers, troubleshoot chat errors, and point you to the right section of the app.",
  },
];

const quickQuestions = [
  "Why did chat fail?",
  "How do I connect OpenAI or Claude?",
  "How does routing pick the best model?",
  "Where is my chat history?",
  "What should I test before launch?",
];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getWorkerAnswer(question: string) {
  const normalized = question.toLowerCase();

  if (normalized.includes("chat") || normalized.includes("fail") || normalized.includes("error")) {
    return [
      "Chat errors usually come from one of four places: no enabled provider in Settings, an invalid provider key, the selected model not being available for that key, or provider billing/rate limits.",
      "Open Settings > AI provider connections, test the provider, then return to Chat and make sure the selected model belongs to a connected provider. OmniAI keeps provider keys server-side and logs failed provider attempts for review.",
    ].join(" ");
  }

  if (
    normalized.includes("openai") ||
    normalized.includes("claude") ||
    normalized.includes("anthropic") ||
    normalized.includes("gemini") ||
    normalized.includes("mistral") ||
    normalized.includes("stability") ||
    normalized.includes("bedrock") ||
    normalized.includes("amazon") ||
    normalized.includes("provider") ||
    normalized.includes("key")
  ) {
    return [
      "Provider setup lives in Settings > AI providers. Add the provider key there, keep it enabled, run the test action, and set a workspace default model if you want chat to use it first.",
      "OpenAI, Anthropic Claude, Gemini, Mistral, Stability, and Amazon Bedrock should all stay on the server. Do not place keys in browser code or public environment variables.",
    ].join(" ");
  }

  if (normalized.includes("routing") || normalized.includes("best") || normalized.includes("model")) {
    return [
      "OmniAI does not send the prompt blindly first. It stores the user message, classifies the task, checks the current routing mode, then scores available configured models.",
      "The current scoring weighs capability match, intent, provider availability, speed, cost tier, quality strengths, context needs, and workspace restrictions. Manual uses your selected model, Suggest asks before switching, and Auto routes directly.",
    ].join(" ");
  }

  if (normalized.includes("history") || normalized.includes("conversation") || normalized.includes("old chat")) {
    return [
      "Conversation history is in Chat and the dashboard recent conversations area. Each conversation belongs to a workspace, and messages store role, provider, model, metadata, and usage records so future history, search, and billing stay connected.",
      "Use global search in the header to find chats, messages, knowledge, projects, and artifacts from one place.",
    ].join(" ");
  }

  if (normalized.includes("usage") || normalized.includes("cost") || normalized.includes("bill")) {
    return [
      "Usage is tracked by workspace, user, provider, model, request type, token estimate, cost estimate, and success state. The Usage page shows model/provider breakdowns, and billing enforcement can be layered on top of those logs.",
    ].join(" ");
  }

  if (normalized.includes("knowledge") || normalized.includes("memory") || normalized.includes("file")) {
    return [
      "Knowledge and memory are designed as workspace-scoped sources, documents, chunks, embeddings, and retrieval context. The app has the foundation for shared memory; production file parsing and background embedding jobs still need to be connected before heavy document workflows.",
    ].join(" ");
  }

  if (normalized.includes("test") || normalized.includes("launch") || normalized.includes("qa")) {
    return [
      "Before launch, verify signup, login, provider connection tests, chat send, recommendation display, history persistence, search, notifications, usage logging, mobile navigation, rate limits, and workspace authorization.",
      "For AI providers, test both a successful request and a bad-key failure so users get clean errors instead of raw provider messages.",
    ].join(" ");
  }

  return [
    "I can help with provider setup, chat failures, routing decisions, workspace data, usage, notifications, and launch checks.",
    "Ask me a product question, or open the section you need from the sidebar. If an error happens, I will open automatically with the likely cause and next step.",
  ].join(" ");
}

function explainError(detail: OmniAIErrorEventDetail) {
  const description = detail.description ? ` Details: ${detail.description}` : "";

  return [
    `I noticed this error: ${detail.title}.${description}`,
    "Most OmniAI errors are caused by authentication, workspace permission checks, provider configuration, rate limits, or a temporary upstream provider failure.",
    "If this happened while chatting, check Settings > AI providers, confirm the provider test passes, then retry with a model from an enabled provider.",
  ].join(" ");
}

export function AppAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<WorkerMessage[]>(starterMessages);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const hasErrorContext = useMemo(() => messages.some((message) => message.tone === "error"), [messages]);

  useEffect(() => {
    function onError(event: Event) {
      const detail = (event as CustomEvent<OmniAIErrorEventDetail>).detail;

      if (!detail?.title) {
        return;
      }

      setOpen(true);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "worker",
          tone: "error",
          body: explainError(detail),
        },
      ]);
    }

    window.addEventListener(OMNIAI_ERROR_EVENT, onError);
    return () => window.removeEventListener(OMNIAI_ERROR_EVENT, onError);
  }, []);

  useEffect(() => {
    if (open && panelRef.current) {
      gsap.fromTo(
        panelRef.current,
        { autoAlpha: 0, y: 18, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: "power2.out" },
      );
    }
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, open]);

  function submitQuestion(question: string) {
    const trimmed = question.trim();

    if (!trimmed) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: createId(), role: "user", body: trimmed },
      { id: createId(), role: "worker", body: getWorkerAnswer(trimmed) },
    ]);
    setInput("");
    setOpen(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-[90]">
      {open ? (
        <div
          ref={panelRef}
          className="fixed inset-x-3 bottom-3 flex h-[min(78dvh,620px)] flex-col overflow-hidden rounded-2xl border border-[#d9e3eb] bg-white shadow-[0_22px_80px_rgba(17,20,24,0.22)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:h-[min(72dvh,620px)] sm:w-[420px]"
          role="dialog"
          aria-label="OmniAI worker"
        >
          <div className="flex min-h-[68px] items-center justify-between border-b border-[#d9e3eb] px-4">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                  hasErrorContext ? "bg-[#fff1f2] text-[#c93a46]" : "bg-[#eaf4ff] text-[#2f7cf6]",
                )}
              >
                {hasErrorContext ? (
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Bot className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#111418]">OmniAI Worker</p>
                <p className="mt-0.5 truncate text-xs text-[#667381]">
                  Product help, provider setup, and error guidance
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl"
              onClick={() => setOpen(false)}
              aria-label="Close OmniAI worker"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          <div ref={listRef} className="thin-scrollbar flex-1 overflow-auto bg-[#f7fafd] px-4 py-4">
            <div className="grid gap-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[92%] rounded-2xl border px-3.5 py-3 text-sm leading-6 shadow-sm",
                    message.role === "user"
                      ? "ml-auto border-[#2f7cf6] bg-[#2f7cf6] text-white"
                      : message.tone === "error"
                        ? "mr-auto border-[#ffd7dc] bg-white text-[#111418]"
                        : "mr-auto border-[#d9e3eb] bg-white text-[#111418]",
                  )}
                >
                  {message.body}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#d9e3eb] bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {quickQuestions.map((question) => (
                <button
                  key={question}
                  type="button"
                  className="shrink-0 rounded-full border border-[#d9e3eb] bg-[#f7fafd] px-3 py-1.5 text-xs font-medium text-[#404955] transition hover:border-[#b9cfe0] hover:bg-[#eef6ff]"
                  onClick={() => submitQuestion(question)}
                >
                  {question}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex items-end gap-2">
              <label className="sr-only" htmlFor="omniai-worker-input">
                Ask OmniAI Worker
              </label>
              <textarea
                id="omniai-worker-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about setup, errors, routing, or history..."
                className="min-h-11 flex-1 resize-none rounded-2xl border border-[#d9e3eb] bg-white px-3 py-2.5 text-sm leading-5 outline-none transition placeholder:text-[#8a95a1] focus:border-[#2f7cf6] focus:ring-4 focus:ring-[#2f7cf6]/10"
                rows={1}
              />
              <Button type="submit" size="icon" className="h-11 w-11 rounded-2xl" aria-label="Send question">
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className={cn(
          "flex h-12 items-center gap-2 rounded-full border border-[#d9e3eb] bg-white px-4 text-sm font-semibold text-[#111418] shadow-[0_16px_50px_rgba(17,20,24,0.16)] transition hover:-translate-y-0.5 hover:border-[#b9cfe0] hover:bg-[#f7fafd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f7cf6]/20",
          open ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        onClick={() => setOpen(true)}
        aria-label="Open OmniAI worker"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#eaf4ff] text-[#2f7cf6]">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="hidden sm:inline">OmniAI Worker</span>
        <Sparkles className="hidden h-4 w-4 text-[#1aa65c] sm:block" aria-hidden="true" />
      </button>
    </div>
  );
}
