"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Clock3, Loader2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { errorMessage, parseApiResponse } from "@/lib/api/client";

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

const resultLabels: Record<SearchResultType, string> = {
  conversation: "Conversations",
  message: "Messages",
  project: "Projects",
  knowledge: "Knowledge",
  artifact: "Artifacts",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SearchWorkspace() {
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [query, setQuery] = useState("");
  const [payload, setPayload] = useState<SearchPayload | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "searching" | "error">("loading");

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceId),
    [workspaceId, workspaces],
  );
  const activePayload = query.trim().length >= 2 ? payload : null;

  async function loadWorkspaces() {
    const result = await parseApiResponse<{ workspaces: Workspace[] }>(await fetch("/api/workspaces"));
    setWorkspaces(result.workspaces);
    setWorkspaceId((current) => current || result.workspaces[0]?.id || "");
    setStatus("ready");
  }

  async function runSearch(searchQuery = query, activeWorkspaceId = workspaceId) {
    const trimmed = searchQuery.trim();

    if (!activeWorkspaceId || trimmed.length < 2) {
      setPayload(null);
      return;
    }

    setStatus("searching");
    const params = new URLSearchParams({
      workspaceId: activeWorkspaceId,
      q: trimmed,
      limit: "8",
    });
    const result = await parseApiResponse<SearchPayload>(await fetch(`/api/search?${params.toString()}`));
    setPayload(result);
    setStatus("ready");
  }

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(() => {
      loadWorkspaces().catch((loadError: unknown) => {
        if (!cancelled) {
          setStatus("error");
          toast({
            title: "Search could not be loaded",
            description: errorMessage(loadError),
            variant: "error",
          });
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
    // Load once; workspace changes are driven by the selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!workspaceId || query.trim().length < 2) {
      return;
    }

    const timeout = window.setTimeout(() => {
      runSearch(query, workspaceId).catch((searchError: unknown) => {
        setStatus("error");
        toast({
          title: "Search failed",
          description: errorMessage(searchError),
          variant: "error",
        });
      });
    }, 350);

    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, workspaceId]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runSearch().catch((searchError: unknown) => {
      setStatus("error");
      toast({
        title: "Search failed",
        description: errorMessage(searchError),
        variant: "error",
      });
    });
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error" && !workspaces.length) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Search could not be initialized. Sign in and try again.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Global search</CardTitle>
            </div>
            <CardDescription>
              Search conversations, messages, projects, knowledge, and artifacts in {activeWorkspace?.name ?? "workspace"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 sm:grid-cols-[1fr_190px_auto] sm:items-end" onSubmit={onSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="searchQuery">Search terms</Label>
                <Input
                  id="searchQuery"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search a client, prompt, project, document, or artifact..."
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workspaceId">Workspace</Label>
                <Select
                  id="workspaceId"
                  value={workspaceId}
                  onChange={(event) => setWorkspaceId(event.target.value)}
                >
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" disabled={status === "searching" || query.trim().length < 2}>
                {status === "searching" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="h-4 w-4" aria-hidden="true" />
                )}
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-3">
          {!activePayload && query.trim().length < 2 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              Type at least two characters to search your workspace.
            </div>
          ) : null}

          {activePayload && activePayload.results.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              No results found for {activePayload.query}.
            </div>
          ) : null}

          {activePayload?.results.map((result) => (
            <Link
              key={`${result.type}:${result.id}`}
              href={result.href}
              className="block rounded-lg border bg-card p-4 transition hover:border-primary/50 hover:shadow-soft"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-muted">{result.label}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatDate(result.updatedAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-base font-semibold">{result.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.excerpt}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Result breakdown</CardTitle>
            <CardDescription>Matches grouped by workspace object.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {(Object.keys(resultLabels) as SearchResultType[]).map((type) => (
              <div key={type} className="flex items-center justify-between rounded-md border p-3">
                <span className="text-sm font-medium">{resultLabels[type]}</span>
                <Badge className="bg-muted">{activePayload?.groups[type]?.length ?? 0}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
