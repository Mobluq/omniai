"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  formatNgn,
  readApi,
  writeApi,
  type GrowthListingSummary,
  type Persona,
  type SellerGrowthSummary,
} from "@/lib/client/api";

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function listingImage(listing: GrowthListingSummary) {
  return listing.photos?.[0]?.url;
}

function activePromotions(listing: GrowthListingSummary) {
  return listing.promotions.filter((promotion) => promotion.status === "active");
}

export function GrowthClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [growth, setGrowth] = useState<SellerGrowthSummary | null>(null);
  const [selectedTier, setSelectedTier] = useState("tier_1");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [selectedPromotionType, setSelectedPromotionType] = useState("bump");
  const [message, setMessage] = useState("Loading seller growth.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const promotionReadyListings = useMemo(
    () => growth?.listings.filter((listing) => ["live", "reserved"].includes(listing.status)) ?? [],
    [growth],
  );

  const selectedTierPlan = useMemo(
    () => growth?.proTierPlans.find((plan) => plan.tier === selectedTier) ?? null,
    [growth, selectedTier],
  );

  const selectedPromotionPlan = useMemo(
    () => growth?.promotionPlans.find((plan) => plan.type === selectedPromotionType) ?? null,
    [growth, selectedPromotionType],
  );

  const stats = useMemo(() => {
    if (!growth) return { listings: 0, live: 0, activePromotions: 0, monthlySpend: 0 };

    return growth.listings.reduce(
      (current, listing) => {
        current.listings += 1;
        if (listing.status === "live") current.live += 1;
        current.activePromotions += activePromotions(listing).length;
        return current;
      },
      {
        listings: 0,
        live: 0,
        activePromotions: 0,
        monthlySpend: growth.activeSubscription?.priceNgn ?? 0,
      },
    );
  }, [growth]);

  const loadGrowth = useCallback(async (userId: string) => {
    if (!userId) return;

    const result = await readApi<SellerGrowthSummary>("/api/v1/seller/growth", userId);
    setGrowth(result);
    setSelectedTier(result.activeSubscription?.tier ?? result.proTierPlans[0]?.tier ?? "tier_1");
    setSelectedListingId(
      (current) =>
        result.listings.some((listing) => listing.id === current)
          ? current
          : result.listings.find((listing) => ["live", "reserved"].includes(listing.status))?.id ?? "",
    );
    setSelectedPromotionType(result.promotionPlans[0]?.type ?? "bump");
    setMessage("Seller growth workspace loaded.");
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const seller = result.users.find((persona) => persona.role === "seller") ?? result.users[0];
        setActiveUserId(seller?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Seller growth failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadGrowth(activeUserId);
      } catch (error) {
        setGrowth(null);
        setMessage(error instanceof Error ? error.message : "Seller growth data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadGrowth]);

  async function activatePlan() {
    if (!activeUserId || !selectedTier) {
      setMessage("Select a seller and Pro plan first.");
      return;
    }

    setBusyAction("pro");
    try {
      await writeApi("/api/v1/seller/pro-subscriptions", activeUserId, { tier: selectedTier });
      setMessage("Pro seller plan activated.");
      await loadGrowth(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pro activation failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function promoteListing() {
    if (!activeUserId || !selectedListingId || !selectedPromotionType) {
      setMessage("Select a listing and promotion type first.");
      return;
    }

    setBusyAction("promotion");
    try {
      await writeApi("/api/v1/seller/promotions", activeUserId, {
        listingId: selectedListingId,
        type: selectedPromotionType,
      });
      setMessage("Listing promotion is active.");
      await loadGrowth(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Promotion failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/marketplace" className="text-sm font-semibold text-muted-foreground">
            Back to marketplace
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Seller monetization
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Growth desk</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Activate Pro seller plans, inspect listing capacity, and promote authenticated inventory
            without bypassing KYC, listing state, or audit controls.
          </p>
        </div>
        <PersonaSelector
          label="Seller persona"
          personas={personas}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
        />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span> : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-4">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Listings</p>
          <p className="mt-2 text-3xl font-semibold">{stats.listings}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Live</p>
          <p className="mt-2 text-3xl font-semibold">{stats.live}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Promotions</p>
          <p className="mt-2 text-3xl font-semibold">{stats.activePromotions}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Monthly Pro</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.monthlySpend)}</p>
        </article>
      </section>

      {growth ? (
        <>
          <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[0.9fr_1fr]">
            <section className="rounded-md border border-border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-muted-foreground">Seller profile</p>
                  <h2 className="mt-2 text-3xl font-semibold">{growth.profile.storeName}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    @{growth.profile.storeSlug} / limit {growth.profile.listingLimit ?? "standard"}
                  </p>
                </div>
                <Link href="/sell/new" className="rounded-md border border-border px-3 py-2 text-sm font-semibold">
                  Add listing
                </Link>
              </div>

              <div className="mt-5 rounded-md border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Active plan</p>
                <p className="mt-2 text-2xl font-semibold">
                  {growth.activeSubscription
                    ? `${labelize(growth.activeSubscription.tier)} / ${labelize(growth.activeSubscription.status)}`
                    : "No active Pro plan"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Started {formatDate(growth.activeSubscription?.startsAt ?? null)}
                </p>
              </div>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-2 text-sm font-medium">
                  Pro plan
                  <select
                    value={selectedTier}
                    onChange={(event) => setSelectedTier(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    {growth.proTierPlans.map((plan) => (
                      <option key={plan.tier} value={plan.tier}>
                        {plan.label} / {formatNgn(plan.priceNgn)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedTierPlan ? (
                  <dl className="grid gap-3 text-sm md:grid-cols-3">
                    <div className="rounded-md border border-border bg-background p-3">
                      <dt className="text-muted-foreground">Listings</dt>
                      <dd className="mt-1 font-semibold">{selectedTierPlan.listingLimit}</dd>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <dt className="text-muted-foreground">Credits</dt>
                      <dd className="mt-1 font-semibold">{selectedTierPlan.promotionCredits}</dd>
                    </div>
                    <div className="rounded-md border border-border bg-background p-3">
                      <dt className="text-muted-foreground">Support SLA</dt>
                      <dd className="mt-1 font-semibold">{selectedTierPlan.supportSlaHours}h</dd>
                    </div>
                  </dl>
                ) : null}

                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={busyAction === "pro"}
                  onClick={() => void activatePlan()}
                >
                  {busyAction === "pro" ? "Activating..." : "Activate Pro plan"}
                </button>
              </div>
            </section>

            <section className="rounded-md border border-border bg-white p-5">
              <p className="text-sm font-semibold uppercase text-muted-foreground">Promotion control</p>
              <h2 className="mt-2 text-3xl font-semibold">Move authenticated supply</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Promotions require an active Pro plan and only attach to live or reserved listings.
              </p>

              <div className="mt-5 grid gap-3">
                <label className="grid gap-2 text-sm font-medium">
                  Listing
                  <select
                    value={selectedListingId}
                    onChange={(event) => setSelectedListingId(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    <option value="">Select listing</option>
                    {promotionReadyListings.map((listing) => (
                      <option key={listing.id} value={listing.id}>
                        {listing.title} / {labelize(listing.status)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium">
                  Promotion
                  <select
                    value={selectedPromotionType}
                    onChange={(event) => setSelectedPromotionType(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    {growth.promotionPlans.map((plan) => (
                      <option key={plan.type} value={plan.type}>
                        {plan.label} / {formatNgn(plan.priceNgn)}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedPromotionPlan ? (
                  <div className="rounded-md border border-border bg-background p-4">
                    <p className="text-xl font-semibold">{selectedPromotionPlan.label}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedPromotionPlan.description}
                    </p>
                    <p className="mt-3 text-sm font-semibold">
                      {formatNgn(selectedPromotionPlan.priceNgn)} / {selectedPromotionPlan.durationDays} days
                    </p>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!selectedListingId || busyAction === "promotion"}
                  onClick={() => void promoteListing()}
                >
                  {busyAction === "promotion" ? "Promoting..." : "Create promotion"}
                </button>
              </div>
            </section>
          </section>

          <section className="mx-auto mt-5 grid max-w-7xl gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Seller inventory</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Promotion history is kept on each listing for merchandising and reconciliation.
              </p>
            </div>

            {growth.listings.map((listing) => {
              const image = listingImage(listing);
              const promotions = activePromotions(listing);
              return (
                <article
                  key={listing.id}
                  className="grid gap-4 rounded-md border border-border bg-white p-4 lg:grid-cols-[10rem_1fr_18rem]"
                >
                  <div className="overflow-hidden rounded-md bg-background">
                    <div className="aspect-square">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">Listing</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {listing.brand?.name ?? "Independent"} / {labelize(listing.status)}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">{listing.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {listing.category?.name ?? "Uncategorized"} / {labelize(listing.condition)}
                    </p>
                    <p className="mt-3 text-2xl font-semibold">{formatNgn(listing.priceNgn)}</p>
                  </div>

                  <div className="grid h-fit gap-2">
                    <div className="rounded-md border border-border bg-background p-3">
                      <p className="text-sm text-muted-foreground">Active promotions</p>
                      <p className="mt-1 text-2xl font-semibold">{promotions.length}</p>
                    </div>
                    {promotions.slice(0, 2).map((promotion) => (
                      <div key={promotion.id} className="rounded-md border border-border p-3 text-sm">
                        <p className="font-semibold">{labelize(promotion.type)}</p>
                        <p className="mt-1 text-muted-foreground">Ends {formatDate(promotion.endsAt)}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </section>
        </>
      ) : (
        <section className="mx-auto mt-5 max-w-7xl rounded-md border border-dashed border-border bg-white p-8 text-center">
          <h2 className="text-2xl font-semibold">Seller growth unavailable</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Switch to a verified seller persona with an active seller profile to use growth tooling.
          </p>
        </section>
      )}
    </main>
  );
}
