export const notificationTypes = [
  "system",
  "security",
  "listing",
  "order",
  "dispute",
  "barter",
  "payout",
  "review",
  "authentication",
] as const;

export const notificationStatusFilters = ["active", "unread", "read", "archived", "all"] as const;

export type NotificationStatusFilter = (typeof notificationStatusFilters)[number];
export type NotificationState = "unread" | "read" | "archived";
export type NotificationTypeName = (typeof notificationTypes)[number];

export function isNotificationType(value: string | null): value is NotificationTypeName {
  return notificationTypes.some((type) => type === value);
}

export function isNotificationStatusFilter(value: string | null): value is NotificationStatusFilter {
  return notificationStatusFilters.some((status) => status === value);
}

export function notificationState(readAt?: Date | string | null, archivedAt?: Date | string | null): NotificationState {
  if (archivedAt) return "archived";
  if (readAt) return "read";
  return "unread";
}

export function notificationTypeLabel(type: NotificationTypeName) {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
