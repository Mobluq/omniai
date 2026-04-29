"use client";

import { Sparkles } from "@/components/ui/huge-icons";
import { Button } from "@/components/ui/button";

export type RecommendationViewModel = {
  detectedIntent: string;
  recommendedProvider: string;
  recommendedModel: string;
  recommendedModelDisplayName: string;
  confidence: number;
  reason: string;
  shouldAskToSwitch: boolean;
};

export function RecommendationBanner({
  recommendation,
  onSwitch,
  onStay,
  onAutoRoute,
  loading,
}: {
  recommendation: RecommendationViewModel;
  onSwitch: () => void;
  onStay: () => void;
  onAutoRoute: () => void;
  loading?: boolean;
}) {
  return (
    <section className="rounded-lg border border-accent/40 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {recommendation.recommendedModelDisplayName} may be better for this task.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{recommendation.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={onSwitch} disabled={loading}>
              Switch and continue
            </Button>
            <Button size="sm" variant="outline" onClick={onStay} disabled={loading}>
              Stay with current model
            </Button>
            <Button size="sm" variant="ghost" onClick={onAutoRoute} disabled={loading}>
              Always auto-route
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
