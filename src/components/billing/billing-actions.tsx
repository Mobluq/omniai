"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { errorMessage, parseApiResponse } from "@/lib/api/client";

type PlanCode = "pro" | "team";

export function BillingActions({ workspaceId }: { workspaceId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<PlanCode | "portal" | null>(null);

  async function openCheckout(planCode: PlanCode) {
    setLoading(planCode);
    try {
      const result = await parseApiResponse<{ url: string | null }>(
        await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, planCode }),
        }),
      );

      if (!result.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }

      window.location.href = result.url;
    } catch (checkoutError: unknown) {
      toast({
        title: "Checkout unavailable",
        description: errorMessage(checkoutError),
        variant: "error",
      });
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    try {
      const result = await parseApiResponse<{ url: string }>(
        await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        }),
      );
      window.location.href = result.url;
    } catch (portalError: unknown) {
      toast({
        title: "Billing portal unavailable",
        description: errorMessage(portalError),
        variant: "error",
      });
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={() => openCheckout("pro")} disabled={Boolean(loading)} className="w-full justify-start">
        {loading === "pro" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        )}
        Upgrade to Pro
      </Button>
      <Button
        variant="outline"
        onClick={() => openCheckout("team")}
        disabled={Boolean(loading)}
        className="w-full justify-start"
      >
        {loading === "team" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <CreditCard className="h-4 w-4" aria-hidden="true" />
        )}
        Upgrade to Team
      </Button>
      <Button
        variant="ghost"
        onClick={openPortal}
        disabled={Boolean(loading)}
        className="w-full justify-start"
      >
        {loading === "portal" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        )}
        Manage billing portal
      </Button>
    </div>
  );
}
