"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { formatNgn, readApi, writeApi, type ListingSummary, type Persona } from "@/lib/client/api";

type ListingDetailClientProps = {
  listingId: string;
};

export function ListingDetailClient({ listingId }: ListingDetailClientProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [message, setMessage] = useState("Loading listing.");

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  useEffect(() => {
    async function load() {
      try {
        const [personaResult, listingResult] = await Promise.all([
          readApi<{ users: Persona[] }>("/api/v1/dev/personas"),
          readApi<{ listing: ListingSummary }>(`/api/v1/listings/${listingId}`),
        ]);
        setPersonas(personaResult.users);
        const buyer = personaResult.users.find((persona) => persona.role === "buyer") ?? personaResult.users[0];
        setActiveUserId(buyer?.id ?? "");
        setListing(listingResult.listing);
        setMessage("Ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Listing failed to load.");
      }
    }

    void load();
  }, [listingId]);

  async function buy() {
    if (!activeUserId) {
      setMessage("Select a buyer persona first.");
      return;
    }

    try {
      const result = await writeApi<{ order: { id: string } }>("/api/v1/orders", activeUserId, {
        listingId,
        shippingFeeNgn: 2500,
      });
      setMessage(`Order created: ${result.order.id}. Open Orders to pay.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order creation failed.");
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/marketplace" className="text-sm font-semibold text-muted-foreground">
            Back to marketplace
          </Link>
          <h1 className="mt-3 text-4xl font-semibold">{listing?.title ?? "Listing"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Authentication-reviewed detail page with required media roles, seller score, and escrow checkout.
          </p>
        </div>
        <PersonaSelector personas={personas} activeUserId={activeUserId} onChange={setActiveUserId} />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span> : null}
      </section>

      {listing ? (
        <section className="mx-auto mt-5 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.55fr]">
          <div className="grid gap-3 md:grid-cols-2">
            {(listing.photos ?? []).map((photo) => (
              <article key={photo.id} className="rounded-md border border-border bg-white p-3">
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-background">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`${photo.role} photo`} className="h-full w-full object-cover" />
                </div>
                <p className="mt-3 text-sm font-semibold">{photo.role}</p>
                <p className="mt-1 text-xs text-muted-foreground">Quality {photo.qualityScore ?? "not scored"}</p>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-md border border-border bg-white p-5">
            <p className="text-sm font-semibold uppercase text-muted-foreground">
              {listing.brand?.name ?? "Independent"} / {listing.category?.name ?? "Fashion"}
            </p>
            <p className="mt-4 text-4xl font-semibold">{formatNgn(listing.priceNgn)}</p>
            <p className="mt-4 leading-7 text-muted-foreground">{listing.description}</p>
            <dl className="mt-5 grid gap-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Condition</dt>
                <dd className="font-semibold">{listing.condition}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Seller score</dt>
                <dd className="font-semibold">{listing.seller?.sellerScore.toFixed(1) ?? "0.0"}</dd>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">Protection</dt>
                <dd className="font-semibold">Escrow + dispute window</dd>
              </div>
            </dl>
            <button
              type="button"
              className="mt-5 w-full rounded-md bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              onClick={() => void buy()}
            >
              Buy with escrow
            </button>
            <Link
              href="/orders"
              className="mt-3 block w-full rounded-md border border-border px-4 py-3 text-center text-sm font-semibold"
            >
              View orders
            </Link>
          </aside>
        </section>
      ) : null}
    </main>
  );
}
