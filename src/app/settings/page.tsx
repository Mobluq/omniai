import { AppShell } from "@/components/layout/app-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Workspace operations</p>
        <h1 className="page-title mt-2">Settings</h1>
        <p className="page-copy">
          Choose managed AI credits or bring-your-own provider accounts, then set routing, memory,
          and team defaults.
        </p>
      </div>
      <SettingsWorkspace />
    </AppShell>
  );
}
