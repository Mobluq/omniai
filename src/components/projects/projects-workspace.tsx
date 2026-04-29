"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Loader2, Plus, Target } from "@/components/ui/huge-icons";
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
type Project = {
  id: string;
  name: string;
  description?: string | null;
  instructions?: string | null;
  defaultRoutingMode: "manual" | "suggest" | "auto";
  defaultProvider?: string | null;
  defaultModelId?: string | null;
  updatedAt: string;
  _count?: { conversations: number; knowledgeSources: number; artifacts: number };
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function ProjectsWorkspace() {
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [defaultRoutingMode, setDefaultRoutingMode] =
    useState<Project["defaultRoutingMode"]>("suggest");
  const [status, setStatus] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const workspaceResponse = await fetch("/api/workspaces");
    const workspaceEnvelope = await parseEnvelope<{ workspaces: Workspace[] }>(workspaceResponse);

    if (!workspaceEnvelope.success || !workspaceEnvelope.data.workspaces[0]) {
      throw new Error("No workspace found.");
    }

    const activeWorkspace = workspaceEnvelope.data.workspaces[0];
    const projectResponse = await fetch(`/api/projects?workspaceId=${activeWorkspace.id}`);
    const projectEnvelope = await parseEnvelope<{ projects: Project[] }>(projectResponse);

    if (!projectEnvelope.success) {
      throw new Error(projectEnvelope.error.message);
    }

    setWorkspace(activeWorkspace);
    setProjects(projectEnvelope.data.projects);
  }

  useEffect(() => {
    // The initial load synchronizes the client workspace view with authenticated API state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
      .then(() => setStatus("ready"))
      .catch((loadError: unknown) => {
        const message = errorMessage(loadError, "Could not load projects.");
        setError(message);
        toast({ title: "Projects could not be loaded", description: message, variant: "error" });
        setStatus("error");
      });
  }, [toast]);

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!workspace || !name.trim()) {
      return;
    }

    setStatus("saving");
    setError(null);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        name,
        description,
        instructions,
        defaultRoutingMode,
      }),
    });
    const envelope = await parseEnvelope<{ project: Project }>(response);

    if (!envelope.success) {
      const message = envelope.error.message;
      setError(message);
      toast({ title: "Project could not be created", description: message, variant: "error" });
      setStatus("ready");
      return;
    }

    setName("");
    setDescription("");
    setInstructions("");
    await load();
    setStatus("ready");
    toast({
      title: "Project created",
      description: `${envelope.data.project.name} is ready.`,
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
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-10 text-center">
            <Target className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Create a project for each serious workflow.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Projects hold instructions, knowledge, conversations, and saved outputs.
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>
                      {project.description || "No description yet."}
                    </CardDescription>
                  </div>
                  <Badge>{project.defaultRoutingMode}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Conversations</p>
                    <p className="mt-1 text-xl font-semibold">
                      {project._count?.conversations ?? 0}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Knowledge</p>
                    <p className="mt-1 text-xl font-semibold">
                      {project._count?.knowledgeSources ?? 0}
                    </p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground">Artifacts</p>
                    <p className="mt-1 text-xl font-semibold">{project._count?.artifacts ?? 0}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm">
                    <Link href={`/chat?projectId=${project.id}`}>
                      Open in chat
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/knowledge?projectId=${project.id}`}>Add knowledge</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/artifacts?projectId=${project.id}`}>View artifacts</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <aside>
        <Card>
          <CardHeader>
            <CardTitle>New project</CardTitle>
            <CardDescription>Set the working context before opening chat.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={onCreate}>
              <div className="grid gap-2">
                <Label htmlFor="project-name">Name</Label>
                <Input
                  id="project-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Textarea
                  id="project-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-instructions">Default instructions</Label>
                <Textarea
                  id="project-instructions"
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="project-routing">Routing</Label>
                <Select
                  id="project-routing"
                  value={defaultRoutingMode}
                  onChange={(event) =>
                    setDefaultRoutingMode(event.target.value as Project["defaultRoutingMode"])
                  }
                >
                  <option value="manual">Manual</option>
                  <option value="suggest">Suggest</option>
                  <option value="auto">Auto</option>
                </Select>
              </div>
              <Button type="submit" disabled={status === "saving"}>
                {status === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                Create project
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </form>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
