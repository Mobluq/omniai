import Link from "next/link";
import { Clock3, Database, FileText, FolderKanban, Plus } from "lucide-react";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IntelligenceSignalPanel } from "@/components/dashboard/intelligence-signal-panel";
import { ProviderFeedPanel } from "@/components/dashboard/provider-feed-panel";
import { RoutingFunnel } from "@/components/dashboard/routing-funnel";
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
    : {
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        costEstimate: 0,
        byProvider: [],
      };
  const routingDecisionCount = workspace
    ? await prisma.recommendationLog.count({ where: { workspaceId: workspace.id } })
    : 0;
  const providers = workspace
    ? await new ProviderConfigurationService().listWorkspaceConnections(user.id, workspace.id)
    : [];
  const projects = workspace ? await new ProjectService().list(user.id, workspace.id) : [];
  const knowledgeSources = workspace
    ? await new KnowledgeService().list(user.id, workspace.id)
    : [];
  const artifacts = workspace ? await new ArtifactService().list(user.id, workspace.id) : [];
  const connectedProviders = providers.filter(
    (provider) => provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured),
  );
  const disconnectedProviders = providers.length - connectedProviders.length;
  const workspaceInventory = [
    {
      label: "Projects",
      value: projects.length,
      helper: "focused work areas",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      label: "Knowledge sources",
      value: knowledgeSources.length,
      helper: "context available to the router",
      href: "/knowledge",
      icon: Database,
    },
    {
      label: "Artifacts",
      value: artifacts.length,
      helper: "saved outputs from sessions",
      href: "/artifacts",
      icon: FileText,
    },
  ];

  return (
    <AppShell>
      <div className="page-shell flex flex-col gap-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-end">
          <div>
            <p className="page-kicker">Operational overview</p>
            <h1 className="page-title mt-2">AI workspace command center</h1>
            <p className="page-copy">
              {workspace
                ? `${workspace.name} is tracking prompt history, model routing, provider readiness, memory, usage, and saved outputs from one control surface.`
                : "Create a workspace to start building a searchable AI operating layer."}
            </p>
          </div>
          <div className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-card/95 shadow-line">
            <div className="flex items-center justify-between gap-4 border-b border-border/70 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  System state
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-secondary/40" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-secondary" />
                  </span>
                  {connectedProviders.length ? "Ready for routed work" : "Provider setup needed"}
                </div>
              </div>
              <Button asChild>
                <Link href="/chat">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New chat
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border/70 text-center">
              <div className="p-3">
                <p className="font-mono text-lg font-semibold">{connectedProviders.length}</p>
                <p className="text-[0.68rem] text-muted-foreground">ready</p>
              </div>
              <div className="p-3">
                <p className="font-mono text-lg font-semibold">{disconnectedProviders}</p>
                <p className="text-[0.68rem] text-muted-foreground">needs key</p>
              </div>
              <div className="p-3">
                <p className="font-mono text-lg font-semibold">{routingDecisionCount}</p>
                <p className="text-[0.68rem] text-muted-foreground">checks</p>
              </div>
            </div>
          </div>
        </div>

        <UsageOverview
          requestCount={usage.requestCount}
          conversationCount={conversations.length}
          routingDecisionCount={routingDecisionCount}
          estimatedCost={usage.costEstimate}
        />

        <RoutingFunnel
          conversationsCount={conversations.length}
          routingDecisionCount={routingDecisionCount}
          connectedProviderCount={connectedProviders.length}
          providerCount={providers.length}
          knowledgeSourceCount={knowledgeSources.length}
          artifactCount={artifacts.length}
          successCount={usage.successCount}
          failureCount={usage.failureCount}
        />

        <IntelligenceSignalPanel
          requestCount={usage.requestCount}
          successCount={usage.successCount}
          failureCount={usage.failureCount}
          routingDecisionCount={routingDecisionCount}
          providerCount={providers.length}
          connectedProviderCount={connectedProviders.length}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_430px]">
          <Card className="overflow-hidden rounded-[1.25rem]">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Recent workstream</CardTitle>
                  <CardDescription>
                    Your latest workspace conversations and model activity.
                  </CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/chat">Open chat</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  Start a conversation to build searchable AI history and routing evidence.
                </div>
              ) : (
                <div className="divide-y divide-border/70 overflow-hidden rounded-xl border border-border/70">
                  {conversations.slice(0, 6).map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/chat?conversationId=${conversation.id}`}
                      className="block bg-card px-4 py-3 transition-colors hover:bg-muted/40"
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

          <ProviderFeedPanel providers={providers} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {workspaceInventory.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="group rounded-[1.25rem] border border-border/80 bg-card/95 p-5 shadow-line transition hover:-translate-y-0.5 hover:bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-8 font-mono text-3xl font-semibold tracking-[-0.05em]">
                {item.value.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
