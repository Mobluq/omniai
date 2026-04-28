import { AuthShell } from "@/components/layout/auth-shell";
import { AcceptInviteForm } from "@/components/invite/accept-invite-form";

type InvitePageProps = {
  searchParams: Promise<{ token?: string }> | { token?: string };
};

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const params = await searchParams;

  return (
    <AuthShell title="Accept workspace invite">
      <AcceptInviteForm token={params.token} />
    </AuthShell>
  );
}
