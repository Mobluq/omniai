"use client";

import { useEffect } from "react";
import { TriangleAlert } from "@/components/ui/huge-icons";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-lg rounded-lg border bg-card p-6 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-destructive/10 text-destructive">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The app could not finish loading this view. Try again, or return to the dashboard.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" onClick={() => window.location.assign("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </section>
    </main>
  );
}
