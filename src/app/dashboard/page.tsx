import Link from "next/link";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsageOverview } from "@/components/dashboard/usage-overview";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track conversations, model usage, routing decisions, and workspace readiness.
            </p>
          </div>
          <Button asChild>
            <Link href="/chat">
              <Plus className="h-4 w-4" aria-hidden="true" />
              New conversation
            </Link>
          </Button>
        </div>
        <UsageOverview />
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent conversations</CardTitle>
              <CardDescription>Conversation storage is ready for workspace-scoped history.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Conversations will appear here after the first chat session.
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Routing readiness</CardTitle>
              <CardDescription>Manual, suggest, and auto routing modes are scaffolded.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex justify-between rounded-md border p-3">
                <span>Provider abstraction</span>
                <span className="font-medium text-secondary">Ready</span>
              </div>
              <div className="flex justify-between rounded-md border p-3">
                <span>Recommendation scoring</span>
                <span className="font-medium text-secondary">Ready</span>
              </div>
              <div className="flex justify-between rounded-md border p-3">
                <span>Usage metering</span>
                <span className="font-medium text-secondary">Ready</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
