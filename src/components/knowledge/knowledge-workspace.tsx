"use client";

import { FormEvent, useEffect, useState } from "react";
import { BookOpen, Loader2, Plus } from "@/components/ui/huge-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/api/client";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

type Workspace = { id: string; name: string };
type Project = { id: string; name: string };
type KnowledgeSource = {
  id: string;
  title: string;
  type: "note" | "url" | "file";
  sourceUri?: string | null;
  projectId?: string | null;
  createdAt: string;
  documents: Array<{
    sanitizedText?: string | null;
    chunks: Array<{ content: string }>;
  }>;
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function KnowledgeWorkspace({ initialProjectId }: { initialProjectId?: string }) {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [projectId, setProjectId] = useState(initialProjectId ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<KnowledgeSource["type"]>("note");
  const [sourceUri, setSourceUri] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load(activeProjectId = projectId) {
    const workspaceResponse = await fetch("/api/workspaces");
    const workspaceEnvelope = await parseEnvelope<{ workspaces: Workspace[] }>(workspaceResponse);

    if (!workspaceEnvelope.success || !workspaceEnvelope.data.workspaces[0]) {
      throw new Error("No workspace found.");
    }

    const activeWorkspace = workspaceEnvelope.data.workspaces[0];
    const [projectResponse, knowledgeResponse] = await Promise.all([
      fetch(`/api/projects?workspaceId=${activeWorkspace.id}`),
      fetch(
        `/api/knowledge?workspaceId=${activeWorkspace.id}${
          activeProjectId ? `&projectId=${activeProjectId}` : ""
        }`,
      ),
    ]);
    const projectEnvelope = await parseEnvelope<{ projects: Project[] }>(projectResponse);
    const knowledgeEnvelope = await parseEnvelope<{ knowledgeSources: KnowledgeSource[] }>(
      knowledgeResponse,
    );

    if (!projectEnvelope.success) {
      throw new Error(projectEnvelope.error.message);
    }

    if (!knowledgeEnvelope.success) {
      throw new Error(knowledgeEnvelope.error.message);
    }

    setWorkspace(activeWorkspace);
    setProjects(projectEnvelope.data.projects);
    setSources(knowledgeEnvelope.data.knowledgeSources);
  }

  useEffect(() => {
    // The initial load synchronizes the client workspace view with authenticated API state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(initialProjectId ?? "")
      .then(() => setStatus("ready"))
      .catch((loadError: unknown) => {
        const message = errorMessage(loadError, "Could not load knowledge.");
        setError(message);
        toast({ title: "Knowledge could not be loaded", description: message, variant: "error" });
        setStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  async function onProjectChange(nextProjectId: string) {
    setProjectId(nextProjectId);
    setStatus("loading");
    try {
      await load(nextProjectId);
      setStatus("ready");
    } catch (loadError: unknown) {
      const message = errorMessage(loadError, "Could not load knowledge.");
      setError(message);
      toast({ title: "Knowledge could not be loaded", description: message, variant: "error" });
      setStatus("error");
    }
  }

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace || !title.trim() || !content.trim()) {
      return;
    }

    setStatus("saving");
    setError(null);
    const response = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        projectId: projectId || undefined,
        type,
        title,
        sourceUri: sourceUri || undefined,
        content,
      }),
    });
    const envelope = await parseEnvelope<{ knowledgeSource: KnowledgeSource }>(response);

    if (!envelope.success) {
      const message = envelope.error.message;
      setError(message);
      toast({ title: "Knowledge could not be saved", description: message, variant: "error" });
      setStatus("ready");
      return;
    }

    setTitle("");
    setSourceUri("");
    setContent("");
    await load(projectId);
    setStatus("ready");
    toast({
      title: "Knowledge saved",
      description: `${envelope.data.knowledgeSource.title} is available for context.`,
      variant: "success",
    });
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-lg border border-destructive/30 p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="grid gap-4">
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">Knowledge scope</p>
            <p className="text-xs text-muted-foreground">
              Project knowledge is injected into matching chat routes.
            </p>
          </div>
          <Select value={projectId} onChange={(event) => onProjectChange(event.target.value)}>
            <option value="">Workspace-wide</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </div>

        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">No knowledge in this scope yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add notes, URLs, or file text so OmniAI can reuse context across models.
            </p>
          </div>
        ) : (
          sources.map((source) => (
            <Card key={source.id}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle>{source.title}</CardTitle>
                    <CardDescription>{source.sourceUri || "Stored note"}</CardDescription>
                  </div>
                  <Badge>{source.type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {source.documents[0]?.chunks[0]?.content ??
                    source.documents[0]?.sanitizedText ??
                    ""}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>Add knowledge</CardTitle>
            <CardDescription>
              Start with notes and copied file text; binary upload can come next.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onCreate}>
              <div className="grid gap-2">
                <Label htmlFor="knowledge-title">Title</Label>
                <Input
                  id="knowledge-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="knowledge-type">Type</Label>
                <Select
                  id="knowledge-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as KnowledgeSource["type"])}
                >
                  <option value="note">Note</option>
                  <option value="url">URL</option>
                  <option value="file">File text</option>
                </Select>
              </div>
              {type === "url" ? (
                <div className="grid gap-2">
                  <Label htmlFor="knowledge-url">URL</Label>
                  <Input
                    id="knowledge-url"
                    value={sourceUri}
                    onChange={(event) => setSourceUri(event.target.value)}
                  />
                </div>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="knowledge-content">Content</Label>
                <Textarea
                  id="knowledge-content"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-44"
                />
              </div>
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                Save knowledge
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
