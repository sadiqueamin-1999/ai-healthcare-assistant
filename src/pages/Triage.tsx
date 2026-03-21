import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, Brain, MessageSquare, Reply, Loader2, HelpCircle, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface TriageResult {
  id: string;
  message_text: string;
  submitted_at: string;
  ai_summary: string | null;
  ai_risk_level: string | null;
  ai_draft_reply: string | null;
  ai_reasoning: string | null;
  ai_clarifying_questions: string | null;
}

const RISK_HIGH = "High Risk";
const RISK_UNCERTAIN = "Uncertain – Needs Clarification";
const RISK_LOW = "Low Risk — based on available information";

const riskConfig: Record<string, { bg: string; text: string; border: string; accent: string; icon: React.ReactNode }> = {
  [RISK_HIGH]: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    accent: "border-destructive/40",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  [RISK_UNCERTAIN]: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    accent: "border-warning/40",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  [RISK_LOW]: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    accent: "border-success/20",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
};

const defaultRiskConfig = { bg: "bg-muted", text: "text-foreground", border: "border-border", accent: "border-border", icon: <ShieldAlert className="h-4 w-4" /> };

const Triage = () => {
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const handleSubmit = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) {
      toast.error("Please paste a patient message first.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setReasoningOpen(false);

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
  const style = riskConfig[risk] ?? defaultRiskConfig;
  const isHigh = risk === RISK_HIGH;
  const isUncertain = risk === RISK_UNCERTAIN;

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
        {/* Input */}
        <Card className="shadow-sm">
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

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* A) Risk Level Badge */}
            <Card className={`shadow-sm ${style.border} ${style.bg}`}>
              <CardContent className="pt-6 pb-5 flex items-start gap-3">
                <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
                <div className="space-y-1">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text} ring-1 ring-inset ${style.border}`}>
                    {risk}
                  </span>
                  {result.ai_summary && (
                    <p className="text-sm text-foreground leading-relaxed">{result.ai_summary}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* B) Summary Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                  {result.ai_summary}
                </p>
              </CardContent>
            </Card>

            {/* C) Draft Reply Card */}
            {result.ai_draft_reply && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Reply className="h-4 w-4 text-primary" />
                    Suggested Reply
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                    {result.ai_draft_reply}
                  </p>
                  {(isHigh || isUncertain) && (
                    <div className={`rounded-md border px-3 py-2 text-xs ${style.border} ${style.bg} ${style.text}`}>
                      <strong>Safety note:</strong> This reply includes safety-netting guidance. Always ensure the patient knows how to escalate if their condition worsens.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* D) Clarifying Questions Card */}
            {result.ai_clarifying_questions && (
              <Card className={`shadow-sm ${(isHigh || isUncertain) ? `border ${style.accent}` : ""}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <HelpCircle className={`h-4 w-4 ${(isHigh || isUncertain) ? style.text : "text-primary"}`} />
                    Recommended Clarifying Questions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`text-sm leading-relaxed whitespace-pre-line ${risk === RISK_LOW ? "text-muted-foreground" : "text-foreground"}`}>
                    {result.ai_clarifying_questions}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* E) Full Reasoning (Expandable) */}
            {result.ai_reasoning && (
              <Card className="shadow-sm">
                <button
                  onClick={() => setReasoningOpen(!reasoningOpen)}
                  className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    Clinical Reasoning
                  </span>
                  {reasoningOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {reasoningOpen && (
                  <CardContent className="pt-0 pb-5 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
                      {result.ai_reasoning}
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Safety disclaimer */}
            <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
              This is a prototype tool. Outputs are AI‑generated and not medical advice.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Triage;
