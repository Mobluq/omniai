import { KeyRound, MemoryStick, Route, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const settingsSections = [
  { title: "Provider keys", description: "Workspace and personal API keys are stored server-side only.", icon: KeyRound },
  { title: "Routing preferences", description: "Set defaults for manual, suggest, and auto routing.", icon: Route },
  { title: "Memory controls", description: "Prepare retention and knowledge-base behavior per workspace.", icon: MemoryStick },
  { title: "Security posture", description: "Tenant isolation, audit logs, and rate limits are enabled in the architecture.", icon: ShieldCheck },
];

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure provider access, routing defaults, memory, billing, and workspace controls.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Workspace preferences</CardTitle>
            <CardDescription>These fields are wired for the settings service and authorization layer.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="defaultModel">Default model</Label>
              <Select id="defaultModel" defaultValue="openai-chat-primary">
                <option value="openai-chat-primary">OpenAI Chat Primary</option>
                <option value="claude-primary">Claude Primary</option>
                <option value="gemini-primary">Gemini Primary</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="routingMode">Routing mode</Label>
              <Select id="routingMode" defaultValue="suggest">
                <option value="manual">Manual</option>
                <option value="suggest">Suggest</option>
                <option value="auto">Auto</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="retention">Data retention days</Label>
              <Input id="retention" type="number" defaultValue={365} min={1} max={3650} />
            </div>
            <Button className="w-fit">Save settings</Button>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {settingsSections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <section.icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <Badge>Foundation</Badge>
                </div>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
