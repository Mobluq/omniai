import { AppShell } from "@/components/layout/app-shell";
import { SettingsWorkspace } from "@/components/settings/settings-workspace";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect providers, set routing defaults, and manage workspace AI behavior.
        </p>
      </div>
      <SettingsWorkspace />
    </AppShell>
  );
}
