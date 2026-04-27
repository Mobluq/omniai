import { Activity, Coins, MessageSquare, Route } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    { label: "Requests", value: requestCount.toLocaleString(), icon: Activity },
    { label: "Conversations", value: conversationCount.toLocaleString(), icon: MessageSquare },
    { label: "Routing decisions", value: routingDecisionCount.toLocaleString(), icon: Route },
    { label: "Estimated cost", value: formatCurrency(estimatedCost), icon: Coins },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{metric.label}</CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{metric.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
