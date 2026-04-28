import Link from "next/link";
import { FileText, ImageIcon } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtifactService } from "@/modules/artifact/artifact-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";

type ArtifactsPageProps = {
  searchParams?: Promise<{ projectId?: string }> | { projectId?: string };
};

function previewContent(content: string) {
  return content
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "[image]")
    .replace(/```[\s\S]*?```/g, "[code block]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

export default async function ArtifactsPage({ searchParams }: ArtifactsPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];
  const artifacts = workspace
    ? await new ArtifactService().list(user.id, workspace.id, params?.projectId)
    : [];

  return (
    <AppShell>
      <div className="page-shell mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="page-kicker">Saved outputs</p>
          <h1 className="page-title mt-2">Artifacts</h1>
          <p className="page-copy">
            Saved outputs from chat: documents, code, images, briefs, proposals, and prompts.
          </p>
        </div>
        <Button asChild>
          <Link href="/chat">Create from chat</Link>
        </Button>
      </div>

      {artifacts.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium">No artifacts saved yet.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Longer outputs, image responses, proposals, research, and code are saved automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {artifacts.map((artifact) => {
            const Icon = artifact.type === "image" ? ImageIcon : FileText;

            return (
              <Card key={artifact.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                    <Badge>{artifact.type}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2 text-base">{artifact.title}</CardTitle>
                  <CardDescription>
                    {artifact.provider ? `${artifact.provider} / ${artifact.modelId}` : "Manual artifact"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-5 text-sm leading-6 text-muted-foreground">
                    {previewContent(artifact.content)}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
