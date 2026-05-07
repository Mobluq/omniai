"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

type Persona = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  kycStatus: string;
  sellerScore: number;
};

type Brand = { id: string; name: string; tier: string };
type Category = { id: string; name: string; slug: string };
type Photo = { id: string; url: string; role: string };
type Listing = {
  id: string;
  title: string;
  status: string;
  priceNgn: number;
  condition: string;
  brand?: Brand | null;
  category?: Category | null;
  photos?: Photo[];
  seller?: { id: string; name: string | null; sellerScore: number };
  reviewQueueItems?: { id: string; status: string; decision?: string | null }[];
};
type Order = {
  id: string;
  status: string;
  escrowState: string;
  grossNgn: number;
  payoutNgn: number;
  buyerId: string;
  sellerId: string;
  listing: Listing;
  payments: { id: string; status: string; amountNgn: number }[];
  shipments: { id: string; status: string; courier: string; trackingNumber: string | null }[];
  reviews: { id: string; authorId: string; targetId: string; stars: number }[];
};
type QueueItem = {
  id: string;
  status: string;
  slaDueAt: string | null;
  listing: Listing;
};

const tabs = ["browse", "sell", "orders", "review"] as const;
type Tab = (typeof tabs)[number];

function formatNgn(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

async function readApi<T>(url: string, userId?: string): Promise<T> {
  const response = await fetch(url, {
    headers: userId ? { "x-bd-select-user-id": userId } : undefined,
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

async function writeApi<T>(url: string, userId: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bd-select-user-id": userId,
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function ConsoleClient() {
  const [activeTab, setActiveTab] = useState<Tab>("browse");
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [message, setMessage] = useState("Seed demo data with SEED_DEMO_DATA=true to use the console.");

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  async function refresh(userId = activeUserId) {
    try {
      const [search, taxonomy] = await Promise.all([
        readApi<{ listings: Listing[] }>("/api/v1/search"),
        readApi<{ brands: Brand[]; categories: Category[] }>("/api/v1/catalog/taxonomy"),
      ]);
      setListings(search.listings);
      setBrands(taxonomy.brands);
      setCategories(taxonomy.categories);

      if (userId) {
        const [userListings, userOrders] = await Promise.all([
          readApi<{ listings: Listing[] }>("/api/v1/listings", userId),
          readApi<{ orders: Order[] }>("/api/v1/orders", userId),
        ]);
        setMyListings(userListings.listings);
        setOrders(userOrders.orders);

        const persona = personas.find((item) => item.id === userId);
        if (persona?.role === "authenticator" || persona?.role === "admin") {
          const reviewQueue = await readApi<{ queue: QueueItem[] }>("/api/v1/admin/queue", userId);
          setQueue(reviewQueue.queue);
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const [personaResult, search, taxonomy] = await Promise.all([
          readApi<{ users: Persona[] }>("/api/v1/dev/personas"),
          readApi<{ listings: Listing[] }>("/api/v1/search"),
          readApi<{ brands: Brand[]; categories: Category[] }>("/api/v1/catalog/taxonomy"),
        ]);
        setPersonas(personaResult.users);
        setListings(search.listings);
        setBrands(taxonomy.brands);
        setCategories(taxonomy.categories);
        const first = personaResult.users[0];
        if (first) {
          setActiveUserId(first.id);
          const [userListings, userOrders] = await Promise.all([
            readApi<{ listings: Listing[] }>("/api/v1/listings", first.id),
            readApi<{ orders: Order[] }>("/api/v1/orders", first.id),
          ]);
          setMyListings(userListings.listings);
          setOrders(userOrders.orders);
          if (first.role === "authenticator" || first.role === "admin") {
            const reviewQueue = await readApi<{ queue: QueueItem[] }>("/api/v1/admin/queue", first.id);
            setQueue(reviewQueue.queue);
          }
          setMessage("Console loaded. Choose a persona and run a workflow.");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Console failed to load.");
      }
    }

    void load();
  }, []);

  async function createDemoListing() {
    if (!activeUserId) return;
    const brand = brands[0];
    const category = categories[0];
    await writeApi("/api/v1/listings", activeUserId, {
      title: `BD Select review item ${Date.now()}`,
      description: "Console-created listing ready for authentication review.",
      brandId: brand?.id,
      categoryId: category?.id,
      condition: "excellent",
      priceNgn: 145000,
      photos: ["front", "back", "label", "defect", "sole", "packaging"].map((role, index) => ({
        role,
        url: `https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80&console=${role}`,
        qualityScore: 90 - index,
        sortOrder: index,
      })),
    });
    setMessage("Draft listing created.");
    await refresh();
    setActiveTab("sell");
  }

  async function runAction(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      setMessage(label);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-6 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Operations console
          </p>
          <h1 className="mt-3 text-4xl font-semibold">BD Select MVP Workflows</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Run the core marketplace loop locally: buyer purchase, payment capture, seller shipment,
            buyer confirmation, reviews, seller listing, authentication review, and barter lock.
          </p>
        </div>

        <label className="grid gap-2 text-sm font-medium">
          Persona
          <select
            value={activeUserId}
            onChange={(event) => {
              setActiveUserId(event.target.value);
              void refresh(event.target.value);
            }}
            className="min-w-72 rounded-md border border-border bg-white px-3 py-2"
          >
            <option value="">Select persona</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} / {persona.role}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? (
          <span className="ml-4 text-muted-foreground">
            Active: {activeUser.email} / {activeUser.kycStatus}
          </span>
        ) : null}
      </section>

      <nav className="mx-auto mt-5 flex max-w-7xl flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${
              activeTab === tab ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="mx-auto mt-5 max-w-7xl">
        {activeTab === "browse" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <article key={listing.id} className="rounded-md border border-border bg-white p-4">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {listing.brand?.name ?? "Independent"} / {listing.condition}
                </p>
                <h2 className="mt-2 text-xl font-semibold">{listing.title}</h2>
                <p className="mt-2 text-2xl font-semibold">{formatNgn(listing.priceNgn)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Seller score {listing.seller?.sellerScore.toFixed(1) ?? "0.0"}
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  onClick={() =>
                    void runAction("Order created and listing reserved.", () =>
                      writeApi("/api/v1/orders", activeUserId, {
                        listingId: listing.id,
                        shippingFeeNgn: 2500,
                      }),
                    )
                  }
                >
                  Buy
                </button>
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === "sell" ? (
          <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr]">
            <div className="rounded-md border border-border bg-white p-5">
              <h2 className="text-xl font-semibold">Seller tools</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Create a review-ready listing with required photos, then submit it to the queue.
              </p>
              <button
                type="button"
                className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() => void runAction("Demo listing created.", createDemoListing)}
              >
                Create demo listing
              </button>
            </div>
            <div className="grid gap-3">
              {myListings.map((listing) => (
                <article key={listing.id} className="rounded-md border border-border bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{listing.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatNgn(listing.priceNgn)} / {listing.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void runAction("Listing submitted to authentication review.", () =>
                          writeApi(`/api/v1/listings/${listing.id}/submit`, activeUserId),
                        )
                      }
                    >
                      Submit
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "orders" ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <article key={order.id} className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{order.listing.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatNgn(order.grossNgn)} / {order.status} / escrow {order.escrowState}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void runAction("Payment recorded and escrow held.", () =>
                          writeApi(`/api/v1/orders/${order.id}/pay`, activeUserId, {
                            processor: "manual",
                            channel: "transfer",
                          }),
                        )
                      }
                    >
                      Pay
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void runAction("Shipment created.", () =>
                          writeApi(`/api/v1/orders/${order.id}/ship`, activeUserId, {
                            courier: "gig",
                            trackingNumber: `GIG-${Date.now()}`,
                            hubCode: "lekki-phase-1",
                            insuredValueNgn: order.grossNgn,
                          }),
                        )
                      }
                    >
                      Ship
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void runAction("Delivery confirmed and payout queued when seller token exists.", () =>
                          writeApi(`/api/v1/orders/${order.id}/confirm-delivery`, activeUserId),
                        )
                      }
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void runAction("Review submitted.", () =>
                          writeApi(`/api/v1/orders/${order.id}/reviews`, activeUserId, {
                            targetId: order.sellerId === activeUserId ? order.buyerId : order.sellerId,
                            stars: 5,
                            body: "Smooth BD Select transaction.",
                          }),
                        )
                      }
                    >
                      Review
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === "review" ? (
          <div className="grid gap-3">
            {queue.map((item) => (
              <article key={item.id} className="rounded-md border border-border bg-white p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">{item.listing.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatNgn(item.listing.priceNgn)} / due {item.slaDueAt ?? "unassigned"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {["approve", "reject", "request_more_photos"].map((decision) => (
                      <button
                        key={decision}
                        type="button"
                        className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                        onClick={() =>
                          void runAction(`Review decision: ${decision}.`, () =>
                            writeApi(`/api/v1/admin/queue/${item.id}/decide`, activeUserId, {
                              decision,
                              decisionReason:
                                decision === "approve"
                                  ? "Photos, brand signals, and price band look acceptable."
                                  : "Needs manual follow-up before public listing.",
                            }),
                          )
                        }
                      >
                        {decision}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
