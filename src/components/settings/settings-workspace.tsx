"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Loader2, PlugZap, Save, ShieldCheck } from "lucide-react";
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

type Workspace = {
  id: string;
  name: string;
  defaultRoutingMode: "manual" | "suggest" | "auto";
  defaultModelId: string | null;
  memoryEnabled: boolean;
  retentionDays: number;
};

type ProviderConnection = {
  provider: string;
  displayName: string;
  keyLabel: string;
  envKeys: string[];
  envConfigured: boolean;
  workspaceConfigured: boolean;
  isEnabled: boolean;
  status: "available" | "disabled" | "degraded" | "beta";
  models: Array<{
    modelId: string;
    displayName: string;
    description: string;
    capabilities: string[];
  }>;
};

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  return response.json() as Promise<ApiEnvelope<T>>;
}

export function SettingsWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [providers, setProviders] = useState<ProviderConnection[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [defaultRoutingMode, setDefaultRoutingMode] = useState<Workspace["defaultRoutingMode"]>("suggest");
  const [defaultModelId, setDefaultModelId] = useState("openai-chat-primary");
  const [retentionDays, setRetentionDays] = useState(365);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [savingProvider, setSavingProvider] = useState<string | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [notice, setNotice] = useState<string | null>(null);

  const providerSummary = useMemo(() => {
    const connected = providers.filter((provider) => provider.envConfigured || provider.workspaceConfigured).length;
    return `${connected}/${providers.length || 6} connected`;
  }, [providers]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      const workspaceResponse = await fetch("/api/workspaces");
      const workspaceEnvelope = await parseEnvelope<{ workspaces: Workspace[] }>(workspaceResponse);

      if (!workspaceEnvelope.success || !workspaceEnvelope.data.workspaces[0]) {
        throw new Error("No workspace found.");
      }

      const activeWorkspace = workspaceEnvelope.data.workspaces[0];
      const providersResponse = await fetch(`/api/providers?workspaceId=${activeWorkspace.id}`);
      const providersEnvelope = await parseEnvelope<{ providers: ProviderConnection[] }>(providersResponse);

      if (!providersEnvelope.success) {
        throw new Error(providersEnvelope.error.message);
      }

      if (!cancelled) {
        setWorkspace(activeWorkspace);
        setDefaultRoutingMode(activeWorkspace.defaultRoutingMode);
        setDefaultModelId(activeWorkspace.defaultModelId ?? "openai-chat-primary");
        setRetentionDays(activeWorkspace.retentionDays);
        setMemoryEnabled(activeWorkspace.memoryEnabled);
        setProviders(providersEnvelope.data.providers);
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

  async function saveProvider(provider: ProviderConnection, isEnabled = true) {
    if (!workspace) {
      return;
    }

    setSavingProvider(provider.provider);
    setNotice(null);
    const response = await fetch("/api/providers", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        provider: provider.provider,
        apiKey: apiKeys[provider.provider],
        isEnabled,
      }),
    });
    const envelope = await parseEnvelope<{ providers: ProviderConnection[] }>(response);

    if (envelope.success) {
      setProviders(envelope.data.providers);
      setApiKeys((current) => ({ ...current, [provider.provider]: "" }));
      setNotice(`${provider.displayName} settings saved.`);
    } else {
      setNotice(envelope.error.message);
    }

    setSavingProvider(null);
  }

  async function saveSettings() {
    if (!workspace) {
      return;
    }

    setSavingSettings(true);
    setNotice(null);
    const response = await fetch(`/api/workspaces/${workspace.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defaultRoutingMode,
        defaultModelId,
        memoryEnabled,
        dataRetentionDays: retentionDays,
      }),
    });
    const envelope = await parseEnvelope<{ workspace: Workspace }>(response);

    if (envelope.success) {
      setWorkspace(envelope.data.workspace);
      setNotice("Workspace settings saved.");
    } else {
      setNotice(envelope.error.message);
    }

    setSavingSettings(false);
  }

  async function testProvider(provider: ProviderConnection) {
    if (!workspace) {
      return;
    }

    setTestingProvider(provider.provider);
    setNotice(null);
    const response = await fetch("/api/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        provider: provider.provider,
      }),
    });
    const envelope = await parseEnvelope<{
      configured: boolean;
      message: string;
    }>(response);

    setNotice(envelope.success ? envelope.data.message : envelope.error.message);
    setTestingProvider(null);
  }

  if (status === "loading") {
    return (
      <div className="grid min-h-72 place-items-center rounded-lg border border-dashed">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error" || !workspace) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        Settings could not be loaded. Sign in with an owner or admin account and try again.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <section className="grid gap-6">
        <div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">AI provider connections</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Add workspace keys for ChatGPT, Claude, Gemini, Mistral, Stability, and Amazon Bedrock.
              </p>
            </div>
            <Badge className="bg-muted">{providerSummary}</Badge>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {providers.map((provider) => {
              const connected = provider.envConfigured || provider.workspaceConfigured;
              return (
                <Card key={provider.provider} className="shadow-none">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                          <PlugZap className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div>
                          <CardTitle className="text-base">{provider.displayName}</CardTitle>
                          <CardDescription>
                            {connected ? "Ready for routing" : "Needs a server or workspace key"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={
                          connected && provider.isEnabled
                            ? "border-secondary/30 bg-secondary/10 text-secondary"
                            : undefined
                        }
                      >
                        {connected && provider.isEnabled ? "Connected" : "Not connected"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor={`${provider.provider}-key`}>{provider.keyLabel}</Label>
                      <Input
                        id={`${provider.provider}-key`}
                        type="password"
                        autoComplete="off"
                        placeholder={provider.workspaceConfigured ? "Saved key is active" : provider.envKeys.join(", ")}
                        value={apiKeys[provider.provider] ?? ""}
                        onChange={(event) =>
                          setApiKeys((current) => ({
                            ...current,
                            [provider.provider]: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {provider.models.map((model) => (
                        <Badge key={model.modelId} className="bg-muted">
                          {model.displayName}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveProvider(provider, true)}
                        disabled={savingProvider === provider.provider}
                      >
                        {savingProvider === provider.provider ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <KeyRound className="h-4 w-4" aria-hidden="true" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => saveProvider(provider, false)}
                        disabled={savingProvider === provider.provider}
                      >
                        Disable
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => testProvider(provider)}
                        disabled={testingProvider === provider.provider}
                      >
                        {testingProvider === provider.provider ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : null}
                        Test
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Workspace defaults</CardTitle>
            <CardDescription>{workspace.name}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="defaultModel">Default model</Label>
              <Select
                id="defaultModel"
                value={defaultModelId}
                onChange={(event) => setDefaultModelId(event.target.value)}
              >
                {modelRegistry.map((model) => (
                  <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>
                    {model.displayName}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="routingMode">Routing mode</Label>
              <Select
                id="routingMode"
                value={defaultRoutingMode}
                onChange={(event) =>
                  setDefaultRoutingMode(event.target.value as Workspace["defaultRoutingMode"])
                }
              >
                <option value="manual">Manual</option>
                <option value="suggest">Suggest</option>
                <option value="auto">Auto</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retention">Data retention days</Label>
              <Input
                id="retention"
                type="number"
                min={1}
                max={3650}
                value={retentionDays}
                onChange={(event) => setRetentionDays(Number(event.target.value))}
              />
            </div>
            <label className="flex items-center justify-between rounded-md border p-3 text-sm">
              <span>Memory enabled</span>
              <input
                type="checkbox"
                checked={memoryEnabled}
                onChange={(event) => setMemoryEnabled(event.target.checked)}
                className="h-4 w-4"
              />
            </label>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Save defaults
            </Button>
            {notice ? <p className="text-sm text-muted-foreground">{notice}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden="true" />
              <CardTitle>Security status</CardTitle>
            </div>
            <CardDescription>Workspace keys are encrypted and never returned to the browser.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
              Server-side provider calls
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
              Workspace authorization checks
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
              Encrypted saved keys
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
