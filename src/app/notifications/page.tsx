import { AppShell } from "@/components/layout/app-shell";
import { NotificationInbox } from "@/components/notifications/notification-inbox";

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review account, provider, billing, usage, routing, and workspace events.
        </p>
      </div>
      <NotificationInbox />
    </AppShell>
  );
}
