import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpandExplanation from "@/components/ExpandExplanation";
import { toast } from "sonner";
import { Mail, Brain, Footprints, AlertTriangle, BookOpen, Loader2 } from "lucide-react";

interface LetterResult {
  id: string;
  letter_text: string;
  submitted_at: string;
  ai_plain_english: string | null;
  ai_next_steps: string | null;
  ai_important_warnings: string | null;
  ai_reasoning: string | null;
}

const Explain = () => {
  const [letterText, setLetterText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LetterResult | null>(null);

  const handleSubmit = async () => {
    const trimmed = letterText.trim();
    if (!trimmed) {
      toast.error("Please paste a patient letter or result first.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("simplify-letter", {
        body: { letterText: trimmed },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Letter explained successfully.");
    } catch (err: any) {
      console.error("Explain error:", err);
      toast.error(err.message || "Failed to explain letter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Letter Explainer</h1>
              <p className="text-sm text-muted-foreground">Paste a patient letter or result to get a plain English explanation</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <label htmlFor="letter-input" className="text-sm font-medium text-foreground">
              Paste patient letter or result
            </label>
            <Textarea
              id="letter-input"
              placeholder="e.g. Dear Patient, Following your recent consultation with Dr. Patel in the Cardiology Outpatient Department..."
              value={letterText}
              onChange={(e) => setLetterText(e.target.value)}
              className="min-h-[160px] resize-y text-sm leading-relaxed"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {letterText.length.toLocaleString()} / 10,000 characters
              </span>
              <Button onClick={handleSubmit} disabled={isLoading || !letterText.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Explaining…
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    Explain in Plain English
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <ResultCard
              icon={<BookOpen className="h-4 w-4" />}
              title="Plain English Version"
              content={result.ai_plain_english}
            />
            <ResultCard
              icon={<Footprints className="h-4 w-4" />}
              title="Next Steps"
              content={result.ai_next_steps}
            />
            <ResultCard
              icon={<AlertTriangle className="h-4 w-4" />}
              title="Important Warnings"
              content={result.ai_important_warnings}
              variant="warning"
            />
            <ExpandExplanation
              reasoning={result.ai_reasoning}
              alternativeInterpretations={result.ai_alternative_interpretations}
              clarifyingQuestions={result.ai_clarifying_questions}
            />
          </div>
        )}
      </main>
    </div>
  );
};

function ResultCard({
  icon,
  title,
  content,
  muted = false,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  content: string | null;
  muted?: boolean;
  variant?: "warning";
}) {
  if (!content) return null;

  const isWarning = variant === "warning";

  return (
    <Card className={
      isWarning
        ? "border-warning/30 bg-warning/5"
        : muted
          ? "border-border/60 bg-muted/30"
          : ""
    }>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className={isWarning ? "text-warning" : "text-primary"}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-sm leading-relaxed whitespace-pre-line ${muted ? "text-muted-foreground" : "text-foreground"}`}>
          {content}
        </p>
      </CardContent>
    </Card>
  );
}

export default Explain;
