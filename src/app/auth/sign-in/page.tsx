import { AuthShell } from "@/components/layout/auth-shell";
import { SignInForm } from "@/components/layout/auth-forms";
import { getEnabledOAuthProviders } from "@/modules/auth/oauth-providers";

export default function SignInPage() {
  const oauthProviders = getEnabledOAuthProviders();

  return (
    <AuthShell title="Sign in">
      <SignInForm oauthProviders={oauthProviders} />
    </AuthShell>
  );
}
