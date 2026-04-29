import Link from "next/link";
import { SearchX } from "@/components/ui/huge-icons";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <section className="w-full max-w-lg rounded-lg border bg-card p-6 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-md bg-muted text-muted-foreground">
          <SearchX className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page may have moved, or you may not have access to it.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
