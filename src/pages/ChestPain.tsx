import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  HeartPulse,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
  MessageSquare,
  Stethoscope,
} from "lucide-react";

const PAIN_DESCRIPTIONS = [
  "Tightness",
  "Pressure",
  "Heaviness",
  "Sharp",
  "Stabbing",
  "Burning",
  "Indigestion-like",
  "Other",
];

const ONSET_OPTIONS = ["Sudden", "Gradual"];
const DURATION_OPTIONS = ["Seconds", "Minutes", "Hours", "Intermittent"];
const RADIATION_OPTIONS = ["None", "Arm", "Jaw", "Back", "Neck"];

const ASSOCIATED_SYMPTOMS = [
  "Breathlessness",
  "Sweating",
  "Nausea",
  "Vomiting",
  "Dizziness",
  "Palpitations",
  "Fever",
  "Cough",
];

interface AssessmentResult {
  id: string;
  ai_risk_level: string | null;
  ai_summary: string | null;
  ai_reasoning: string | null;
  ai_advice: string | null;
}

const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  High: {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
  Medium: {
    bg: "bg-warning/10",
    text: "text-warning",
    border: "border-warning/30",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  "Low — but with safety advice": {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: <HeartPulse className="h-4 w-4" />,
  },
};

const defaultStyle = { bg: "bg-muted", text: "text-foreground", border: "border-border", icon: <HeartPulse className="h-4 w-4" /> };

const ChestPain = () => {
  const [age, setAge] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [smokingHistory, setSmokingHistory] = useState("");
  const [medications, setMedications] = useState("");

  const [painDescription, setPainDescription] = useState("");
  const [onset, setOnset] = useState("");
  const [duration, setDuration] = useState("");
  const [triggers, setTriggers] = useState("");
  const [improvesWithRest, setImprovesWithRest] = useState("");
  const [radiation, setRadiation] = useState("");
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const toggleSymptom = (symptom: string) => {
    setAssociatedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const canSubmit = age && painDescription && onset && duration && improvesWithRest;

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setReasoningOpen(false);

    try {
      const { data, error } = await supabase.functions.invoke("assess-chest-pain", {
        body: {
          age,
          painDescription,
          onset,
          duration,
          triggers: triggers || "",
          improvesWithRest,
          radiation: radiation || "",
          associatedSymptoms: associatedSymptoms.join(", "),
          pastMedicalHistory: pastMedicalHistory || "",
          familyHistory: familyHistory || "",
          smokingHistory: smokingHistory || "",
          medications: medications || "",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success("Assessment complete.");
    } catch (err: any) {
      console.error("Chest pain assessment error:", err);
      toast.error(err.message || "Failed to assess. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const risk = result?.ai_risk_level ?? "";
  const style = riskConfig[risk] ?? defaultStyle;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <HeartPulse className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Chest Pain Assessment</h1>
              <p className="text-sm text-muted-foreground">Structured AI-assisted chest pain triage tool</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Patient Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Age *">
              <Input
                type="number"
                min={0}
                max={150}
                placeholder="e.g. 55"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                disabled={isLoading}
              />
            </FieldGroup>
            <FieldGroup label="Past Medical History">
              <Textarea
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={pastMedicalHistory}
                onChange={(e) => setPastMedicalHistory(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>
            <FieldGroup label="Family History">
              <Textarea
                placeholder="e.g. Father had MI at age 50"
                value={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>
            <FieldGroup label="Smoking History">
              <Textarea
                placeholder="e.g. 20 pack-years, quit 2 years ago"
                value={smokingHistory}
                onChange={(e) => setSmokingHistory(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>
            <FieldGroup label="Current Medications">
              <Textarea
                placeholder="e.g. Amlodipine 5mg, Metformin 500mg"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Chest Pain Details */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-primary" />
              Chest Pain Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Pain Description *">
              <Select value={painDescription} onValueChange={setPainDescription} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select type of pain" /></SelectTrigger>
                <SelectContent>
                  {PAIN_DESCRIPTIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Onset *">
                <Select value={onset} onValueChange={setOnset} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select onset" /></SelectTrigger>
                  <SelectContent>
                    {ONSET_OPTIONS.map((o) => (
                      <SelectItem key={o} value={o}>{o}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
              <FieldGroup label="Duration *">
                <Select value={duration} onValueChange={setDuration} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select duration" /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
            </div>

            <FieldGroup label="Triggers">
              <Textarea
                placeholder="e.g. Walking upstairs, eating heavy meals"
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>

            <FieldGroup label="Improves with Rest *">
              <Select value={improvesWithRest} onValueChange={setImprovesWithRest} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Unsure">Unsure</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Radiation">
              <Select value={radiation} onValueChange={setRadiation} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select radiation" /></SelectTrigger>
                <SelectContent>
                  {RADIATION_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Associated Symptoms">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ASSOCIATED_SYMPTOMS.map((symptom) => (
                  <label
                    key={symptom}
                    className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                  >
                    <Checkbox
                      checked={associatedSymptoms.includes(symptom)}
                      onCheckedChange={() => toggleSymptom(symptom)}
                      disabled={isLoading}
                    />
                    {symptom}
                  </label>
                ))}
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSubmit} disabled={isLoading || !canSubmit}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Assessing…
              </>
            ) : (
              <>
                <HeartPulse className="h-4 w-4" />
                Assess Chest Pain
              </>
            )}
          </Button>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Risk Badge */}
            <Card className={`shadow-sm ${style.border} ${style.bg}`}>
              <CardContent className="pt-6 pb-5 flex items-start gap-3">
                <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
                <div className="space-y-1">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text} ring-1 ring-inset ${style.border}`}>
                    {risk}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            {result.ai_summary && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{result.ai_summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Advice */}
            {result.ai_advice && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="h-4 w-4 text-primary" />
                    Advice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{result.ai_advice}</p>
                </CardContent>
              </Card>
            )}

            {/* Reasoning (collapsible) */}
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
                    <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{result.ai_reasoning}</p>
                  </CardContent>
                )}
              </Card>
            )}

            <p className="text-center text-xs text-muted-foreground pt-2 pb-4">
              This is a prototype tool. Outputs are AI‑generated and not medical advice.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default ChestPain;
