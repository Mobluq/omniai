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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { modelRegistry } from "@/modules/ai/registry/model-registry";

type ApiEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

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

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function AccountSettings() {
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
      const [profileResponse, notificationsResponse, securityResponse] = await Promise.all([
        fetch("/api/account/profile"),
        fetch("/api/account/notifications"),
        fetch("/api/account/security"),
      ]);
      const [profileEnvelope, notificationsEnvelope, securityEnvelope] = await Promise.all([
        parseEnvelope<{ profile: Profile }>(profileResponse),
        parseEnvelope<{ preferences: NotificationPreferences }>(notificationsResponse),
        parseEnvelope<{ security: SecurityOverview }>(securityResponse),
      ]);

      if (!profileEnvelope.success || !notificationsEnvelope.success || !securityEnvelope.success) {
        throw new Error("Account data could not be loaded.");
      }

      if (!cancelled) {
        setProfile(profileEnvelope.data.profile);
        setNotifications(notificationsEnvelope.data.preferences);
        setSecurity(securityEnvelope.data.security);
        setStatus("ready");
      }
    }

    load().catch(() => {
      if (!cancelled) {
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadSecurity() {
    const response = await fetch("/api/account/security");
    const envelope = await parseEnvelope<{ security: SecurityOverview }>(response);

    if (envelope.success) {
      setSecurity(envelope.data.security);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setSavingProfile(true);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/account/profile", {
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
    });
    const envelope = await parseEnvelope<{ profile: Profile }>(response);

    if (envelope.success) {
      setProfile(envelope.data.profile);
      setNotice("Profile saved.");
    } else {
      setNotice(envelope.error.message);
    }

    setSavingProfile(false);
  }

  async function saveNotifications() {
    if (!notifications) {
      return;
    }

    setSavingNotifications(true);
    setNotice(null);
    const response = await fetch("/api/account/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(notifications),
    });
    const envelope = await parseEnvelope<{ preferences: NotificationPreferences }>(response);

    if (envelope.success) {
      setNotifications(envelope.data.preferences);
      setNotice("Notification preferences saved.");
    } else {
      setNotice(envelope.error.message);
    }

    setSavingNotifications(false);
  }

  async function startTwoFactorSetup() {
    setUpdatingSecurity(true);
    setNotice(null);
    const response = await fetch("/api/account/security/2fa/setup", { method: "POST" });
    const envelope = await parseEnvelope<{ setup: TwoFactorSetup }>(response);

    if (envelope.success) {
      setTwoFactorSetup(envelope.data.setup);
      setNotice("Authenticator setup started.");
    } else {
      setNotice(envelope.error.message);
    }

    setUpdatingSecurity(false);
  }

  async function verifyTwoFactorSetup() {
    setUpdatingSecurity(true);
    setNotice(null);
    const response = await fetch("/api/account/security/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: verifyCode }),
    });
    const envelope = await parseEnvelope<{ recoveryCodes: string[] }>(response);

    if (envelope.success) {
      setRecoveryCodes(envelope.data.recoveryCodes);
      setTwoFactorSetup(null);
      setVerifyCode("");
      await reloadSecurity();
      setNotice("Two-factor authentication is enabled.");
    } else {
      setNotice(envelope.error.message);
    }

    setUpdatingSecurity(false);
  }

  async function disableTwoFactor() {
    setUpdatingSecurity(true);
    setNotice(null);
    const response = await fetch("/api/account/security/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: disableCode }),
    });
    const envelope = await parseEnvelope<{ disabled: boolean }>(response);

    if (envelope.success) {
      setDisableCode("");
      setRecoveryCodes([]);
      await reloadSecurity();
      setNotice("Two-factor authentication is disabled.");
    } else {
      setNotice(envelope.error.message);
    }

    setUpdatingSecurity(false);
  }

  async function changePassword() {
    setChangingPassword(true);
    setNotice(null);
    const response = await fetch("/api/account/security/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const envelope = await parseEnvelope<{ changed: boolean }>(response);

    if (envelope.success) {
      setCurrentPassword("");
      setNewPassword("");
      await reloadSecurity();
      setNotice("Password changed.");
    } else {
      setNotice(envelope.error.message);
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
                  <Input id="companyName" name="companyName" defaultValue={profile.companyName ?? ""} />
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

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={savingProfile}>
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
            <CardDescription>Email preferences for account, usage, billing, and providers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              {notificationLabels.map((item) => (
                <label key={item.key} className="flex min-h-24 items-start justify-between gap-4 rounded-md border p-4">
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
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
            <Button onClick={saveNotifications} disabled={savingNotifications}>
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
              <Badge className={security.twoFactorEnabled ? "bg-secondary/10 text-secondary" : "bg-muted"}>
                {securityBadge}
              </Badge>
            </div>
            <CardDescription>{security.activeSessions} active session(s)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {!security.twoFactorEnabled ? (
              <Button onClick={startTwoFactorSetup} disabled={updatingSecurity}>
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
                <Button variant="destructive" onClick={disableTwoFactor} disabled={updatingSecurity || disableCode.length !== 6}>
                  Disable 2FA
                </Button>
              </div>
            )}

            {twoFactorSetup ? (
              <div className="grid gap-3 rounded-md border bg-muted/30 p-4">
                <div className="grid gap-1">
                  <Label>Manual setup key</Label>
                  <code className="break-all rounded-md bg-background p-3 text-sm">{twoFactorSetup.secret}</code>
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
                <Button onClick={verifyTwoFactorSetup} disabled={updatingSecurity || verifyCode.length !== 6}>
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
                    {new Date(event.createdAt).toLocaleString()} {event.ipAddress ? `- ${event.ipAddress}` : ""}
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
