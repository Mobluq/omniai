"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { parseApiResponse, errorMessage, ClientApiError } from "@/lib/api/client";

type AcceptInviteResult = {
  workspace: {
    id: string;
    name: string;
  };
  role: "admin" | "member" | "viewer" | "owner";
};

export function AcceptInviteForm({ token }: { token?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "unauthorized">("idle");

  async function acceptInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) {
      setStatus("error");
      toast({
        title: "Invite link is missing",
        description: "Ask the workspace admin to send a fresh invite.",
        variant: "error",
      });
      return;
    }

    setStatus("loading");
    try {
      const result = await parseApiResponse<AcceptInviteResult>(
        await fetch("/api/workspace-invites/accept", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }),
      );
      toast({
        title: "Workspace joined",
        description: `You now have ${result.role} access to ${result.workspace.name}.`,
        variant: "success",
      });
      router.push("/dashboard");
    } catch (acceptError: unknown) {
      const isUnauthorized = acceptError instanceof ClientApiError && acceptError.code === "UNAUTHORIZED";
      setStatus(isUnauthorized ? "unauthorized" : "error");
      toast({
        title: isUnauthorized ? "Sign in required" : "Invite could not be accepted",
        description: isUnauthorized ? "Sign in with the invited email address, then reopen the invite link." : errorMessage(acceptError),
        variant: isUnauthorized ? "warning" : "error",
      });
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={acceptInvite}>
      <p className="text-sm text-muted-foreground">
        Accept this invite to join the workspace. The invite can only be used by the email address it was sent to.
      </p>
      {status === "unauthorized" ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Sign in required</p>
          <p className="mt-1 text-muted-foreground">
            Use the same email address that received the invite.
          </p>
          <Link href="/auth/sign-in" className="mt-2 inline-flex text-primary">
            Go to sign in
          </Link>
        </div>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-destructive">
          This invite may be expired, revoked, or assigned to a different email address.
        </p>
      ) : null}
      <Button type="submit" disabled={status === "loading" || !token}>
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserCheck className="h-4 w-4" aria-hidden="true" />
        )}
        Accept invite
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Need a different account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
