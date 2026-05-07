"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  formatNgn,
  readApi,
  writeApi,
  type BarterProposalSummary,
  type ListingSummary,
  type Persona,
} from "@/lib/client/api";

const BARTER_TOP_UP_THRESHOLD_NGN = 10_000;

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function listingImage(listing: ListingSummary) {
  return listing.photos?.[0]?.url;
}

function sellerName(listing: ListingSummary) {
  return listing.seller?.name ?? listing.seller?.id ?? "Unknown seller";
}

export function BarterClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [marketListings, setMarketListings] = useState<ListingSummary[]>([]);
  const [myListings, setMyListings] = useState<ListingSummary[]>([]);
  const [proposals, setProposals] = useState<BarterProposalSummary[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedOfferIds, setSelectedOfferIds] = useState<string[]>([]);
  const [message, setMessage] = useState("Loading barter desk.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const targetListings = useMemo(
    () =>
      marketListings.filter(
        (listing) => listing.status === "live" && listing.seller?.id !== activeUserId,
      ),
    [activeUserId, marketListings],
  );

  const offerListings = useMemo(
    () => myListings.filter((listing) => listing.status === "live"),
    [myListings],
  );

  const selectedTarget = useMemo(
    () => targetListings.find((listing) => listing.id === selectedTargetId) ?? null,
    [selectedTargetId, targetListings],
  );

  const selectedOffers = useMemo(
    () => offerListings.filter((listing) => selectedOfferIds.includes(listing.id)),
    [offerListings, selectedOfferIds],
  );

  const valuation = useMemo(() => {
    const targetValueNgn = selectedTarget?.priceNgn ?? 0;
    const offeredValueNgn = selectedOffers.reduce((total, listing) => total + listing.priceNgn, 0);
    const deltaNgn = Math.abs(targetValueNgn - offeredValueNgn);
    const topUpNgn = deltaNgn > BARTER_TOP_UP_THRESHOLD_NGN ? deltaNgn : 0;
    const topUpPayer =
      topUpNgn === 0
        ? "No top-up"
        : offeredValueNgn < targetValueNgn
          ? "You pay top-up"
          : "Recipient pays top-up";

    return { targetValueNgn, offeredValueNgn, deltaNgn, topUpNgn, topUpPayer };
  }, [selectedOffers, selectedTarget]);

  const stats = useMemo(() => {
    return proposals.reduce(
      (current, proposal) => {
        current.total += 1;
        if (proposal.status === "proposed" && proposal.recipientId === activeUserId) current.incoming += 1;
        if (proposal.status === "proposed" && proposal.initiatorId === activeUserId) current.outgoing += 1;
        if (proposal.status === "accepted") current.accepted += 1;
        current.topUpsNgn += proposal.topUpNgn;
        return current;
      },
      { total: 0, incoming: 0, outgoing: 0, accepted: 0, topUpsNgn: 0 },
    );
  }, [activeUserId, proposals]);

  const loadBarterData = useCallback(async (userId: string) => {
    if (!userId) return;
    const [searchResult, sellerListingsResult, proposalResult] = await Promise.all([
      readApi<{ listings: ListingSummary[] }>("/api/v1/search"),
      readApi<{ listings: ListingSummary[] }>("/api/v1/listings", userId),
      readApi<{ proposals: BarterProposalSummary[] }>("/api/v1/barter/proposals", userId),
    ]);

    const availableTargets = searchResult.listings.filter(
      (listing) => listing.status === "live" && listing.seller?.id !== userId,
    );
    const availableOffers = sellerListingsResult.listings.filter((listing) => listing.status === "live");

    setMarketListings(searchResult.listings);
    setMyListings(sellerListingsResult.listings);
    setProposals(proposalResult.proposals);
    setSelectedTargetId(availableTargets[0]?.id ?? "");
    setSelectedOfferIds(availableOffers[0] ? [availableOffers[0].id] : []);
    setMessage("Barter desk loaded.");
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const seller = result.users.find((persona) => persona.email === "trader@bdselect.local");
        const fallbackSeller = result.users.find((persona) => persona.role === "seller");
        setActiveUserId(seller?.id ?? fallbackSeller?.id ?? result.users[0]?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Barter desk failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadBarterData(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Barter data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadBarterData]);

  function toggleOffer(listingId: string) {
    setSelectedOfferIds((current) =>
      current.includes(listingId)
        ? current.filter((selectedId) => selectedId !== listingId)
        : [...current, listingId],
    );
  }

  async function createProposal() {
    if (!activeUserId || !selectedTargetId || selectedOfferIds.length === 0) {
      setMessage("Select a target listing and at least one offered listing.");
      return;
    }

    setBusyAction("create");
    try {
      await writeApi("/api/v1/barter/proposals", activeUserId, {
        targetListingId: selectedTargetId,
        offeredListingIds: selectedOfferIds,
      });
      setMessage("Barter proposal created with valuation snapshot.");
      await loadBarterData(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Barter proposal failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function acceptProposal(proposalId: string) {
    if (!activeUserId) {
      setMessage("Select a seller persona first.");
      return;
    }

    setBusyAction(`accept:${proposalId}`);
    try {
      await writeApi(`/api/v1/barter/proposals/${proposalId}/accept`, activeUserId);
      setMessage("Barter proposal accepted and all involved listings locked.");
      await loadBarterData(activeUserId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Barter acceptance failed.");
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
            Barter protocol
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Swap desk</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Compose authenticated swap offers, compare values, calculate top-ups, and accept incoming
            proposals while locking involved listings.
          </p>
        </div>
        <PersonaSelector
          label="Swap persona"
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

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-5">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">All proposals</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Incoming</p>
          <p className="mt-2 text-3xl font-semibold">{stats.incoming}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Outgoing</p>
          <p className="mt-2 text-3xl font-semibold">{stats.outgoing}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Accepted</p>
          <p className="mt-2 text-3xl font-semibold">{stats.accepted}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Top-ups</p>
          <p className="mt-2 text-3xl font-semibold">{formatNgn(stats.topUpsNgn)}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[1fr_0.72fr]">
        <div className="grid gap-5">
          <section className="rounded-md border border-border bg-white p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Choose target item</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pick another seller&apos;s live listing as the item you want.
                </p>
              </div>
              <Link href="/sell/new" className="rounded-md border border-border px-3 py-2 text-sm font-semibold">
                Add item
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {targetListings.map((listing) => {
                const image = listingImage(listing);
                const selected = selectedTargetId === listing.id;
                return (
                  <button
                    key={listing.id}
                    type="button"
                    className={`overflow-hidden rounded-md border text-left ${
                      selected ? "border-primary bg-background" : "border-border bg-white"
                    }`}
                    onClick={() => setSelectedTargetId(listing.id)}
                  >
                    <div className="aspect-[4/3] bg-background">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">BD Select</div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {listing.brand?.name ?? "Independent"} / {sellerName(listing)}
                      </p>
                      <h3 className="mt-2 font-semibold">{listing.title}</h3>
                      <p className="mt-2 text-xl font-semibold">{formatNgn(listing.priceNgn)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-4">
            <h2 className="text-2xl font-semibold">Select your offer</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Offer one or more of your live listings. Accepted proposals lock every item.
            </p>

            {offerListings.length === 0 ? (
              <div className="mt-4 rounded-md border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                This persona has no live listings available for barter.
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {offerListings.map((listing) => {
                const image = listingImage(listing);
                const selected = selectedOfferIds.includes(listing.id);
                return (
                  <label
                    key={listing.id}
                    className={`overflow-hidden rounded-md border ${
                      selected ? "border-primary bg-background" : "border-border bg-white"
                    }`}
                  >
                    <div className="aspect-[4/3] bg-background">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={image} alt={listing.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">BD Select</div>
                      )}
                    </div>
                    <div className="flex gap-3 p-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleOffer(listing.id)}
                        className="mt-1 size-4"
                      />
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {listing.brand?.name ?? "Independent"}
                        </p>
                        <h3 className="mt-2 font-semibold">{listing.title}</h3>
                        <p className="mt-2 text-xl font-semibold">{formatNgn(listing.priceNgn)}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-md border border-border bg-white p-5">
          <h2 className="text-2xl font-semibold">Valuation</h2>
          <dl className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Target value</dt>
              <dd className="font-semibold">{formatNgn(valuation.targetValueNgn)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Offered value</dt>
              <dd className="font-semibold">{formatNgn(valuation.offeredValueNgn)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Delta</dt>
              <dd className="font-semibold">{formatNgn(valuation.deltaNgn)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Top-up</dt>
              <dd className="font-semibold">{formatNgn(valuation.topUpNgn)}</dd>
            </div>
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted-foreground">Top-up payer</dt>
              <dd className="font-semibold">{valuation.topUpPayer}</dd>
            </div>
          </dl>
          <button
            type="button"
            className="mt-5 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!selectedTargetId || selectedOfferIds.length === 0 || busyAction === "create"}
            onClick={() => void createProposal()}
          >
            {busyAction === "create" ? "Creating..." : "Create barter proposal"}
          </button>
        </aside>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Proposal desk</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Track outgoing and incoming swaps for the active persona.
          </p>
        </div>

        {proposals.length === 0 ? (
          <article className="rounded-md border border-dashed border-border bg-white p-8 text-center">
            <h3 className="text-2xl font-semibold">No barter proposals yet</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              Create a proposal above, then switch to the recipient persona to accept and lock listings.
            </p>
          </article>
        ) : null}

        {proposals.map((proposal) => {
          const canAccept = proposal.recipientId === activeUserId && proposal.status === "proposed";
          const targetImage = listingImage(proposal.targetListing);
          return (
            <article key={proposal.id} className="rounded-md border border-border bg-white p-4">
              <div className="grid gap-4 lg:grid-cols-[11rem_1fr_18rem]">
                <div className="overflow-hidden rounded-md bg-background">
                  <div className="aspect-square">
                    {targetImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={targetImage} alt={proposal.targetListing.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-muted-foreground">Swap</div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {labelize(proposal.status)} / expires {formatDate(proposal.expiresAt)}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold">{proposal.targetListing.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {proposal.initiator.email ?? proposal.initiator.name} offered{" "}
                    {proposal.offeredListings.length} item
                    {proposal.offeredListings.length === 1 ? "" : "s"} to{" "}
                    {proposal.recipient.email ?? proposal.recipient.name}.
                  </p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {proposal.offeredListings.map((offered) => (
                      <div key={offered.listingId} className="rounded-md border border-border bg-background p-3">
                        <p className="text-xs font-semibold uppercase text-muted-foreground">Offered item</p>
                        <p className="mt-1 font-semibold">{offered.listing.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatNgn(offered.listing.priceNgn)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid h-fit gap-2">
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">Target value</p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatNgn(proposal.valuationSnapshot?.targetValueNgn ?? proposal.targetListing.priceNgn)}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">Offered value</p>
                    <p className="mt-1 text-xl font-semibold">
                      {formatNgn(
                        proposal.valuationSnapshot?.offeredValueNgn ??
                          proposal.offeredListings.reduce((total, item) => total + item.listing.priceNgn, 0),
                      )}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-background p-3">
                    <p className="text-sm text-muted-foreground">Top-up</p>
                    <p className="mt-1 text-xl font-semibold">{formatNgn(proposal.topUpNgn)}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!canAccept || busyAction === `accept:${proposal.id}`}
                    onClick={() => void acceptProposal(proposal.id)}
                  >
                    {busyAction === `accept:${proposal.id}` ? "Accepting..." : "Accept proposal"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
