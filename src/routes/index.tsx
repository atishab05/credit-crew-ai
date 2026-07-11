import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  ShieldCheck,
  Zap,
  BarChart3,
  FileText,
  Lock,
  ArrowRight,
  Menu,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CreditCrew AI — MSME Underwriting Workspace" },
      { name: "description", content: "Mobile-first multi-agent AI underwriting for credit-invisible MSMEs. Assess GST, UPI, Account Aggregator and EPFO data with explainable Financial Health Cards." },
      { property: "og:title", content: "CreditCrew AI — MSME Underwriting Workspace" },
      { property: "og:description", content: "Mobile-first multi-agent AI underwriting for credit-invisible MSMEs." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/HF78MCOFSaM3GbWRrP7R7CYwD5G2/social-images/social-1783549801341-CCAI_Simple_Social_Preview_Image.webp" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "CreditCrew AI — MSME Underwriting Workspace" },
      { name: "twitter:description", content: "Mobile-first multi-agent AI underwriting for credit-invisible MSMEs." },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/HF78MCOFSaM3GbWRrP7R7CYwD5G2/social-images/social-1783549801341-CCAI_Simple_Social_Preview_Image.webp" },
    ],
  }),
  component: LandingPage,
});

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Trust & Compliance", href: "/compliance" },
  { label: "Get started", href: "#get-started" },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3 md:max-w-5xl">
          <a href="#hero" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-accent text-accent-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-semibold">CreditCrew AI</span>
          </a>

          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[260px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menu</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  {navLinks.map((link) => (
                    <SheetClose asChild key={link.href}>
                      <a
                        href={link.href}
                        className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </SheetClose>
                  ))}
                  <SheetClose asChild>
                    <Button asChild className="mt-4 w-full">
                      <Link to="/auth">Sign in</Link>
                    </Button>
                  </SheetClose>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <section id="hero" className="bg-hero px-4 pt-12 pb-16 text-primary-foreground md:pt-20 md:pb-24">
          <div className="mx-auto max-w-md md:max-w-3xl">
            <Badge className="mb-4 border-transparent bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15">
              Hackathon MVP
            </Badge>
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
              AI underwriting for credit-invisible MSMEs
            </h1>
            <p className="mt-4 text-base text-primary-foreground/80 md:text-lg">
              GST · UPI · Account Aggregator · EPFO — analysed by specialist agents in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                <Link to="/auth">
                  Start assessing <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/auth">Create account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="px-4 py-12 md:py-16">
          <div className="mx-auto max-w-md md:max-w-5xl">
            <h2 className="text-center text-2xl font-semibold">Built for mobile underwriting</h2>
            <p className="mx-auto mt-2 max-w-md text-center text-sm text-muted-foreground">
              Run a full credit assessment from your phone, wherever you are.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title}>
                  <CardContent className="p-5">
                    <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-medium">{f.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-muted px-4 py-12 md:py-16">
          <div className="mx-auto max-w-md md:max-w-3xl">
            <h2 className="text-2xl font-semibold">How it works</h2>
            <div className="mt-6 space-y-4">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center gap-4 rounded-lg border bg-card p-4">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="get-started" className="px-4 py-12 text-center md:py-16">
          <div className="mx-auto max-w-md">
            <h2 className="text-2xl font-semibold">Ready to underwrite smarter?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sign in and run your first multi-agent assessment.</p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CreditCrew AI. Built for the hackathon.
      </footer>
    </div>
  );
}

const features = [
  { title: "Multi-agent analysis", desc: "Eight specialist agents review every data source.", icon: Zap },
  { title: "Financial Health Card", desc: "Clear scores, risk ratings and borrowing capacity.", icon: BarChart3 },
  { title: "Explainable decisions", desc: "Plain-language reasons for every recommendation.", icon: FileText },
  { title: "Bank-grade security", desc: "Secure auth and audit-ready decision logs.", icon: Lock },
];

const steps = [
  "Create an MSME application with GSTIN and PAN.",
  "Connect sandbox data sources with one tap.",
  "Run the multi-agent assessment and watch live progress.",
  "Review the Financial Health Card and record your decision.",
];
