import { AuthShell } from "@/components/layout/auth-shell";
import { ResetPasswordForm } from "@/components/layout/auth-forms";

type ResetPasswordPageProps = {
  searchParams: Promise<{ email?: string; token?: string }> | { email?: string; token?: string };
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;

  return (
    <AuthShell title="Choose a new password">
      <ResetPasswordForm email={params.email} token={params.token} />
    </AuthShell>
  );
}
