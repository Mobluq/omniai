import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize AI work into persistent contexts with instructions, knowledge, chat history, and artifacts.
        </p>
      </div>
      <ProjectsWorkspace />
    </AppShell>
  );
}
