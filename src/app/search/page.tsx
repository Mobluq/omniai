import { AppShell } from "@/components/layout/app-shell";
import { SearchWorkspace } from "@/components/search/search-workspace";

export default function SearchPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Workspace recall</p>
        <h1 className="page-title mt-2">Search</h1>
        <p className="page-copy">
          Find conversations, messages, project context, knowledge sources, and saved artifacts.
        </p>
      </div>
      <SearchWorkspace />
    </AppShell>
  );
}
