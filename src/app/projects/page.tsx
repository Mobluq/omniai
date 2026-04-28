import { AppShell } from "@/components/layout/app-shell";
import { ProjectsWorkspace } from "@/components/projects/projects-workspace";

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Structured work</p>
        <h1 className="page-title mt-2">Projects</h1>
        <p className="page-copy">
          Organize AI work into persistent contexts with instructions, knowledge, chat history, and artifacts.
        </p>
      </div>
      <ProjectsWorkspace />
    </AppShell>
  );
}
