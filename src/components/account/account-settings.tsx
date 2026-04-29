"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  LockKeyhole,
  Save,
  ShieldCheck,
  UserRound,
} from "@/components/ui/huge-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { parseApiResponse, errorMessage } from "@/lib/api/client";
import { modelRegistry } from "@/modules/ai/registry/model-registry";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  jobTitle: string | null;
  companyName: string | null;
  timezone: string;
  locale: string;
  defaultRoutingMode: "manual" | "suggest" | "auto";
  defaultModelId: string | null;
  memoryEnabled: boolean;
  dataRetentionDays: number;
  createdAt: string;
};

type NotificationPreferences = {
  emailProductUpdates: boolean;
  emailUsageAlerts: boolean;
  emailSecurityAlerts: boolean;
  emailWeeklyDigest: boolean;
  providerIncidentAlerts: boolean;
  billingAlerts: boolean;
};

type SecurityOverview = {
  twoFactorEnabled: boolean;
  twoFactorConfirmedAt: string | null;
  activeSessions: number;
  recentSecurityEvents: Array<{
    id: string;
    action: string;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: string;
  }>;
};

type TwoFactorSetup = {
  secret: string;
  otpauthUri: string;
  alreadyEnabled: boolean;
};

const notificationLabels: Array<{
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}> = [
  {
    key: "emailSecurityAlerts",
    title: "Security alerts",
    description: "Sign-in, 2FA, and account risk emails.",
  },
  {
    key: "emailUsageAlerts",
    title: "Usage alerts",
    description: "Provider spend, limits, and unusual usage emails.",
  },
  {
    key: "providerIncidentAlerts",
    title: "Provider alerts",
    description: "Provider outage or degraded routing emails.",
  },
  {
    key: "billingAlerts",
    title: "Billing alerts",
    description: "Subscription, invoice, and payment emails.",
  },
  {
    key: "emailWeeklyDigest",
    title: "Weekly digest",
    description: "Workspace usage and routing summary emails.",
  },
  {
    key: "emailProductUpdates",
    title: "Product updates",
    description: "Low-frequency release and feature emails.",
  },
];

