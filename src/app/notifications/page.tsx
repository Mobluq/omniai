import { AppShell } from "@/components/layout/app-shell";
import { NotificationInbox } from "@/components/notifications/notification-inbox";

export default function NotificationsPage() {
  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Event inbox</p>
        <h1 className="page-title mt-2">Notifications</h1>
        <p className="page-copy">
          Review account, provider, billing, usage, routing, and workspace events.
        </p>
      </div>
      <NotificationInbox />
    </AppShell>
  );
}
