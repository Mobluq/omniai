"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import { formatNgn, readApi, writeApi, type ListingSummary, type Persona } from "@/lib/client/api";

export function MarketplaceBrowseClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("Browse authenticated listings.");

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  async function loadListings(search = query) {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    const result = await readApi<{ listings: ListingSummary[] }>(`/api/v1/search?${params.toString()}`);
    setListings(result.listings);
  }

  useEffect(() => {
    async function load() {
      try {
        const [personaResult, searchResult] = await Promise.all([
          readApi<{ users: Persona[] }>("/api/v1/dev/personas"),
          readApi<{ listings: ListingSummary[] }>("/api/v1/search"),
        ]);
        setPersonas(personaResult.users);
        const buyer = personaResult.users.find((persona) => persona.role === "buyer") ?? personaResult.users[0];
        setActiveUserId(buyer?.id ?? "");
        setListings(searchResult.listings);
        setMessage("Ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Marketplace failed to load.");
      }
    }

    void load();
  }, []);

  async function buyListing(listingId: string) {
    if (!activeUserId) {
      setMessage("Select a buyer persona first.");
      return;
    }

    try {
      const result = await writeApi<{ order: { id: string } }>("/api/v1/orders", activeUserId, {
        listingId,
        shippingFeeNgn: 2500,
      });
      setMessage(`Order created. Open Orders to pay and track it: ${result.order.id}`);
      await loadListings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Order creation failed.");
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Marketplace
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Authenticated premium resale</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Browse live listings that have passed BD Select review. Checkout creates an escrowed
            order and reserves the listing.
          </p>
        </div>
        <PersonaSelector personas={personas} activeUserId={activeUserId} onChange={setActiveUserId} />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? <span className="ml-4 text-muted-foreground">Active: {activeUser.email}</span> : null}
      </section>

      <section className="mx-auto mt-5 flex max-w-7xl flex-col gap-3 rounded-md border border-border bg-white p-4 md:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search brand, item, or description"
          className="min-h-10 flex-1 rounded-md border border-border px-3"
        />
        <button
          type="button"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          onClick={() => void loadListings()}
        >
          Search
        </button>
        <Link href="/orders" className="rounded-md border border-border px-4 py-2 text-center text-sm font-semibold">
          Orders
        </Link>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => {
          const image = listing.photos?.[0]?.url;
          return (
            <article key={listing.id} className="overflow-hidden rounded-md border border-border bg-white">
              <Link href={`/marketplace/${listing.id}`} className="block">
                <div className="aspect-[4/3] bg-background">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt={listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-muted-foreground">BD Select</div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {listing.brand?.name ?? "Independent"} / {listing.condition}
                </p>
                <Link href={`/marketplace/${listing.id}`}>
                  <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
                </Link>
                <p className="mt-2 text-2xl font-semibold">{formatNgn(listing.priceNgn)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Seller score {listing.seller?.sellerScore.toFixed(1) ?? "0.0"}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/marketplace/${listing.id}`}
                    className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                  >
                    Details
                  </Link>
                  <button
                    type="button"
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    onClick={() => void buyListing(listing.id)}
                  >
                    Buy
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
