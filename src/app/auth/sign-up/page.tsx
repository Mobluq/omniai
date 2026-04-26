import { AuthShell } from "@/components/layout/auth-shell";
import { SignUpForm } from "@/components/layout/auth-forms";

export default function SignUpPage() {
  return (
    <AuthShell title="Create your OmniAI account">
      <SignUpForm />
    </AuthShell>
  );
}
