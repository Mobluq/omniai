"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { parseApiResponse, errorMessage } from "@/lib/api/client";

type FormState = "idle" | "loading" | "error";
type OAuthProviderViewModel = {
  id: "google" | "github";
  name: string;
};

export function SignInForm({ oauthProviders = [] }: { oauthProviders?: OAuthProviderViewModel[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<FormState>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      oneTimeCode: String(formData.get("oneTimeCode") ?? ""),
      redirect: false,
    });

    if (result?.error) {
      setState("error");
      toast({
        title: "Sign in failed",
        description: "Check your email, password, and authenticator code.",
        variant: "error",
      });
      return;
    }

    toast({ title: "Signed in", description: "Opening your workspace.", variant: "success" });
    router.push("/dashboard");
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      {oauthProviders.length ? (
        <div className="grid gap-2">
          {oauthProviders.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              onClick={() => signIn(provider.id, { callbackUrl: "/dashboard" })}
              disabled={state === "loading"}
            >
              Continue with {provider.name}
            </Button>
          ))}
          <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="oneTimeCode">Authenticator code</Label>
        <Input
          id="oneTimeCode"
          name="oneTimeCode"
          autoComplete="one-time-code"
          placeholder="Authenticator or recovery code"
        />
      </div>
      {state === "error" ? (
        <p className="text-sm text-destructive">The email, password, or authenticator code is incorrect.</p>
      ) : null}
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Signing in..." : "Sign in"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Forgot your password?{" "}
        <Link href="/auth/forgot-password" className="font-medium text-primary">
          Reset it
        </Link>
      </p>
      <p className="text-center text-sm text-muted-foreground">
        New to OmniAI?{" "}
        <Link href="/auth/sign-up" className="font-medium text-primary">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const [state, setState] = useState<FormState>("idle");
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setResetUrl(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await parseApiResponse<{
        requested: boolean;
        resetUrl: string | null;
        emailConfigured: boolean;
        emailSent?: boolean;
      }>(
        await fetch("/api/auth/password-reset/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: String(formData.get("email")) }),
        }),
      );
      setResetUrl(result.resetUrl);
      setState("idle");
      toast({
        title: "Reset request received",
        description: result.emailConfigured
          ? "If that account exists, a reset link will be sent."
          : "Email delivery is not configured yet. Use the local link in development or configure email.",
        variant: "success",
      });
    } catch (resetError: unknown) {
      setState("error");
      toast({
        title: "Reset request failed",
        description: errorMessage(resetError),
        variant: "error",
      });
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Requesting reset..." : "Request reset link"}
      </Button>
      {resetUrl ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Local reset link</p>
          <Link href={resetUrl} className="mt-1 block break-all text-primary">
            {resetUrl}
          </Link>
        </div>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/auth/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ email, token }: { email?: string; token?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<FormState>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const formData = new FormData(event.currentTarget);

    try {
      await parseApiResponse<{ reset: boolean }>(
        await fetch("/api/auth/password-reset/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: String(formData.get("email")),
            token: String(formData.get("token")),
            password: String(formData.get("password")),
          }),
        }),
      );
      toast({ title: "Password reset", description: "You can sign in with the new password.", variant: "success" });
      router.push("/auth/sign-in");
    } catch (resetError: unknown) {
      setState("error");
      toast({
        title: "Password reset failed",
        description: errorMessage(resetError),
        variant: "error",
      });
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="token">Reset token</Label>
        <Input id="token" name="token" defaultValue={token ?? ""} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
      </div>
      {state === "error" ? (
        <p className="text-sm text-destructive">The reset link is invalid or expired.</p>
      ) : null}
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}

export function VerifyEmailForm({ email, token }: { email?: string; token?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<FormState>("idle");
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const hasToken = Boolean(email && token);

  async function verifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const formData = new FormData(event.currentTarget);

    try {
      await parseApiResponse<{ verified: boolean }>(
        await fetch("/api/auth/email-verification/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: String(formData.get("email")),
            token: String(formData.get("token")),
          }),
        }),
      );
      toast({ title: "Email verified", description: "You can now sign in.", variant: "success" });
      router.push("/auth/sign-in");
    } catch (verifyError: unknown) {
      setState("error");
      toast({
        title: "Email verification failed",
        description: errorMessage(verifyError),
        variant: "error",
      });
    }
  }

  async function requestVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setVerificationUrl(null);
    const formData = new FormData(event.currentTarget);

    try {
      const result = await parseApiResponse<{
        requested: boolean;
        alreadyVerified: boolean;
        verificationUrl: string | null;
        emailConfigured: boolean;
      }>(
        await fetch("/api/auth/email-verification/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: String(formData.get("email")) }),
        }),
      );
      setVerificationUrl(result.verificationUrl);
      setState("idle");
      toast({
        title: result.alreadyVerified ? "Email already verified" : "Verification request received",
        description: result.emailConfigured
          ? "If that account exists, a verification link will be sent."
          : "Email delivery is not configured yet. Use the local link in development or configure email.",
        variant: "success",
      });
    } catch (verifyError: unknown) {
      setState("error");
      toast({
        title: "Verification request failed",
        description: errorMessage(verifyError),
        variant: "error",
      });
    }
  }

  if (hasToken) {
    return (
      <form className="mt-6 grid gap-4" onSubmit={verifyEmail}>
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="token" value={token} />
        <p className="text-sm text-muted-foreground">
          Confirm this email address to finish securing your OmniAI account.
        </p>
        {state === "error" ? (
          <p className="text-sm text-destructive">The verification link is invalid or expired.</p>
        ) : null}
        <Button type="submit" disabled={state === "loading"}>
          {state === "loading" ? "Verifying..." : "Verify email"}
        </Button>
      </form>
    );
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={requestVerification}>
      <p className="text-sm text-muted-foreground">
        Enter your email and OmniAI will send a fresh verification link.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
      </div>
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Sending..." : "Send verification link"}
      </Button>
      {verificationUrl ? (
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">Local verification link</p>
          <Link href={verificationUrl} className="mt-1 block break-all text-primary">
            {verificationUrl}
          </Link>
        </div>
      ) : null}
      <p className="text-center text-sm text-muted-foreground">
        Already verified?{" "}
        <Link href="/auth/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState<FormState>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name")),
          email,
          password,
          inviteCode: String(formData.get("inviteCode") ?? "") || undefined,
        }),
      });
      const result = await parseApiResponse<{
        verification?: { verificationUrl: string | null; emailConfigured: boolean };
      }>(response);
      toast({
        title: "Account created",
        description: result.verification?.emailConfigured
          ? "Check your email to verify the account."
          : "Verify the account before signing in. Email delivery is not configured yet.",
        variant: "success",
      });
      router.push(result.verification?.verificationUrl ?? `/auth/verify-email?email=${encodeURIComponent(email)}`);
      return;
    } catch (signUpError: unknown) {
      setState("error");
      toast({
        title: "Account could not be created",
        description: errorMessage(signUpError, "Check the details and try again."),
        variant: "error",
      });
      return;
    }
  }

  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="inviteCode">Invite code</Label>
        <Input id="inviteCode" name="inviteCode" autoComplete="off" />
      </div>
      {state === "error" ? (
        <p className="text-sm text-destructive">Could not create the account. Check the details and try again.</p>
      ) : null}
      <Button type="submit" disabled={state === "loading"}>
        {state === "loading" ? "Creating account..." : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/sign-in" className="font-medium text-primary">
          Sign in
        </Link>
      </p>
    </form>
  );
}
