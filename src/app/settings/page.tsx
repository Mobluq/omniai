import { AppShell } from "@/components/layout/app-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Workspace operations</p>
        <h1 className="page-title mt-2">Settings</h1>
        <p className="page-copy">
          Connect providers, set routing defaults, and manage workspace AI behavior.
        </p>
      </div>
      <SettingsWorkspace />
    </AppShell>
  );
}
