import { AppShell } from "@/components/layout/app-shell";
import { SearchWorkspace } from "@/components/search/search-workspace";

export default function SearchPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find conversations, messages, project context, knowledge sources, and saved artifacts.
        </p>
      </div>
      <SearchWorkspace />
    </AppShell>
  );
}
