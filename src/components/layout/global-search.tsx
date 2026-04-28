"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, Clock3, Loader2, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage, parseApiResponse } from "@/lib/api/client";
import { cn } from "@/lib/utils";

type Workspace = {
  id: string;
  name: string;
};

type SearchResultType = "conversation" | "message" | "project" | "knowledge" | "artifact";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  excerpt: string;
  href: string;
  label: string;
  updatedAt: string;
};

type SearchPayload = {
  query: string;
  results: SearchResult[];
  groups: Record<SearchResultType, SearchResult[]>;
};

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

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "searching" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId),
    [workspaceId, workspaces],
  );
  const trimmedQuery = query.trim();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!workspaces.length) {
          setStatus("loading");
        }
        setOpen(true);
      }

      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [workspaces.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspaces() {
      const result = await parseApiResponse<{ workspaces: Workspace[] }>(await fetch("/api/workspaces"));

      if (!cancelled) {
        setWorkspaces(result.workspaces);
        setWorkspaceId((current) => current || result.workspaces[0]?.id || "");
        setStatus("idle");
      }
    }

    if (!open || workspaces.length) {
      return;
    }

    loadWorkspaces().catch((loadError: unknown) => {
      if (!cancelled) {
        setStatus("error");
        setError(errorMessage(loadError, "Search could not be loaded."));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, workspaces.length]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      if (!workspaceId || trimmedQuery.length < 2) {
        setPayload(null);
        return;
      }

      setStatus("searching");
      setError(null);
      const params = new URLSearchParams({
        workspaceId,
        q: trimmedQuery,
        limit: "6",
      });
      const result = await parseApiResponse<SearchPayload>(await fetch(`/api/search?${params.toString()}`));

      if (!cancelled) {
        setPayload(result);
        setStatus("idle");
      }
    }

    if (!open) {
      return;
    }

    const timeout = window.setTimeout(() => {
      runSearch().catch((searchError: unknown) => {
        if (!cancelled) {
          setStatus("error");
          setError(errorMessage(searchError, "Search failed."));
        }
      });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [open, trimmedQuery, workspaceId]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trimmedQuery.length >= 2) {
      window.location.href = `/search?q=${encodeURIComponent(trimmedQuery)}`;
    }
  }

  function openSearch() {
    if (!workspaces.length) {
      setStatus("loading");
    }

    setOpen(true);
  }

  const results = payload?.results ?? [];

  return (
    <>
      <div className="relative hidden min-w-0 flex-1 px-4 md:block">
        <form onSubmit={onSubmit}>
          <button
            type="button"
            className={cn(
              "flex h-10 w-full items-center gap-3 rounded-lg border border-border/70 bg-card/75 px-3 text-left text-sm text-muted-foreground shadow-line transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
              open ? "border-ring/50 bg-card" : null,
            )}
            onClick={openSearch}
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Search chats, prompts, projects, knowledge...</span>
            <span className="ml-auto hidden rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[0.65rem] text-muted-foreground lg:inline">
              Ctrl K
            </span>
          </button>
          {open ? (
            <div className="absolute left-4 right-4 top-12 z-40 overflow-hidden rounded-lg border border-border/80 bg-card shadow-panel">
              <div className="border-b border-border/70 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search your workspace..."
                    className="pl-9 pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setOpen(false)}
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {activeWorkspace ? `Searching ${activeWorkspace.name}` : "Open a workspace to search."}
                </p>
              </div>
              <SearchResults
                query={trimmedQuery}
                results={results}
                status={status}
                error={error}
                onNavigate={() => setOpen(false)}
              />
            </div>
          ) : null}
        </form>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={openSearch}
        aria-label="Search"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </Button>

      {open ? (
        <div className="fixed inset-x-3 top-20 z-50 overflow-hidden rounded-lg border border-border/80 bg-card shadow-panel md:hidden">
          <form className="border-b border-border/70 p-3" onSubmit={onSubmit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search OmniAI..."
                className="pl-9 pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
                aria-label="Close search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </form>
          <SearchResults
            query={trimmedQuery}
            results={results}
            status={status}
            error={error}
            onNavigate={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}

function SearchResults({
  query,
  results,
  status,
  error,
  onNavigate,
}: {
  query: string;
  results: SearchResult[];
  status: "idle" | "loading" | "searching" | "error";
  error: string | null;
  onNavigate: () => void;
}) {
  if (status === "loading") {
    return (
      <div className="grid h-48 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error") {
    return <div className="p-4 text-sm text-destructive">{error ?? "Search failed."}</div>;
  }

  if (query.length < 2) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Type at least two characters to search conversations, messages, projects, knowledge, and artifacts.
      </div>
    );
  }

  if (!results.length && status !== "searching") {
    return <div className="p-4 text-sm text-muted-foreground">No matches found for {query}.</div>;
  }

  return (
    <div className="thin-scrollbar max-h-[420px] overflow-auto">
      {status === "searching" ? (
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Searching
        </div>
      ) : null}
      <div className="divide-y divide-border/70">
        {results.map((result) => (
          <Link
            key={`${result.type}:${result.id}`}
            href={result.href}
            onClick={onNavigate}
            className="block px-4 py-3 transition hover:bg-muted/55"
          >
            <div className="flex items-start gap-3">
              <Badge className="mt-0.5 bg-muted">{result.label}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{result.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{result.excerpt}</p>
                <p className="mt-2 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  <Clock3 className="h-3 w-3" aria-hidden="true" />
                  {formatRelative(result.updatedAt)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href={`/search?q=${encodeURIComponent(query)}`}
        onClick={onNavigate}
        className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm font-semibold hover:bg-muted/55"
      >
        View all search results
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
