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

export function SignInForm() {
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
        New to OmniAI?{" "}
        <Link href="/auth/sign-up" className="font-medium text-primary">
          Create an account
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
      await parseApiResponse(response);
    } catch (signUpError: unknown) {
      setState("error");
      toast({
        title: "Account could not be created",
        description: errorMessage(signUpError, "Check the details and try again."),
        variant: "error",
      });
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    toast({ title: "Account created", description: "Your workspace is ready.", variant: "success" });
    router.push("/dashboard");
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
