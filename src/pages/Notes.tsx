import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExpandExplanation from "@/components/ExpandExplanation";
import { toast } from "sonner";
import { FileText, Brain, List, Clock, MessageSquare, Loader2 } from "lucide-react";

interface NoteResult {
  id: string;
  note_text: string;
  submitted_at: string;
  ai_summary: string | null;
  ai_key_points: string | null;
  ai_timeline: string | null;
  ai_reasoning: string | null;
  ai_alternative_interpretations: string | null;
  ai_clarifying_questions: string | null;
}

const Notes = () => {
  const [noteText, setNoteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<NoteResult | null>(null);

  const handleSubmit = async () => {
    const trimmed = noteText.trim();
    if (!trimmed) {
      toast.error("Please paste a clinical note first.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("summarise-note", {
        body: { noteText: trimmed },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Note summarised successfully.");
    } catch (err: any) {
      console.error("Summarise error:", err);
      toast.error(err.message || "Failed to summarise note. Please try again.");
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
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Clinical Note Summariser</h1>
              <p className="text-sm text-muted-foreground">Paste a clinical note to extract a structured summary</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Input Section */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <label htmlFor="note-input" className="text-sm font-medium text-foreground">
              Paste clinical note
            </label>
            <Textarea
              id="note-input"
              placeholder="e.g. 72F. Known T2DM, HTN, CKD stage 3. Admitted 05/03 with acute exacerbation of COPD..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="min-h-[160px] resize-y text-sm leading-relaxed"
              disabled={isLoading}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {noteText.length.toLocaleString()} / 10,000 characters
              </span>
              <Button onClick={handleSubmit} disabled={isLoading || !noteText.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Summarising…
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4" />
                    Summarise Note
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <ResultCard
              icon={<MessageSquare className="h-4 w-4" />}
              title="Summary"
              content={result.ai_summary}
            />
            <ResultCard
              icon={<List className="h-4 w-4" />}
              title="Key Points"
              content={result.ai_key_points}
            />
            <ResultCard
              icon={<Clock className="h-4 w-4" />}
              title="Timeline"
              content={result.ai_timeline}
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

export default Notes;
