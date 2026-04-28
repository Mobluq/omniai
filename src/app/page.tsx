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
    <main className="min-h-[100dvh] bg-background">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground text-background">
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
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-border/70 px-4 pb-12 pt-28 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-[44%] top-24 hidden h-[440px] w-[620px] rounded-lg border border-border/70 bg-card/75 p-4 shadow-panel rotate-[-2deg] lg:block">
            <div className="grid h-full grid-cols-[190px_1fr] overflow-hidden rounded-md border border-border/70 bg-background">
              <div className="border-r border-border/70 bg-muted/35 p-4">
                <div className="h-8 w-24 rounded-md bg-foreground" />
                <div className="mt-7 grid gap-2">
                  {["Dashboard", "Chat", "Routing", "Usage", "Settings"].map((item, index) => (
                    <div
                      key={item}
                      className={`h-8 rounded-md ${index === 1 ? "bg-foreground" : "bg-card"}`}
                    />
                  ))}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-3 w-28 rounded-full bg-primary/70" />
                    <div className="mt-3 h-7 w-56 rounded-md bg-foreground" />
                  </div>
                  <div className="h-9 w-24 rounded-md bg-primary" />
                </div>
                <div className="mt-7 grid gap-3">
                  <div className="rounded-md border border-border/70 bg-card p-4">
                    <div className="h-3 w-3/4 rounded-full bg-muted" />
                    <div className="mt-3 h-3 w-1/2 rounded-full bg-muted" />
                  </div>
                  <div className="rounded-md border border-accent/40 bg-accent/10 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                      <div className="h-3 w-64 rounded-full bg-accent/60" />
                    </div>
                    <div className="mt-3 h-3 w-80 rounded-full bg-accent/30" />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[Route, Database, Lock].map((Icon, index) => (
                      <div key={index} className="rounded-md border border-border/70 bg-card p-4">
                        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                        <div className="mt-6 h-3 rounded-full bg-muted" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto flex min-h-[calc(100dvh-11rem)] max-w-7xl flex-col justify-center">
          <Badge className="w-fit border-primary/30 bg-primary/10 text-primary">Multi-model AI orchestration</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-none tracking-tight text-foreground md:text-7xl">
            OmniAI
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            One secure workspace for ChatGPT, Claude, Gemini, Mistral, Stability, Amazon Bedrock, routing recommendations, memory, usage, and team controls.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="default">
              <Link href="/auth/sign-up">
                Get Started
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="bg-card/85">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-12 md:grid-cols-[1fr_1.3fr_1fr] lg:px-8">
          {features.map((feature) => (
            <article key={feature.title} className="rounded-lg border border-border/80 bg-background/80 p-5 shadow-line">
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
