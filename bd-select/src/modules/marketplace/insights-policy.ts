export const reportingRanges = ["7d", "30d", "90d", "all"] as const;

export type ReportingRange = (typeof reportingRanges)[number];

export type DailyMetric = {
  date: string;
  count: number;
  totalNgn: number;
};

export function reportingRangeStart(range: ReportingRange, now = new Date()) {
  if (range === "all") return null;

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function percent(part: number, whole: number) {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 10_000) / 100;
}

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function dayKey(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10);
}

export function dailySeries<T>(
  items: T[],
  getDate: (item: T) => Date | string | null | undefined,
  getValue: (item: T) => number,
) {
  const buckets = new Map<string, DailyMetric>();

  for (const item of items) {
    const date = getDate(item);
    if (!date) continue;

    const key = dayKey(date);
    const bucket = buckets.get(key) ?? { date: key, count: 0, totalNgn: 0 };
    bucket.count += 1;
    bucket.totalNgn += getValue(item);
    buckets.set(key, bucket);
  }

  return [...buckets.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return Object.entries(
    items.reduce<Record<string, number>>((counts, item) => {
      const key = getKey(item);
      if (!key) return counts;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

export function sumBy<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((sum, item) => sum + getValue(item), 0);
}
