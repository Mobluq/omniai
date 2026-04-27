import Link from "next/link";
import { BrainCircuit, CheckCircle2, Plus } from "lucide-react";
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
    : { requestCount: 0, costEstimate: 0, byProvider: {} };
  const routingDecisionCount = workspace
    ? await prisma.recommendationLog.count({ where: { workspaceId: workspace.id } })
    : 0;
  const providers = workspace
    ? await new ProviderConfigurationService().listWorkspaceConnections(user.id, workspace.id)
    : [];

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {workspace ? workspace.name : "Your OmniAI workspace"}
            </p>
          </div>
          <Button asChild>
            <Link href="/chat">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New conversation
            </Link>
          </Button>
        </div>

        <UsageOverview
          requestCount={usage.requestCount}
          conversationCount={conversations.length}
          routingDecisionCount={routingDecisionCount}
          estimatedCost={usage.costEstimate}
        />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent conversations</CardTitle>
              <CardDescription>Your latest workspace conversations and model activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {conversations.length === 0 ? (
                <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Start a conversation to build your searchable AI history.
                </div>
              ) : (
                <div className="grid gap-3">
                  {conversations.slice(0, 6).map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/chat?conversationId=${conversation.id}`}
                      className="rounded-md border p-4 transition-colors hover:bg-muted/50"
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
                          <span className="text-xs text-muted-foreground">
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
              <CardDescription>Connection status is managed from Settings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {providers.map((provider) => {
                const connected = provider.isEnabled && (provider.envConfigured || provider.workspaceConfigured);

                return (
                  <div key={provider.provider} className="flex items-center justify-between rounded-md border p-3">
                    <span>{provider.displayName}</span>
                    <CheckCircle2
                      className={`h-4 w-4 ${connected ? "text-secondary" : "text-muted-foreground"}`}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
