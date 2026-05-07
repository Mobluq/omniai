"use client";

import { useState } from "react";

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

async function postApi<T>(url: string, body: Record<string, unknown>, userId?: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(userId ? { "x-bd-select-user-id": userId } : {}),
    },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.data;
}

export function OnboardingClient() {
  const [identifier, setIdentifier] = useState("newbuyer@bdselect.local");
  const [name, setName] = useState("New BD Select User");
  const [code, setCode] = useState("000000");
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("Request an OTP to start onboarding.");

  async function run(label: string, action: () => Promise<unknown>) {
    try {
      const result = await action();
      setMessage(`${label}${result ? ` ${JSON.stringify(result)}` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    }
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-8 text-foreground lg:px-10">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Identity and KYC
        </p>
        <h1 className="mt-4 text-4xl font-semibold">BD Select onboarding</h1>
        <p className="mt-4 max-w-3xl leading-7 text-muted-foreground">
          This local flow exercises the OTP, KYC, and seller activation services. In development,
          OTP code is `000000`; production must replace trusted headers with the final Auth.js
          session adapter.
        </p>

        <div className="mt-6 rounded-md border border-border bg-white p-4 text-sm">
          <span className="font-semibold">Status: </span>
          <span className="text-muted-foreground">{message}</span>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-xl font-semibold">1. OTP</h2>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Email or phone
              <input
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="rounded-md border border-border px-3 py-2"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border border-border px-3 py-2"
              />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-medium">
              OTP
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="rounded-md border border-border px-3 py-2"
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-2 text-sm font-semibold"
                onClick={() =>
                  void run("OTP requested.", () =>
                    postApi("/api/v1/auth/otp/request", { identifier, purpose: "sign_in" }),
                  )
                }
              >
                Request
              </button>
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                onClick={() =>
                  void run("OTP verified.", async () => {
                    const result = await postApi<{
                      user: { id: string; email: string | null; phone: string | null };
                      development: { trustedAuthHeaderUserId?: string };
                    }>("/api/v1/auth/otp/verify", { identifier, purpose: "sign_in", code, name });
                    setUserId(result.development.trustedAuthHeaderUserId ?? result.user.id);
                    return { userId: result.user.id };
                  })
                }
              >
                Verify
              </button>
            </div>
          </section>

          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-xl font-semibold">2. KYC</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Development mode auto-verifies and stores only last-four evidence plus a hashed token.
            </p>
            <button
              type="button"
              className="mt-5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() =>
                void run("KYC submitted.", () =>
                  postApi(
                    "/api/v1/me/kyc",
                    {
                      provider: "manual",
                      verificationType: "bvn",
                      identityLast4: "1234",
                      legalName: name,
                      selfieChecked: true,
                    },
                    userId,
                  ),
                )
              }
            >
              Submit KYC
            </button>
          </section>

          <section className="rounded-md border border-border bg-white p-5">
            <h2 className="text-xl font-semibold">3. Seller</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Activates a seller profile after KYC verification and upgrades buyer role to seller.
            </p>
            <button
              type="button"
              className="mt-5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
              onClick={() =>
                void run("Seller profile activated.", () =>
                  postApi(
                    "/api/v1/seller/profile",
                    {
                      storeName: `${name}'s Closet`,
                      bio: "New BD Select seller profile.",
                      payoutToken: "demo_payout_token_new_seller",
                      defaultHubCode: "lekki-phase-1",
                    },
                    userId,
                  ),
                )
              }
            >
              Activate seller
            </button>
          </section>
        </div>
      </section>
    </main>
  );
}
