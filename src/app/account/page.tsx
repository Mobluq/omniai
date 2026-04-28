import { AppShell } from "@/components/layout/app-shell";
import { AccountSettings } from "@/components/account/account-settings";

export default function AccountPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Personal controls</p>
        <h1 className="page-title mt-2">Account</h1>
        <p className="page-copy">
          Manage profile defaults, notifications, sign-in security, and personal AI behavior.
        </p>
      </div>
      <AccountSettings />
    </AppShell>
  );
}
