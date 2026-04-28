import { BrainCircuit, CheckCircle2, Gauge, Layers3, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecommendationEngine } from "@/modules/ai/recommendation/recommendation-engine";
import { modelRegistry } from "@/modules/ai/registry/model-registry";

const weights = [
  { label: "Capability match", value: "44%", detail: "Required task capability on the model." },
  { label: "Task quality", value: "22%", detail: "Reasoning, writing, coding, or image strength." },
  { label: "Context fit", value: "10%", detail: "Context-window fit for long prompts and documents." },
  { label: "Speed", value: "10%", detail: "Relative model latency rating." },
  { label: "Cost", value: "8%", detail: "Configured cost tier preference." },
  { label: "Preference", value: "6%", detail: "User or workspace preferred provider." },
];

const examples = [
  "Generate an image of a luxury fintech dashboard",
  "Debug this React component and explain the issue",
  "Summarize this long board document",
  "Write a corporate proposal email",
];

export default function RoutingPage() {
  const engine = new RecommendationEngine();
  const recommendations = examples.map((prompt) => ({
    prompt,
    result: engine.evaluate({ prompt }),
  }));

  return (
    <AppShell>
      <div className="page-shell mb-6">
        <p className="page-kicker">Recommendation engine</p>
        <h1 className="page-title mt-2">Routing intelligence</h1>
        <p className="page-copy">
          How OmniAI classifies tasks, scores models, and prepares context before provider calls.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <section className="grid gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>Scoring model</CardTitle>
              </div>
              <CardDescription>Current rule-based scorer with an LLM classifier-ready interface.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {weights.map((weight) => (
                <div key={weight.label} className="rounded-md border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{weight.label}</span>
                    <Badge className="bg-muted">{weight.value}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{weight.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-5 w-5 text-primary" aria-hidden="true" />
                <CardTitle>Task understanding</CardTitle>
              </div>
              <CardDescription>Detected intent, required capability, confidence, and selected model.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {recommendations.map(({ prompt, result }) => (
                <div key={prompt} className="rounded-md border p-4">
                  <div className="text-sm font-medium">{prompt}</div>
                  <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    <span>Intent: {result.detectedIntent.replaceAll("_", " ")}</span>
                    <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                    <span>Recommended: {result.recommendedModelDisplayName}</span>
                    <span>Capability: {result.requiredCapabilities.join(", ")}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {result.scores.slice(0, 3).map((score) => (
                      <div key={`${prompt}:${score.provider}:${score.modelId}`} className="rounded bg-muted/50 p-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span>{score.displayName}</span>
                          <span>{Math.round(score.score * 100)}%</span>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          capability {Math.round(score.breakdown.capabilityMatch * 100)}%, quality{" "}
                          {Math.round(score.breakdown.quality * 100)}%, context{" "}
                          {Math.round(score.breakdown.contextFit * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <aside className="grid content-start gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers3 className="h-5 w-5 text-secondary" aria-hidden="true" />
                <CardTitle>Context pipeline</CardTitle>
              </div>
              <CardDescription>What is assembled before a model receives the request.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {[
                "Project instructions",
                "Relevant knowledge chunks",
                "Conversation memory summaries",
                "Selected routing mode",
                "Workspace provider restrictions",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md border p-3">
                  <CheckCircle2 className="h-4 w-4 text-secondary" aria-hidden="true" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-secondary" aria-hidden="true" />
                <CardTitle>Model registry</CardTitle>
              </div>
              <CardDescription>Provider capability matrix used by routing.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {modelRegistry.map((model) => (
                <div key={`${model.provider}:${model.modelId}`} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{model.displayName}</div>
                      <div className="text-xs capitalize text-muted-foreground">{model.provider}</div>
                    </div>
                    <Badge className="bg-muted">{model.costTier}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {model.capabilities.slice(0, 4).map((capability) => (
                      <Badge key={capability} className="bg-muted text-[10px]">
                        {capability.replaceAll("_", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}
