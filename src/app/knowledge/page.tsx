import { AppShell } from "@/components/layout/app-shell";
import { KnowledgeWorkspace } from "@/components/knowledge/knowledge-workspace";

type KnowledgePageProps = {
  searchParams?: Promise<{ projectId?: string }> | { projectId?: string };
};

export default async function KnowledgePage({ searchParams }: KnowledgePageProps) {
  const params = await searchParams;

  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Memory layer</p>
        <h1 className="page-title mt-2">Knowledge</h1>
        <p className="page-copy">
          Manage reusable workspace and project context before it reaches any provider.
        </p>
      </div>
      <KnowledgeWorkspace initialProjectId={params?.projectId} />
    </AppShell>
  );
}
