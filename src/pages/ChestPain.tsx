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
  User,
  Activity,
  ListChecks,
} from "lucide-react";

// --- Option constants ---

const SEX_OPTIONS = ["Male", "Female", "Intersex", "Prefer not to say"];

const PAIN_TYPE_OPTIONS = [
  "Sudden severe pressure",
  "Tightness",
  "Heaviness",
  "Squeezing sensation",
  "Sharp/stabbing pain",
  "Burning/heartburn-like",
  "Indigestion-like",
  "Muscle or chest wall tenderness",
  "Pain only with movement or touch",
];

const RADIATION_OPTIONS = ["None", "Jaw", "Left arm", "Right arm", "Back", "Neck"];

const DURATION_OPTIONS = ["Seconds", "Minutes", "15 minutes or more", "Intermittent episodes"];

const ONSET_OPTIONS = ["Sudden", "Gradual"];

const TRIGGER_OPTIONS = [
  "Exercise or exertion",
  "Stress or anxiety",
  "Eating",
  "Deep breathing",
  "Lying down",
  "Coughing",
  "No clear trigger",
];

const ASSOCIATED_SYMPTOMS = [
  "None",
  "Shortness of breath",
  "Nausea",
  "Vomiting",
  "Dizziness",
  "Lightheadedness",
  "Cold sweat",
  "Palpitations",
  "Fever",
  "Cough",
  "Anxiety / panic-like symptoms",
  "Skin sensitivity or rash (rule out shingles)",
];

const CAUSE_CATEGORIES = [
  "Cardiac (e.g., heart attack, angina)",
  "Digestive (GERD, gallbladder)",
  "Lung-related (PE, pneumonia, pleurisy)",
  "Musculoskeletal (costochondritis, strain)",
  "Other (anxiety, shingles)",
];

const SMOKING_OPTIONS = ["No", "Yes", "Current smoker", "Ex-smoker"];

// --- Types ---

interface AssessmentResult {
  id: string;
  ai_risk_level: string | null;
  ai_summary: string | null;
  ai_reasoning: string | null;
  ai_advice: string | null;
  ai_score: number | null;
}

const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
  "Very High": {
    bg: "bg-destructive/10",
    text: "text-destructive",
    border: "border-destructive/30",
    icon: <ShieldAlert className="h-4 w-4" />,
  },
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
  Low: {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: <HeartPulse className="h-4 w-4" />,
  },
  "Very Low": {
    bg: "bg-success/10",
    text: "text-success",
    border: "border-success/30",
    icon: <HeartPulse className="h-4 w-4" />,
  },
};

const defaultStyle = {
  bg: "bg-muted",
  text: "text-foreground",
  border: "border-border",
  icon: <HeartPulse className="h-4 w-4" />,
};

