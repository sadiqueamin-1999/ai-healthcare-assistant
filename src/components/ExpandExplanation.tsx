import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ExpandExplanationProps {
  reasoning: string | null;
  alternativeInterpretations?: string | null;
  clarifyingQuestions?: string | null;
}

const ExpandExplanation = ({
  reasoning,
  alternativeInterpretations,
  clarifyingQuestions,
}: ExpandExplanationProps) => {
  const [open, setOpen] = useState(false);

  if (!reasoning && !alternativeInterpretations && !clarifyingQuestions) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>Expand Explanation</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="space-y-4 px-4 pb-4 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          {reasoning && (
            <ExplanationSection title="Full Reasoning" content={reasoning} />
          )}
          {alternativeInterpretations && (
            <ExplanationSection title="Alternative Interpretations" content={alternativeInterpretations} />
          )}
          {clarifyingQuestions && (
            <ExplanationSection title="Suggested Clarifying Questions" content={clarifyingQuestions} />
          )}
        </div>
      )}
    </div>
  );
};

function ExplanationSection({ title, content }: { title: string; content: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {title}
      </p>
      <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">
        {content}
      </p>
    </div>
  );
}

export default ExpandExplanation;