export function AccountSettings() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [security, setSecurity] = useState<SecurityOverview | null>(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [updatingSecurity, setUpdatingSecurity] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const defaultModelId = profile?.defaultModelId ?? "openai-chat-primary";
  const securityBadge = useMemo(
    () => (security?.twoFactorEnabled ? "2FA enabled" : "2FA not enabled"),
    [security?.twoFactorEnabled],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const [profileEnvelope, notificationsEnvelope, securityEnvelope] = await Promise.all([
        parseApiResponse<{ profile: Profile }>(await fetch("/api/account/profile")),
        parseApiResponse<{ preferences: NotificationPreferences }>(
          await fetch("/api/account/notifications"),
        ),
        parseApiResponse<{ security: SecurityOverview }>(await fetch("/api/account/security")),
      ]);

      if (!cancelled) {
        setProfile(profileEnvelope.profile);
        setNotifications(notificationsEnvelope.preferences);
        setSecurity(securityEnvelope.security);
        setStatus("ready");
      }
    }

    load().catch((loadError: unknown) => {
      if (!cancelled) {
        toast({
          title: "Account settings could not be loaded",
          description: errorMessage(loadError),
          variant: "error",
        });
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [toast]);

  async function reloadSecurity() {
    const envelope = await parseApiResponse<{ security: SecurityOverview }>(
      await fetch("/api/account/security"),
    );
    setSecurity(envelope.security);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setSavingProfile(true);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    try {
      const envelope = await parseApiResponse<{ profile: Profile }>(
        await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: String(formData.get("name") ?? ""),
            jobTitle: String(formData.get("jobTitle") ?? "") || null,
            companyName: String(formData.get("companyName") ?? "") || null,
            timezone: String(formData.get("timezone") ?? "UTC"),
            locale: String(formData.get("locale") ?? "en"),
            defaultRoutingMode: String(formData.get("defaultRoutingMode") ?? "suggest"),
            defaultModelId: String(formData.get("defaultModelId") ?? defaultModelId),
            memoryEnabled: formData.get("memoryEnabled") === "on",
            dataRetentionDays: Number(formData.get("dataRetentionDays") ?? 365),
          }),
        }),
      );
      setProfile(envelope.profile);
      setNotice("Profile saved.");
      toast({ title: "Profile saved", variant: "success" });
    } catch (profileError: unknown) {
      const message = errorMessage(profileError);
      setNotice(message);
      toast({ title: "Profile update failed", description: message, variant: "error" });
    }

    setSavingProfile(false);
  }

  async function saveNotifications() {
    if (!notifications) {
      return;
    }

    setSavingNotifications(true);
    setNotice(null);
    try {
      const envelope = await parseApiResponse<{ preferences: NotificationPreferences }>(
        await fetch("/api/account/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notifications),
        }),
      );
      setNotifications(envelope.preferences);
      setNotice("Notification preferences saved.");
      toast({ title: "Notification preferences saved", variant: "success" });
    } catch (notificationError: unknown) {
      const message = errorMessage(notificationError);
      setNotice(message);
      toast({ title: "Notification update failed", description: message, variant: "error" });
    }

    setSavingNotifications(false);
  }

  async function startTwoFactorSetup() {
    setUpdatingSecurity(true);
    setNotice(null);
    try {
      const envelope = await parseApiResponse<{ setup: TwoFactorSetup }>(
        await fetch("/api/account/security/2fa/setup", { method: "POST" }),
      );
      setTwoFactorSetup(envelope.setup);
      setNotice("Authenticator setup started.");
      toast({ title: "Authenticator setup started", variant: "success" });
    } catch (setupError: unknown) {
      const message = errorMessage(setupError);
      setNotice(message);
      toast({ title: "2FA setup failed", description: message, variant: "error" });
    }

    setUpdatingSecurity(false);
  }

  async function verifyTwoFactorSetup() {
    setUpdatingSecurity(true);
    setNotice(null);
    try {
      const envelope = await parseApiResponse<{ recoveryCodes: string[] }>(
        await fetch("/api/account/security/2fa/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: verifyCode }),
        }),
      );
      setRecoveryCodes(envelope.recoveryCodes);
      setTwoFactorSetup(null);
      setVerifyCode("");
      await reloadSecurity();
      setNotice("Two-factor authentication is enabled.");
      toast({
        title: "Two-factor authentication enabled",
        description: "Store your recovery codes somewhere safe.",
        variant: "success",
      });
    } catch (verifyError: unknown) {
      const message = errorMessage(verifyError);
      setNotice(message);
      toast({ title: "2FA verification failed", description: message, variant: "error" });
    }

    setUpdatingSecurity(false);
  }

  async function disableTwoFactor() {
    setUpdatingSecurity(true);
    setNotice(null);
    try {
      await parseApiResponse<{ disabled: boolean }>(
        await fetch("/api/account/security/2fa/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: disableCode }),
        }),
      );
      setDisableCode("");
      setRecoveryCodes([]);
      await reloadSecurity();
      setNotice("Two-factor authentication is disabled.");
      toast({ title: "Two-factor authentication disabled", variant: "warning" });
    } catch (disableError: unknown) {
      const message = errorMessage(disableError);
      setNotice(message);
      toast({ title: "Could not disable 2FA", description: message, variant: "error" });
    }

    setUpdatingSecurity(false);
  }

  async function changePassword() {
    setChangingPassword(true);
    setNotice(null);
    try {
      await parseApiResponse<{ changed: boolean }>(
        await fetch("/api/account/security/password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }),
      );
      setCurrentPassword("");
      setNewPassword("");
      await reloadSecurity();
      setNotice("Password changed.");
      toast({ title: "Password changed", variant: "success" });
    } catch (passwordError: unknown) {
      const message = errorMessage(passwordError);
      setNotice(message);
      toast({ title: "Password change failed", description: message, variant: "error" });
    }

    setChangingPassword(false);
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error" || !profile || !notifications || !security) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Account settings could not be loaded. Sign in and try again.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" defaultValue={profile.name ?? ""} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="jobTitle">Role</Label>
                  <Input id="jobTitle" name="jobTitle" defaultValue={profile.jobTitle ?? ""} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Company</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    defaultValue={profile.companyName ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input id="timezone" name="timezone" defaultValue={profile.timezone} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="locale">Locale</Label>
                  <Input id="locale" name="locale" defaultValue={profile.locale} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dataRetentionDays">Personal retention days</Label>
                  <Input
                    id="dataRetentionDays"
                    name="dataRetentionDays"
                    type="number"
                    min={1}
                    max={3650}
                    defaultValue={profile.dataRetentionDays}
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-md border p-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="defaultModelId">Default model</Label>
                  <Select id="defaultModelId" name="defaultModelId" defaultValue={defaultModelId}>
                    {modelRegistry.map((model) => (
                      <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>
                        {model.displayName}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="defaultRoutingMode">Routing mode</Label>
                  <Select
                    id="defaultRoutingMode"
                    name="defaultRoutingMode"
                    defaultValue={profile.defaultRoutingMode}
                  >
                    <option value="manual">Manual</option>
                    <option value="suggest">Suggest</option>
                    <option value="auto">Auto</option>
                  </Select>
                </div>
                <label className="flex items-center justify-between rounded-md border p-3 text-sm md:col-span-2">
                  <span>Memory enabled</span>
                  <input
                    name="memoryEnabled"
                    type="checkbox"
                    defaultChecked={profile.memoryEnabled}
                    className="h-4 w-4"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button type="submit" disabled={savingProfile} className="w-full sm:w-auto">
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save profile
                </Button>
                {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Email preferences for account, usage, billing, and providers.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {notificationLabels.map((item) => (
                <label
                  key={item.key}
                  className="flex min-h-24 items-start justify-between gap-4 rounded-md border p-4"
                >
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notifications[item.key]}
                    onChange={(event) =>
                      setNotifications((current) =>
                        current ? { ...current, [item.key]: event.target.checked } : current,
                      )
                    }
                    className="mt-1 h-4 w-4"
                  />
                </label>
              ))}
            </div>
            <Button
              onClick={saveNotifications}
              disabled={savingNotifications}
              className="w-full sm:w-auto"
            >
              {savingNotifications ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Save notifications
            </Button>
          </CardContent>
        </Card>
      </section>

      <aside className="grid content-start gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
                <CardTitle>Security</CardTitle>
              </div>
              <Badge
                className={
                  security.twoFactorEnabled ? "bg-secondary/10 text-secondary" : "bg-muted"
                }
              >
                {securityBadge}
              </Badge>
            </div>
            <CardDescription>{security.activeSessions} active session(s)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!security.twoFactorEnabled ? (
              <Button
                onClick={startTwoFactorSetup}
                disabled={updatingSecurity}
                className="w-full sm:w-auto"
              >
                {updatingSecurity ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                )}
                Set up 2FA
              </Button>
            ) : (
              <div className="grid gap-3 rounded-md border p-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
                  Enabled{" "}
                  {security.twoFactorConfirmedAt
                    ? new Date(security.twoFactorConfirmedAt).toLocaleDateString()
                    : ""}
                </div>
                <Label htmlFor="disableCode">Disable with authenticator code</Label>
                <Input
                  id="disableCode"
                  value={disableCode}
                  onChange={(event) => setDisableCode(event.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  placeholder="000000"
                />
                <Button
                  variant="destructive"
                  onClick={disableTwoFactor}
                  disabled={updatingSecurity || disableCode.length !== 6}
                  className="w-full sm:w-auto"
                >
                  Disable 2FA
                </Button>
              </div>
            )}

            {twoFactorSetup ? (
              <div className="grid gap-3 rounded-md border bg-muted/30 p-4">
                <div className="grid gap-1">
                  <Label>Manual setup key</Label>
                  <code className="break-all rounded-md bg-background p-3 text-sm">
                    {twoFactorSetup.secret}
                  </code>
                </div>
                <div className="grid gap-1">
                  <Label>Authenticator URI</Label>
                  <code className="max-h-24 overflow-auto rounded-md bg-background p-3 text-xs">
                    {twoFactorSetup.otpauthUri}
                  </code>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="verifyCode">Verification code</Label>
                  <Input
                    id="verifyCode"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                  />
                </div>
                <Button
                  onClick={verifyTwoFactorSetup}
                  disabled={updatingSecurity || verifyCode.length !== 6}
                  className="w-full sm:w-auto"
                >
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  Verify and enable
                </Button>
              </div>
            ) : null}

            {recoveryCodes.length ? (
              <div className="grid gap-2 rounded-md border border-secondary/30 bg-secondary/5 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Recovery codes
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {recoveryCodes.map((code) => (
                    <code key={code} className="rounded bg-background p-2 text-xs">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 rounded-md border p-4">
              <div className="text-sm font-medium">Password</div>
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={10}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <Button
                variant="outline"
                onClick={changePassword}
                disabled={changingPassword || !currentPassword || newPassword.length < 10}
                className="w-full sm:w-auto"
              >
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                )}
                Change password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security activity</CardTitle>
            <CardDescription>Recent account events.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {security.recentSecurityEvents.length ? (
              security.recentSecurityEvents.map((event) => (
                <div key={event.id} className="rounded-md border p-3">
                  <div className="text-sm font-medium">{event.action.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}{" "}
                    {event.ipAddress ? `- ${event.ipAddress}` : ""}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No security events yet.</p>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
