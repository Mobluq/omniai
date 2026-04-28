import { AuthShell } from "@/components/layout/auth-shell";
import { ForgotPasswordForm } from "@/components/layout/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
