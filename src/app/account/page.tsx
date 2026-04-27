import { AppShell } from "@/components/layout/app-shell";
import { AccountSettings } from "@/components/account/account-settings";

export default function AccountPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage profile defaults, notifications, sign-in security, and personal AI behavior.
        </p>
      </div>
      <AccountSettings />
    </AppShell>
  );
}
