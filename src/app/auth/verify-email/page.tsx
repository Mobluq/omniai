import { AuthShell } from "@/components/layout/auth-shell";
import { VerifyEmailForm } from "@/components/layout/auth-forms";

type VerifyEmailPageProps = {
  searchParams: Promise<{ email?: string; token?: string }> | { email?: string; token?: string };
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;

  return (
    <AuthShell title="Verify your email">
      <VerifyEmailForm email={params.email} token={params.token} />
    </AuthShell>
  );
}
