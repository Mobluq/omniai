import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, Database, Lock, Route, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const features = [
  { title: "Unified model access", text: "One workspace for OpenAI, Claude, Gemini, Mistral, Stability AI, and future providers." },
  { title: "Recommendation layer", text: "Task classification scores models before routing so users do not have to guess." },
  { title: "Tenant-safe memory", text: "Workspace-scoped knowledge architecture prepared for vector search and context injection." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </span>
          OmniAI
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Button asChild>
            <Link href="/auth/sign-up">
              Get Started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </nav>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 pt-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-24 lg:pt-16">
        <div className="flex flex-col justify-center">
          <Badge className="w-fit border-secondary/40 text-secondary">Multi-model AI orchestration</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-normal text-foreground md:text-6xl">
            OmniAI
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A secure SaaS foundation for teams that need one conversation layer across multiple AI providers, intelligent routing, workspace memory, billing, and usage governance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="default">
              <Link href="/auth/sign-up">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/chat">Open Chat</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-soft">
          <div className="rounded-md border bg-background">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <p className="text-sm font-semibold">Unified AI workspace</p>
                <p className="text-xs text-muted-foreground">Suggest mode active</p>
              </div>
              <Badge>OpenAI Chat Primary</Badge>
            </div>
            <div className="space-y-3 p-4">
              <div className="rounded-md border bg-card p-3 text-sm">
                Generate an image of a futuristic Lagos skyline for a fintech launch.
              </div>
              <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  OpenAI Image Primary may be better for this task.
                </div>
                <p className="mt-2 text-muted-foreground">
                  This request requires image generation, so an image-capable model is a better fit.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-md border p-3">
                  <Route className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">Routing</p>
                </div>
                <div className="rounded-md border p-3">
                  <Database className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">Memory</p>
                </div>
                <div className="rounded-md border p-3">
                  <Lock className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <p className="mt-2 text-sm font-medium">Security</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t bg-card">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border bg-background p-5">
              <CheckCircle2 className="h-5 w-5 text-secondary" aria-hidden="true" />
              <h2 className="mt-4 font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
