import { AppShell } from "@/components/layout/app-shell";
import { KnowledgeWorkspace } from "@/components/knowledge/knowledge-workspace";

type KnowledgePageProps = {
  searchParams?: Promise<{ projectId?: string }> | { projectId?: string };
};

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const params = await searchParams;

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage reusable workspace and project context before it reaches any provider.
        </p>
      </div>
      <KnowledgeWorkspace initialProjectId={params?.projectId} />
    </AppShell>
  );
}
