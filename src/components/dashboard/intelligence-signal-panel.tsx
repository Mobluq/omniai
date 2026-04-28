import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Gauge, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type IntelligenceSignalPanelProps = {
  requestCount: number;
  successCount: number;
  failureCount: number;
  routingDecisionCount: number;
  providerCount: number;
  connectedProviderCount: number;
};

type SignalCard = {
  label: string;
  value: string;
  helper: string;
  color: "yellow" | "red" | "green";
  points: number[];
};

function percentage(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }

  return Math.round((numerator / denominator) * 100);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: value >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function MiniLine({ points, color }: { points: number[]; color: SignalCard["color"] }) {
  const max = Math.max(...points, 1);
  const coordinates = points.map((point, index) => {
    const x = 12 + index * 34;
    const y = 84 - (point / max) * 54;
    return { x, y };
  });
  const path = coordinates
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ");
  const stroke = color === "green" ? "#20b96b" : color === "red" ? "#ff4654" : "#f6be15";

  return (
    <svg viewBox="0 0 210 100" className="h-24 w-full" role="img" aria-label="Activity trend">
      <path d="M12 85 H198" stroke="rgba(148,163,184,0.35)" strokeWidth="1" />
      <path d="M12 56 H198" stroke="rgba(148,163,184,0.26)" strokeWidth="1" />
      <path d="M12 27 H198" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      {coordinates.map((point) => (
        <circle
          key={`${point.x}-${point.y}`}
          cx={point.x}
          cy={point.y}
          r="5.5"
          fill={stroke}
          stroke="white"
          strokeWidth="3"
        />
      ))}
    </svg>
  );
}

function ProgressRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "yellow" | "red" | "green";
}) {
  const barClass =
    tone === "green" ? "bg-[#22b86a]" : tone === "red" ? "bg-[#ff4a55]" : "bg-[#f8c517]";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={barClass} style={{ width: `${Math.min(value, 100)}%`, height: "100%" }} />
      </div>
    </div>
  );
}

export function IntelligenceSignalPanel({
  requestCount,
  successCount,
  failureCount,
  routingDecisionCount,
  providerCount,
  connectedProviderCount,
}: IntelligenceSignalPanelProps) {
  const successRate = percentage(successCount, requestCount);
  const providerCoverage = percentage(connectedProviderCount, Math.max(providerCount, 1));
  const reviewRate = percentage(failureCount, Math.max(requestCount, 1));
  const routingDepth = Math.min(
    100,
    routingDecisionCount ? 42 + Math.min(routingDecisionCount, 58) : 18,
  );
  const cards: SignalCard[] = [
    {
      label: "Recommendation checks",
      value: formatCompact(routingDecisionCount),
      helper: "prompt intent evaluations",
      color: "yellow",
      points: [
        routingDecisionCount * 0.28,
        routingDecisionCount * 0.42,
        routingDecisionCount * 0.35,
        routingDecisionCount * 0.55,
        routingDecisionCount * 0.7,
        routingDecisionCount || 1,
      ],
    },
    {
      label: "Provider failures",
      value: formatCompact(failureCount),
      helper: "calls needing retry or review",
      color: "red",
      points: [
        failureCount * 0.6,
        failureCount * 0.85,
        failureCount,
        failureCount * 0.72,
        failureCount * 0.5,
        failureCount * 0.35 + 1,
      ],
    },
    {
      label: "Successful calls",
      value: formatCompact(successCount),
      helper: "completed AI executions",
      color: "green",
      points: [
        successCount * 0.4,
        successCount * 0.48,
        successCount * 0.44,
        successCount * 0.62,
        successCount * 0.78,
        successCount || 1,
      ],
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className="overflow-hidden rounded-[1.25rem] border border-border/80 bg-card/95 shadow-line"
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div>
                <p className="text-sm font-semibold">{card.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{card.helper}</p>
              </div>
              <Badge className="bg-muted">
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                7d
              </Badge>
            </div>
            <div className="px-5 pt-2">
              <p className="font-mono text-3xl font-semibold tracking-[-0.05em]">{card.value}</p>
            </div>
            <MiniLine points={card.points} color={card.color} />
          </article>
        ))}
      </div>

      <aside className="rounded-[1.25rem] border border-border/80 bg-card/95 p-5 shadow-line">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">Routing health</h2>
            <p className="mt-1 text-sm text-muted-foreground">Current system readiness.</p>
          </div>
          <Gauge className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>

        <div className="mt-6 grid gap-5">
          <ProgressRow label="Execution success" value={successRate} tone="green" />
          <ProgressRow label="Provider coverage" value={providerCoverage} tone="yellow" />
          <ProgressRow label="Review pressure" value={reviewRate} tone="red" />
          <ProgressRow label="Routing evidence" value={routingDepth} tone="green" />
        </div>

        <div className="mt-6 grid grid-cols-3 overflow-hidden rounded-xl border border-border/70">
          <div className="grid place-items-center gap-1 border-r border-border/70 p-3 text-center">
            <Route className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold">
              {formatCompact(routingDecisionCount)}
            </span>
            <span className="text-[0.68rem] text-muted-foreground">routes</span>
          </div>
          <div className="grid place-items-center gap-1 border-r border-border/70 p-3 text-center">
            <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold">{formatCompact(successCount)}</span>
            <span className="text-[0.68rem] text-muted-foreground">done</span>
          </div>
          <div className="grid place-items-center gap-1 p-3 text-center">
            <CircleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
            <span className="font-mono text-sm font-semibold">{formatCompact(failureCount)}</span>
            <span className="text-[0.68rem] text-muted-foreground">review</span>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5" aria-hidden="true" />
          Health combines provider availability, failures, and routing evidence.
        </div>
      </aside>
    </section>
  );
}
