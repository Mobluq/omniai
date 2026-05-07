"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PersonaSelector } from "@/components/marketplace/persona-selector";
import {
  readApi,
  writeApi,
  type EvidenceCategory,
  type EvidenceContentType,
  type EvidenceDisputeSummary,
  type EvidenceFileSummary,
  type Persona,
} from "@/lib/client/api";

const evidenceCategories: EvidenceCategory[] = [
  "item_condition",
  "authentication",
  "delivery",
  "payment",
  "conversation",
  "other",
];

const evidenceContentTypes: EvidenceContentType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function labelize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatBytes(value?: number | null) {
  if (!value) return "Size pending";
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(value / 1024)} KB`;
}

function evidenceFiles(dispute?: EvidenceDisputeSummary | null): EvidenceFileSummary[] {
  return dispute?.evidence?.files ?? [];
}

function caseTitle(dispute: EvidenceDisputeSummary) {
  return (
    dispute.order?.listing.title ??
    dispute.barterProposal?.targetListing?.title ??
    "Support dispute"
  );
}

function caseContext(dispute: EvidenceDisputeSummary) {
  if (dispute.orderId) return "Order";
  if (dispute.barterProposalId) return "Barter";
  return "Support";
}

function isAdminPersona(persona?: Persona) {
  return persona?.role === "admin" || persona?.role === "super_admin";
}

export function EvidenceClient() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [disputes, setDisputes] = useState<EvidenceDisputeSummary[]>([]);
  const [selectedDisputeId, setSelectedDisputeId] = useState("");
  const [category, setCategory] = useState<EvidenceCategory>("item_condition");
  const [contentType, setContentType] = useState<EvidenceContentType>("image/jpeg");
  const [byteSize, setByteSize] = useState(420_000);
  const [note, setNote] = useState(
    "Photos show sole wear that was not visible in the original listing.",
  );
  const [message, setMessage] = useState("Loading evidence vault.");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeUser = useMemo(
    () => personas.find((persona) => persona.id === activeUserId),
    [activeUserId, personas],
  );

  const selectedDispute = useMemo(() => {
    return disputes.find((dispute) => dispute.id === selectedDisputeId) ?? disputes[0] ?? null;
  }, [disputes, selectedDisputeId]);

  const selectedFiles = useMemo(() => evidenceFiles(selectedDispute), [selectedDispute]);

  const stats = useMemo(() => {
    return disputes.reduce(
      (current, dispute) => {
        current.cases += 1;
        current.files += evidenceFiles(dispute).length;
        if (dispute.status === "awaiting_evidence") current.awaiting += 1;
        if (dispute.status === "under_review") current.review += 1;
        if (dispute.orderId) current.orders += 1;
        if (dispute.barterProposalId) current.barter += 1;
        return current;
      },
      { cases: 0, files: 0, awaiting: 0, review: 0, orders: 0, barter: 0 },
    );
  }, [disputes]);

  const loadEvidence = useCallback(async (userId: string, preferredDisputeId?: string) => {
    if (!userId) return;

    const result = await readApi<{ disputes: EvidenceDisputeSummary[] }>(
      "/api/v1/evidence",
      userId,
    );
    setDisputes(result.disputes);
    setSelectedDisputeId((current) => {
      if (
        preferredDisputeId &&
        result.disputes.some((dispute) => dispute.id === preferredDisputeId)
      ) {
        return preferredDisputeId;
      }
      if (result.disputes.some((dispute) => dispute.id === current)) return current;
      return result.disputes[0]?.id ?? "";
    });
    setMessage(
      result.disputes.length
        ? "Evidence vault loaded."
        : "No dispute evidence is visible for this persona.",
    );
  }, []);

  useEffect(() => {
    async function loadPersonas() {
      try {
        const result = await readApi<{ users: Persona[] }>("/api/v1/dev/personas");
        setPersonas(result.users);
        const admin = result.users.find((persona) => persona.role === "admin") ?? result.users[0];
        setActiveUserId(admin?.id ?? "");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Evidence personas failed to load.");
      }
    }

    void loadPersonas();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;

    async function refresh() {
      try {
        await loadEvidence(activeUserId);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Evidence vault data failed to load.");
      }
    }

    void refresh();
  }, [activeUserId, loadEvidence]);

  async function attachEvidence() {
    if (!activeUserId || !selectedDispute) {
      setMessage("Select a dispute first.");
      return;
    }

    setBusyAction("attach");
    try {
      const ticket = await writeApi<{
        asset: { id: string };
        upload: { provider: string; expiresAt: string };
      }>("/api/v1/evidence/upload-tickets", activeUserId, {
        disputeId: selectedDispute.id,
        category,
        contentType,
        byteSize,
      });

      await writeApi(`/api/v1/media/assets/${ticket.asset.id}/complete`, activeUserId, {
        byteSize,
        width: contentType.startsWith("image/") ? 1600 : undefined,
        height: contentType.startsWith("image/") ? 1200 : undefined,
      });

      await writeApi<{ dispute: EvidenceDisputeSummary }>(
        "/api/v1/evidence/attachments",
        activeUserId,
        {
          disputeId: selectedDispute.id,
          assetId: ticket.asset.id,
          category,
          note,
        },
      );

      setMessage(`Evidence attached through ${ticket.upload.provider}.`);
      await loadEvidence(activeUserId, selectedDispute.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Evidence attachment failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/orders" className="text-sm font-semibold text-muted-foreground">
            Back to orders
          </Link>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Evidence vault
          </p>
          <h1 className="mt-3 text-4xl font-semibold">Dispute evidence</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Case files for order and barter disputes, with controlled uploads, redacted notes,
            attachment history, and support visibility.
          </p>
        </div>
        <PersonaSelector
          label="Evidence persona"
          personas={personas}
          activeUserId={activeUserId}
          onChange={setActiveUserId}
        />
      </header>

      <section className="mx-auto mt-5 max-w-7xl rounded-md border border-border bg-white p-4 text-sm">
        <span className="font-semibold">Status: </span>
        <span className="text-muted-foreground">{message}</span>
        {activeUser ? (
          <span className="ml-4 text-muted-foreground">
            Active: {activeUser.email} {isAdminPersona(activeUser) ? "/ support view" : ""}
          </span>
        ) : null}
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-3 md:grid-cols-6">
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Cases</p>
          <p className="mt-2 text-3xl font-semibold">{stats.cases}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Files</p>
          <p className="mt-2 text-3xl font-semibold">{stats.files}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Awaiting</p>
          <p className="mt-2 text-3xl font-semibold">{stats.awaiting}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Review</p>
          <p className="mt-2 text-3xl font-semibold">{stats.review}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="mt-2 text-3xl font-semibold">{stats.orders}</p>
        </article>
        <article className="rounded-md border border-border bg-white p-4">
          <p className="text-sm text-muted-foreground">Barter</p>
          <p className="mt-2 text-3xl font-semibold">{stats.barter}</p>
        </article>
      </section>

      <section className="mx-auto mt-5 grid max-w-7xl gap-5 xl:grid-cols-[0.38fr_1fr]">
        <aside className="rounded-md border border-border bg-white">
          <div className="border-b border-border p-4">
            <h2 className="text-xl font-semibold">Cases</h2>
          </div>
          <div className="max-h-[52rem] overflow-y-auto">
            {disputes.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No visible disputes.</div>
            ) : null}

            {disputes.map((dispute) => {
              const selected = dispute.id === selectedDispute?.id;
              const files = evidenceFiles(dispute);
              return (
                <button
                  key={dispute.id}
                  type="button"
                  className={`grid w-full gap-2 border-b border-border p-4 text-left ${
                    selected ? "bg-background" : "bg-white"
                  }`}
                  onClick={() => setSelectedDisputeId(dispute.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {caseContext(dispute)} / {labelize(dispute.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">{files.length} files</p>
                  </div>
                  <h3 className="font-semibold">{caseTitle(dispute)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {labelize(dispute.reasonCode)} / raised by{" "}
                    {dispute.raisedBy.email ?? dispute.raisedBy.name}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="min-h-[48rem] rounded-md border border-border bg-white">
          {selectedDispute ? (
            <div className="grid min-h-[48rem] grid-rows-[auto_auto_1fr]">
              <header className="border-b border-border p-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  {caseContext(selectedDispute)} / {labelize(selectedDispute.reasonCode)} /{" "}
                  {labelize(selectedDispute.status)}
                </p>
                <h2 className="mt-2 text-3xl font-semibold">{caseTitle(selectedDispute)}</h2>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                  <p>Raised: {formatDate(selectedDispute.createdAt)}</p>
                  <p>Updated: {formatDate(selectedDispute.updatedAt)}</p>
                  <p>
                    Raised by: {selectedDispute.raisedBy.email ?? selectedDispute.raisedBy.name}
                  </p>
                </div>
              </header>

              <section className="grid gap-4 border-b border-border bg-background p-5 lg:grid-cols-[0.5fr_0.5fr_1fr_auto]">
                <label className="grid gap-2 text-sm font-medium">
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value as EvidenceCategory)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    {evidenceCategories.map((item) => (
                      <option key={item} value={item}>
                        {labelize(item)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  File type
                  <select
                    value={contentType}
                    onChange={(event) => setContentType(event.target.value as EvidenceContentType)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  >
                    {evidenceContentTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Note
                  <input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="rounded-md border border-border bg-white px-3 py-2"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Size
                  <input
                    type="number"
                    min={1}
                    max={20 * 1024 * 1024}
                    value={byteSize}
                    onChange={(event) => setByteSize(Number(event.target.value))}
                    className="w-36 rounded-md border border-border bg-white px-3 py-2"
                  />
                </label>
                <div className="lg:col-span-4">
                  <button
                    type="button"
                    className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={busyAction === "attach"}
                    onClick={() => void attachEvidence()}
                  >
                    {busyAction === "attach" ? "Attaching..." : "Attach evidence"}
                  </button>
                </div>
              </section>

              <section className="grid content-start gap-3 p-5">
                {selectedFiles.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-background p-8 text-center">
                    <h2 className="text-2xl font-semibold">No evidence files</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                      Evidence attachments will appear here after upload completion.
                    </p>
                  </div>
                ) : null}

                {selectedFiles.map((file) => (
                  <article
                    key={file.id}
                    className="rounded-md border border-border bg-background p-4"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_12rem]">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {labelize(file.category)} / {file.contentType} /{" "}
                          {formatBytes(file.byteSize)}
                        </p>
                        <h3 className="mt-2 text-xl font-semibold">{file.assetId}</h3>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {file.note ?? "No note supplied."}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>Attached {formatDate(file.attachedAt)}</span>
                          <span>/</span>
                          <span>Uploader {file.uploadedById}</span>
                          {file.redacted ? (
                            <>
                              <span>/</span>
                              <span>Redacted</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <a
                        href={file.url}
                        className="grid min-h-28 place-items-center rounded-md border border-border bg-white px-3 text-center text-sm font-semibold"
                      >
                        Preview file
                      </a>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          ) : (
            <div className="grid min-h-[48rem] place-items-center p-8 text-center">
              <div>
                <h2 className="text-3xl font-semibold">No case selected</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Disputes with visible evidence access will appear in this vault.
                </p>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
