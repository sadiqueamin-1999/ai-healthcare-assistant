import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ShieldAlert,
  FileText,
  BookOpen,
  HeartPulse,
  Heart,
  Users,
  Zap,
} from "lucide-react";

const featureCards = [
  {
    title: "AI Clinical Message Triage",
    description:
      "Summaries, risk flags, and draft replies for patient portal messages.",
    icon: ShieldAlert,
    to: "/triage",
    delay: "animate-fade-in-delay-1",
  },
  {
    title: "Clinical Note Summariser",
    description:
      "Extract key points, diagnoses, medications, and build a clear timeline.",
    icon: FileText,
    to: "/notes",
    delay: "animate-fade-in-delay-2",
  },
  {
    title: "Letter & Results Explainer",
    description:
      "Convert NHS letters and test results into clear, plain-English patient explanations.",
    icon: BookOpen,
    to: "/explain",
    delay: "animate-fade-in-delay-3",
  },
  {
    title: "Chest Pain Assessment",
    description:
      "A structured, safe triage tool for evaluating chest pain using NHS-aligned safety rules.",
    icon: HeartPulse,
    to: "/chestpain",
    delay: "animate-fade-in-delay-3",
  },
];

const pillars = [
  {
    icon: Heart,
    title: "Reduce Clinician Burden",
    description:
      "Automate repetitive documentation tasks so clinicians can focus on patient care.",
  },
  {
    icon: Users,
    title: "Improve Patient Understanding",
    description:
      "Transform complex medical language into clear, accessible explanations.",
  },
  {
    icon: Zap,
    title: "Faster, Safer Triage",
    description:
      "Surface high-risk messages instantly with AI-powered priority flagging.",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient background */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, hsl(211 100% 36% / 0.08) 0%, hsl(211 60% 96% / 0.5) 50%, hsl(var(--background)) 100%)",
          }}
        />
        {/* Decorative circles */}
        <div
          className="absolute -top-24 -right-24 h-96 w-96 rounded-full opacity-[0.04] -z-10"
          style={{ background: "hsl(211 100% 36%)" }}
        />
        <div
          className="absolute top-40 -left-32 h-64 w-64 rounded-full opacity-[0.03] -z-10"
          style={{ background: "hsl(211 100% 36%)" }}
        />

        <div className="mx-auto max-w-4xl px-4 pt-20 pb-24 text-center">
          <div className="animate-fade-in opacity-0">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <Heart className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              AI Healthcare Assistant
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Four powerful AI tools to support clinicians and improve patient
              communication.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-fade-in-delay-1 opacity-0">
            <Button variant="hero" size="lg" asChild>
              <Link to="/triage">
                <ShieldAlert className="h-5 w-5" />
                Analyse Patient Messages
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/notes">
                <FileText className="h-5 w-5" />
                Summarise Clinical Notes
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="/explain">
                <BookOpen className="h-5 w-5" />
                Explain Letters &amp; Results
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <Link key={card.to} to={card.to} className="group">
              <Card
                className={`h-full border-border/60 bg-card shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/8 group-hover:-translate-y-1 group-hover:border-primary/20 opacity-0 ${card.delay}`}
              >
                <CardContent className="p-8">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <card.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
            Built for NHS Hack Day 2026
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Designed to reduce clinical workload, improve documentation, and
            strengthen patient communication.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {pillars.map((pillar) => (
              <div key={pillar.title} className="text-center">
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <pillar.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            This is a prototype system. Outputs are for demonstration only and
            not medical advice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
