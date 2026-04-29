import { Activity, Coins, MessageSquare, Route } from "@/components/ui/huge-icons";

export type UsageOverviewProps = {
  requestCount: number;
  conversationCount: number;
  routingDecisionCount: number;
  estimatedCost: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(value);
}

export function UsageOverview({
  requestCount,
  conversationCount,
  routingDecisionCount,
  estimatedCost,
}: UsageOverviewProps) {
  const metrics = [
    {
      label: "Requests",
      value: requestCount.toLocaleString(),
      icon: Activity,
      helper: "metered calls",
    },
    {
      label: "Conversations",
      value: conversationCount.toLocaleString(),
      icon: MessageSquare,
      helper: "stored threads",
    },
    {
      label: "Routing decisions",
      value: routingDecisionCount.toLocaleString(),
      icon: Route,
      helper: "intent checks",
    },
    {
      label: "Estimated cost",
      value: formatCurrency(estimatedCost),
      icon: Coins,
      helper: "current window",
    },
  ];

  return (
    <div className="grid overflow-hidden rounded-lg border border-border/80 bg-card/95 shadow-line md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="border-b border-border/70 p-5 last:border-b-0 md:border-r md:last:border-r-0 xl:border-b-0"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {metric.label}
            </p>
            <metric.icon className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <p className="metric-value mt-4">{metric.value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
        </div>
      ))}
    </div>
  );
}
