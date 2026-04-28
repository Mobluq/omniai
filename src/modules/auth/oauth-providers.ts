import "server-only";

export type EnabledOAuthProvider = {
  id: "google" | "github";
  name: "Google" | "GitHub";
};

export function getEnabledOAuthProviders(): EnabledOAuthProvider[] {
  const providers: EnabledOAuthProvider[] = [];

  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    providers.push({ id: "google", name: "Google" });
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push({ id: "github", name: "GitHub" });
  }

  return providers;
}
