import Link from "next/link";

const pillars = [
  {
    label: "Authentication",
    value: "Human review plus AI signal scoring before every listing goes live.",
  },
  {
    label: "Escrow",
    value: "Paystack-first checkout with held funds, delivery confirmation, and payout control.",
  },
  {
    label: "Barter",
    value: "Comparable-value swaps with top-up handling and dual-shipment review.",
  },
  {
    label: "Curation",
    value: "Premium fashion only, with fast-fashion and counterfeit listings rejected.",
  },
];

const metrics = [
  { label: "Launch market", value: "Lagos + Abuja" },
  { label: "M18 GMV target", value: "NGN 600M monthly" },
  { label: "Auth target", value: "98%+ sampled accuracy" },
  { label: "North star", value: "Authenticated completed GMV" },
];

const modules = [
  "Identity + KYC",
  "Listings + media",
  "Review queue",
  "Orders + escrow",
  "Shipping",
  "Logistics ops",
  "Disputes",
  "Reputation",
  "Barter",
  "Messaging",
  "Notifications",
  "Evidence vault",
  "Risk center",
  "Insights + reporting",
  "Seller growth",
  "Audit",
  "Compliance",
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <section className="mx-auto grid min-h-dvh max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Authenticated resale marketplace
          </p>
          <h1 className="mt-5 text-5xl font-semibold md:text-7xl">BD Select</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            Premium fashion resale for Nigeria first, with authentication, escrow, logistics, seller
            tooling, and a native barter protocol designed into the foundation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/marketplace"
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Shop marketplace
            </Link>
            <Link
              href="/console"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Open console
            </Link>
            <Link
              href="/onboarding"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Onboarding
            </Link>
            <Link
              href="/sell/new"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Sell item
            </Link>
            <Link
              href="/orders"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Orders
            </Link>
            <Link
              href="/logistics"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Logistics
            </Link>
            <Link
              href="/barter"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Barter
            </Link>
            <Link
              href="/inbox"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Inbox
            </Link>
            <Link
              href="/notifications"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Notifications
            </Link>
            <Link
              href="/evidence"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Evidence
            </Link>
            <Link
              href="/admin/risk"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Risk
            </Link>
            <Link
              href="/admin/insights"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Insights
            </Link>
            <Link
              href="/seller/growth"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Seller growth
            </Link>
            <Link
              href="/admin"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Admin ops
            </Link>
            <Link
              href="/admin/audit"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Audit
            </Link>
            <Link
              href="/payouts"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Payouts
            </Link>
            <Link
              href="/api/health"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              Health check
            </Link>
            <a
              href="#foundation"
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-semibold"
            >
              View foundation
            </a>
          </div>
        </div>

        <aside className="grid gap-3" aria-label="BD Select marketplace targets">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="grid min-h-24 content-between rounded-md border border-border bg-white p-5"
            >
              <p className="text-sm text-muted-foreground">{metric.label}</p>
              <p className="mt-4 text-2xl font-semibold">{metric.value}</p>
            </div>
          ))}
        </aside>
      </section>

      <section id="foundation" className="border-t border-border bg-white px-6 py-14 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Groundwork
            </p>
            <h2 className="mt-4 text-3xl font-semibold">
              Built for trust operations from day one.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
              The first database and documentation pass is shaped around the actual operating model:
              authenticated supply, escrowed orders, review SLAs, dispute evidence, seller score,
              audit trails, and logistics events.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {pillars.map((pillar) => (
              <article
                key={pillar.label}
                className="rounded-md border border-border bg-background p-5"
              >
                <p className="font-semibold">{pillar.label}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.value}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-7xl">
          <p className="text-sm font-semibold text-muted-foreground">Initial bounded contexts</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-12">
            {modules.map((module) => (
              <div
                key={module}
                className="grid min-h-16 place-items-center rounded-md border border-border bg-background px-3 text-center text-sm font-medium"
              >
                {module}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
