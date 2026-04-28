import Link from "next/link";
import { BrainCircuit, CheckCircle2, Clock3, Database, FileText, MessageSquareText, Plus, Route, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageOverview } from "@/components/dashboard/usage-overview";
import { UsageService } from "@/modules/usage/usage-service";
import { WorkspaceService } from "@/modules/workspace/workspace-service";
import { ConversationService } from "@/modules/conversation/conversation-service";
import { ProviderConfigurationService } from "@/modules/ai/providers/provider-config-service";
import { ProjectService } from "@/modules/project/project-service";
import { KnowledgeService } from "@/modules/knowledge/knowledge-service";
import { ArtifactService } from "@/modules/artifact/artifact-service";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaces = await new WorkspaceService().listForUser(user.id);
  const workspace = workspaces[0];
  const conversations = workspace
    ? await new ConversationService().list(user.id, workspace.id)
    : [];
  const usage = workspace
    ? await new UsageService().summarize(workspace.id)
    : { requestCount: 0, costEstimate: 0, byProvider: [] };
  const routingDecisionCount = workspace
    ? await prisma.recommendationLog.count({ where: { workspaceId: workspace.id } })
    : 0;
  const providers = workspace
    ? await new ProviderConfigurationService().listWorkspaceConnections(user.id, workspace.id)
    : [];
  const projects = workspace ? await new ProjectService().list(user.id, workspace.id) : [];
  const knowledgeSources = workspace ? await new KnowledgeService().list(user.id, workspace.id) : [];
  const artifacts = workspace ? await new ArtifactService().list(user.id, workspace.id) : [];
  const connectedProviders = providers.filter(
    (provider) => provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured),
  );
  const disconnectedProviders = providers.length - connectedProviders.length;
  const lifecycle = [
    { label: "Capture", value: conversations.length, helper: "conversations", icon: MessageSquareText },
    { label: "Classify", value: routingDecisionCount, helper: "routing checks", icon: Route },
    { label: "Context", value: knowledgeSources.length, helper: "knowledge sources", icon: Database },
    { label: "Preserve", value: artifacts.length, helper: "saved artifacts", icon: FileText },
  ];

  return (
    <AppShell>
      <div className="page-shell flex flex-col gap-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <p className="page-kicker">Operational overview</p>
            <h1 className="page-title mt-2">AI workspace command center</h1>
            <p className="page-copy">
              {workspace
                ? `${workspace.name} is tracking conversations, routing decisions, provider readiness, knowledge, and durable outputs in one place.`
                : "Create a workspace to start building a searchable AI operating layer."}
            </p>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-card/95 p-4 shadow-line sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                System state
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                {connectedProviders.length ? "Ready for routed work" : "Provider setup needed"}
              </div>
            </div>
            <Button asChild>
              <Link href="/chat">
                <Plus className="h-4 w-4" aria-hidden="true" />
                New conversation
              </Link>
            </Button>
          </div>
        </div>

        <UsageOverview
          requestCount={usage.requestCount}
          conversationCount={conversations.length}
          routingDecisionCount={routingDecisionCount}
          estimatedCost={usage.costEstimate}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Recent workstream</CardTitle>
                  <CardDescription>Your latest workspace conversations and model activity.</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/chat">Open chat</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  Start a conversation to build searchable AI history and routing evidence.
                </div>
              ) : (
                <div className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70">
                  {conversations.slice(0, 6).map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/chat?conversationId=${conversation.id}`}
                      className="block bg-card px-4 py-3 transition-colors hover:bg-muted/45"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{conversation.title}</p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {conversation.messages[0]?.content ?? "No messages yet"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-muted">{conversation.routingMode}</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {formatDate(conversation.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-secondary" aria-hidden="true" />
                <CardTitle>Provider readiness</CardTitle>
              </div>
              <CardDescription>{connectedProviders.length} connected, {disconnectedProviders} waiting for keys.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {providers.map((provider) => {
                const connected = provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured);

                return (
                  <div key={provider.provider} className="flex items-center justify-between rounded-md border border-border/70 bg-background/60 p-3">
                    <div>
                      <span className="font-medium">{provider.displayName}</span>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {connected ? "Available to router" : "Needs credentials"}
                      </p>
                    </div>
                    {connected ? (
                      <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
                    ) : (
                      <TriangleAlert className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Workspace lifecycle</CardTitle>
            <CardDescription>How work moves from prompt capture into context and reusable output.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {lifecycle.map((stage, index) => (
                <div key={stage.label} className="relative rounded-lg border border-border/70 bg-background/60 p-4">
                  {index < lifecycle.length - 1 ? (
                    <span className="absolute right-[-0.9rem] top-1/2 hidden h-px w-6 bg-border md:block" />
                  ) : null}
                  <stage.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {stage.label}
                  </p>
                  <p className="metric-value mt-2">{stage.value.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stage.helper}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Active workspaces for focused AI tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="metric-value">{projects.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Knowledge sources</CardTitle>
              <CardDescription>Reusable context available to the router.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="metric-value">{knowledgeSources.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Artifacts</CardTitle>
              <CardDescription>Saved outputs generated from work sessions.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="metric-value">{artifacts.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
