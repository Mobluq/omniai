import { AuthShell } from "@/components/layout/auth-shell";
import { SignInForm } from "@/components/layout/auth-forms";

export default function SignInPage() {
  return (
    <AuthShell title="Sign in">
      <SignInForm />
    </AuthShell>
  );
}
