"use client";

import { useEffect, useMemo, useState } from "react";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
type Persona = { id: string; name: string | null; email: string | null; role: string; kycStatus: string };
type Brand = { id: string; name: string };
type Category = { id: string; name: string };
type MediaAsset = {
  id: string;
  role: string | null;
  status: string;
  publicUrl: string;
  storageKey: string;
  qualityScore: number | null;
};

const photoRoles = ["front", "back", "label", "defect", "sole", "packaging"] as const;

async function readApi<T>(url: string, userId?: string): Promise<T> {
  const response = await fetch(url, { headers: userId ? { "x-bd-select-user-id": userId } : undefined });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

async function postApi<T>(url: string, userId: string, body: Record<string, unknown>): Promise<T> {
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

export function ListingWizardClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brandId, setBrandId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("Archive denim jacket");
  const [description, setDescription] = useState("Premium item with complete BD Select photo set.");
  const [condition, setCondition] = useState("excellent");
  const [priceNgn, setPriceNgn] = useState(145000);
  const [assets, setAssets] = useState<Record<string, MediaAsset>>({});
  const [listingId, setListingId] = useState("");
  const [message, setMessage] = useState("Load demo seed data, then generate media tickets.");

  const seller = useMemo(() => personas.find((persona) => persona.id === sellerId), [personas, sellerId]);
  const allPhotosReady = photoRoles.every((role) => assets[role]?.status === "uploaded");

  useEffect(() => {
    async function load() {
      try {
        const [personaResult, taxonomy] = await Promise.all([
          readApi<{ users: Persona[] }>("/api/v1/dev/personas"),
          readApi<{ brands: Brand[]; categories: Category[] }>("/api/v1/catalog/taxonomy"),
        ]);
        const sellers = personaResult.users.filter((persona) => persona.role === "seller");
        setPersonas(personaResult.users);
        setSellerId(sellers[0]?.id ?? personaResult.users[0]?.id ?? "");
        setBrands(taxonomy.brands);
        setCategories(taxonomy.categories);
        setBrandId(taxonomy.brands[0]?.id ?? "");
        setCategoryId(taxonomy.categories[0]?.id ?? "");
        setMessage("Ready.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to load wizard.");
      }
    }

    void load();
  }, []);

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      await action();
      setMessage(label);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action failed.");
    }
  }

  async function createAndCompleteTicket(role: string) {
    const ticket = await postApi<{ asset: MediaAsset; upload: { url: string } }>(
      "/api/v1/media/upload-tickets",
      sellerId,
      {
        role,
        contentType: "image/jpeg",
        byteSize: 450000,
      },
    );

    const complete = await postApi<{ asset: MediaAsset }>(
      `/api/v1/media/assets/${ticket.asset.id}/complete`,
      sellerId,
      {
        width: role === "label" ? 1600 : 1400,
        height: 1400,
        byteSize: 450000,
      },
    );

    setAssets((current) => ({ ...current, [role]: complete.asset }));
  }

  async function createListing() {
    const response = await postApi<{ listing: { id: string; status: string } }>("/api/v1/listings", sellerId, {
      title,
      description,
      brandId,
      categoryId,
      condition,
      priceNgn,
      photos: photoRoles.map((role, index) => {
        const asset = assets[role];
        return {
          mediaAssetId: asset.id,
          url: asset.publicUrl,
          storageKey: asset.storageKey,
          role,
          qualityScore: asset.qualityScore ?? 80,
          sortOrder: index,
        };
      }),
    });
    setListingId(response.listing.id);
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Seller listing wizard
        </p>
        <h1 className="mt-4 text-4xl font-semibold">Create review-ready inventory</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
          This flow uses upload tickets, completed media assets, required photo roles, and listing
          submission. In local development, previews are generated by BD Select.
        </p>

        <div className="mt-6 rounded-md border border-border bg-white p-4 text-sm">
          <span className="font-semibold">Status: </span>
          <span className="text-muted-foreground">{message}</span>
          {seller ? <span className="ml-4 text-muted-foreground">Seller: {seller.email}</span> : null}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[0.65fr_1fr]">
          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-xl font-semibold">Listing details</h2>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Seller
              <select
                value={sellerId}
                onChange={(event) => setSellerId(event.target.value)}
                className="rounded-md border border-border px-3 py-2"
              >
                {personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name} / {persona.role} / {persona.kycStatus}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-md border border-border px-3 py-2"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-24 rounded-md border border-border px-3 py-2"
              />
            </label>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Brand
                <select
                  value={brandId}
                  onChange={(event) => setBrandId(event.target.value)}
                  className="rounded-md border border-border px-3 py-2"
                >
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Category
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="rounded-md border border-border px-3 py-2"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Condition
                <select
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  className="rounded-md border border-border px-3 py-2"
                >
                  <option value="new_with_tags">New with tags</option>
                  <option value="new_without_tags">New without tags</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Price NGN
                <input
                  type="number"
                  value={priceNgn}
                  onChange={(event) => setPriceNgn(Number(event.target.value))}
                  className="rounded-md border border-border px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Required media</h2>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() =>
                  void run("All media assets uploaded.", async () => {
                    for (const role of photoRoles) {
                      await createAndCompleteTicket(role);
                    }
                  })
                }
              >
                Generate all
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {photoRoles.map((role) => {
                const asset = assets[role];
                return (
                  <article key={role} className="rounded-md border border-border bg-background p-3">
                    <div className="aspect-[4/3] overflow-hidden rounded-md border border-border bg-white">
                      {asset ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={asset.publicUrl} alt={`${role} preview`} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-muted-foreground">{role}</div>
                      )}
                    </div>
                    <p className="mt-3 text-sm font-semibold">{role}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {asset ? `${asset.status} / score ${asset.qualityScore ?? "n/a"}` : "Not uploaded"}
                    </p>
                    <button
                      type="button"
                      className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-semibold"
                      onClick={() =>
                        void run(`${role} uploaded.`, () => createAndCompleteTicket(role))
                      }
                    >
                      Generate
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!allPhotosReady}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
                onClick={() => void run("Draft listing created with attached media.", createListing)}
              >
                Create draft
              </button>
              <button
                type="button"
                disabled={!listingId}
                className="rounded-md border border-border px-4 py-2 text-sm font-semibold disabled:opacity-40"
                onClick={() =>
                  void run("Listing submitted to authentication review.", () =>
                    postApi(`/api/v1/listings/${listingId}/submit`, sellerId, {}),
                  )
                }
              >
                Submit to review
              </button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
