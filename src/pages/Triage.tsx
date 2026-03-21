import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpandExplanation from "@/components/ExpandExplanation";
import { toast } from "sonner";
import { ShieldAlert, Brain, MessageSquare, Reply, Loader2 } from "lucide-react";

interface TriageResult {
  id: string;
  message_text: string;
  submitted_at: string;
  ai_summary: string | null;
  ai_risk_level: string | null;
  ai_draft_reply: string | null;
  ai_reasoning: string | null;
}

const riskStyles: Record<string, { bg: string; text: string; border: string }> = {
  High: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30" },
  Medium: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/30" },
  Low: { bg: "bg-success/10", text: "text-success", border: "border-success/30" },
};

const Triage = () => {
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);

  const handleSubmit = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      toast.error("Please paste a patient message first.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("triage-message", {
        body: { messageText: trimmed },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Message analysed successfully.");
    } catch (err: any) {
      console.error("Triage error:", err);
      toast.error(err.message || "Failed to analyse message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const risk = result?.ai_risk_level ?? "";
  const style = riskStyles[risk] ?? { bg: "bg-muted", text: "text-foreground", border: "border-border" };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <ShieldAlert className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Message Triage</h1>
              <p className="text-sm text-muted-foreground">Paste a patient message to analyse risk and draft a reply</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <label htmlFor="message-input" className="text-sm font-medium text-foreground">
              Paste patient message
            </label>
            <Textarea
              id="message-input"
              placeholder="e.g. I've been having really bad chest pains since this morning and I feel dizzy..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="min-h-[160px] resize-y text-sm leading-relaxed"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {messageText.length.toLocaleString()} / 5,000 characters
              </span>
              <Button onClick={handleSubmit} disabled={isLoading || !messageText.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysing…
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4" />
                    Analyse Message
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Risk Level Badge */}
            <Card className={`${style.border} ${style.bg}`}>
              <CardContent className="pt-6 flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text} ring-1 ring-inset ${style.border}`}>
                  {risk} Risk
                </span>
                <span className="text-sm text-foreground">{result.ai_summary}</span>
              </CardContent>
            </Card>

            <ResultCard
              icon={<MessageSquare className="h-4 w-4" />}
              title="Summary"
              content={result.ai_summary}
            />
            <ResultCard
              icon={<Reply className="h-4 w-4" />}
              title="Draft Reply"
              content={result.ai_draft_reply}
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
}: {
  icon: React.ReactNode;
  title: string;
  content: string | null;
  muted?: boolean;
}) {
  if (!content) return null;

  return (
    <Card className={muted ? "border-border/60 bg-muted/30" : ""}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-primary">{icon}</span>
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

export default Triage;