// --- Helper for multi-select toggle ---
function toggleItem(arr: string[], item: string) {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

// --- Component ---

const ChestPain = () => {
  // 1. Patient Information
  const [sex, setSex] = useState("");
  const [age, setAge] = useState("");
  const [pastMedicalHistory, setPastMedicalHistory] = useState("");
  const [familyHistory, setFamilyHistory] = useState("");
  const [smokingHistory, setSmokingHistory] = useState("");
  const [medications, setMedications] = useState("");

  // 2. Chest Pain Characteristics
  const [painTypes, setPainTypes] = useState<string[]>([]);
  const [radiation, setRadiation] = useState<string[]>([]);
  const [duration, setDuration] = useState("");
  const [onset, setOnset] = useState("");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [improvesWithRest, setImprovesWithRest] = useState("");

  // 3. Associated Symptoms
  const [associatedSymptoms, setAssociatedSymptoms] = useState<string[]>([]);

  // 4. Potential Cause Categories
  const [causeCategories, setCauseCategories] = useState<string[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const canSubmit =
    sex &&
    age &&
    painTypes.length > 0 &&
    radiation.length > 0 &&
    duration &&
    onset &&
    triggers.length > 0 &&
    improvesWithRest &&
    associatedSymptoms.length > 0 &&
    familyHistory &&
    smokingHistory;

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
          painDescription: painTypes.join(", "),
          onset,
          duration,
          triggers: triggers.join(", "),
          improvesWithRest,
          radiation: radiation.join(", "),
          associatedSymptoms: associatedSymptoms.join(", "),
          pastMedicalHistory: pastMedicalHistory || "",
          familyHistory,
          smokingHistory,
          medications: medications || "",
          sex,
          causeCategories: causeCategories.join(", "),
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
        {/* 1. Patient Information */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4 text-primary" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Sex *">
                <Select value={sex} onValueChange={setSex} disabled={isLoading}>
                  <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                  <SelectContent>
                    {SEX_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldGroup>
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
            </div>

            <FieldGroup label="Past Medical History">
              <Textarea
                placeholder="e.g. Hypertension, Type 2 Diabetes"
                value={pastMedicalHistory}
                onChange={(e) => setPastMedicalHistory(e.target.value)}
                disabled={isLoading}
                className="min-h-[80px]"
              />
            </FieldGroup>

            <FieldGroup label="Family History of Heart Disease *">
              <Select value={familyHistory} onValueChange={setFamilyHistory} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            <FieldGroup label="Smoking History *">
              <Select value={smokingHistory} onValueChange={setSmokingHistory} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {SMOKING_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* 2. Chest Pain Characteristics */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="h-4 w-4 text-primary" />
              Chest Pain Characteristics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup label="Pain Type * (select all that apply)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PAIN_TYPE_OPTIONS.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox
                      checked={painTypes.includes(p)}
                      onCheckedChange={() => setPainTypes(toggleItem(painTypes, p))}
                      disabled={isLoading}
                    />
                    {p}
                  </label>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Radiation * (select all that apply)">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RADIATION_OPTIONS.map((r) => (
                  <label key={r} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox
                      checked={radiation.includes(r)}
                      onCheckedChange={() => setRadiation(toggleItem(radiation, r))}
                      disabled={isLoading}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </FieldGroup>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <FieldGroup label="Triggers * (select all that apply)">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRIGGER_OPTIONS.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox
                      checked={triggers.includes(t)}
                      onCheckedChange={() => setTriggers(toggleItem(triggers, t))}
                      disabled={isLoading}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Improves with Rest *">
              <Select value={improvesWithRest} onValueChange={setImprovesWithRest} disabled={isLoading}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>
          </CardContent>
        </Card>

        {/* 3. Associated Symptoms */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Associated Symptoms * (select all that apply)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ASSOCIATED_SYMPTOMS.map((symptom) => (
                <label key={symptom} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    checked={associatedSymptoms.includes(symptom)}
                    onCheckedChange={() => setAssociatedSymptoms(toggleItem(associatedSymptoms, symptom))}
                    disabled={isLoading}
                  />
                  {symptom}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 4. Potential Cause Categories */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-4 w-4 text-primary" />
              Potential Cause Categories (optional — patient self-selection)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CAUSE_CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <Checkbox
                    checked={causeCategories.includes(cat)}
                    onCheckedChange={() => setCauseCategories(toggleItem(causeCategories, cat))}
                    disabled={isLoading}
                  />
                  {cat}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 5. Submit */}
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

        {/* 6. Results */}
        {result && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            <Card className={`shadow-sm ${style.border} ${style.bg}`}>
              <CardContent className="pt-6 pb-5 flex items-start gap-4">
                <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${style.bg} ${style.text} ring-1 ring-inset ${style.border}`}>
                    {risk}
                  </span>
                  {result.ai_score != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold bg-muted text-foreground ring-1 ring-inset ring-border">
                      <Activity className="h-3.5 w-3.5" />
                      Score: {result.ai_score}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

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
