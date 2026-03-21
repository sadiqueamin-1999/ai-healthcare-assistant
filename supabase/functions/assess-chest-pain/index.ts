import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildClinicalSummary(body: Record<string, any>): string {
  const {
    age, sex, painDescription, onset, duration, triggers,
    improvesWithRest, radiation, associatedSymptoms,
    pastMedicalHistory, familyHistory, smokingHistory,
    medications, causeCategories,
  } = body;

  return [
    `Patient age: ${age}`,
    `Biological sex: ${sex || "Not reported"}`,
    `Pain type(s): ${painDescription}`,
    `Onset: ${onset}`,
    `Duration: ${duration}`,
    `Triggers: ${triggers || "Not reported"}`,
    `Improves with rest: ${improvesWithRest}`,
    `Radiation: ${radiation || "Not reported"}`,
    `Associated symptoms: ${associatedSymptoms || "None reported"}`,
    `Past medical history: ${pastMedicalHistory || "Not reported"}`,
    `Family history of heart disease: ${familyHistory || "Not reported"}`,
    `Smoking history: ${smokingHistory || "Not reported"}`,
    `Current medications: ${medications || "None reported"}`,
    `Patient-selected potential cause categories: ${causeCategories || "None selected"}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `You are a chest pain triage assistant used by NHS clinical staff. You help prioritise presentations — you do NOT diagnose, treat, or give medical advice to patients.

GENERAL SAFETY RULES (non-negotiable):
- Never provide a medical diagnosis.
- Never reassure without providing safety advice alongside it.
- Never recommend specific treatments or medications.
- If in doubt, err on the side of a HIGHER risk level.
- ALWAYS include safety-netting in every response.
- If information is incomplete or ambiguous, default to "Uncertain – Needs Clarification".

YOUR TASK:
Given a structured chest pain presentation, you MUST:

1. Compute a numerical risk score using the EXACT scoring algorithm below.
2. Classify the risk category based on the total score.
3. Provide a clinical summary, reasoning (showing score breakdown), and advice.

═══════════════════════════════════════════
SCORING ALGORITHM — Follow these rules EXACTLY
═══════════════════════════════════════════

A. PAIN QUALITY (add points for each pain type reported):
   • Sudden severe pressure: +5
   • Tightness: +5
   • Heaviness: +5
   • Squeezing sensation: +5
   • Burning/heartburn-like: +1
   • Indigestion-like: +1
   • Sharp/stabbing pain: +1
   • Muscle or chest wall tenderness: 0
   • Pain only with movement or touch: 0 to +1 (use +1 if ambiguous context)

B. RADIATION (add points for each reported):
   • Jaw: +4
   • Left arm: +4
   • Right arm: +2
   • Back: +3
   • Neck: +2
   • None: 0

C. ASSOCIATED SYMPTOMS (add points for each reported):
   • Shortness of breath: +5
   • Nausea: +2
   • Vomiting: +3
   • Dizziness: +3
   • Lightheadedness: +3
   • Cold sweat: +4
   • Palpitations: +2
   • Fever (with chest pain): +3
   • Cough: +1
   • Anxiety / panic-like symptoms: 0 to +1 (use +1 if other risk factors present)
   • Skin sensitivity or rash: 0 to +1

D. DURATION:
   • 15 minutes or more: +5
   • Minutes (assume 5–15 min): +3
   • Seconds: 0
   • Intermittent episodes: +3

E. TRIGGERS (add points for each reported):
   • No clear trigger (pain occurs at rest): +5
   • Exercise or exertion: +4
   • Stress or anxiety: +1
   • Eating: +1
   • Deep breathing: +1
   • Lying down: +1
   • Coughing: +1

F. PAST MEDICAL HISTORY (scan the free-text field and add points for each found):
   • Prior MI / coronary disease / heart disease: +6
   • Hypertension / high blood pressure: +2
   • Diabetes: +2
   • High cholesterol / hyperlipidaemia: +1
   • Any other significant PMH: 0

G. SMOKING:
   • Current smoker or Yes: +2
   • Ex-smoker: +1
   • No: 0

H. FAMILY HISTORY:
   • Yes: +2
   • No: 0

I. AGE:
   • Age < 20: +0
   • Age 20–39: +1
   • Age 40–49: +2
   • Age 50–59: +3
   • Age ≥ 60: +4

J. SEX MODIFIER:
   • Male with classical cardiac symptoms (pressure/squeezing + radiation + SOB): +1
   • Female with ANY atypical symptoms (nausea, dizziness, indigestion-like, fatigue, breathlessness without classic crushing chest pain): +2
   • Intersex / Prefer not to say: 0

K. IMPROVES WITH REST:
   • No (does NOT improve): +2
   • Yes: 0

═══════════════════════════════════════════
RISK CLASSIFICATION (based on TOTAL score):
═══════════════════════════════════════════
   0–3   → VERY LOW
   4–7   → LOW
   8–12  → MEDIUM
   13–16 → HIGH
   17+   → VERY HIGH

═══════════════════════════════════════════
RESPONSE REQUIREMENTS
═══════════════════════════════════════════

You MUST return a structured response with these fields:

1. score — The computed numerical total (integer).
2. riskCategory — One of: "Very Low", "Low", "Medium", "High", "Very High"
3. aiSummary — A concise clinical summary of the presentation.
4. aiReasoning — MUST show the full score breakdown:
   - List each category (A through K) with what was found and points awarded
   - Show the running total
   - Explain the final classification
   - Reference specific symptoms and risk factors
5. aiAdvice — Safe, non-diagnostic guidance following NHS communication safety principles:
   - VERY HIGH / HIGH: Advise immediate emergency action (call 999 or attend A&E)
   - MEDIUM: Advise same-day or urgent GP review
   - LOW: Advise routine GP review with safety-netting
   - VERY LOW: Advise self-care with safety-netting
   - ALL levels MUST include: "If symptoms worsen, new symptoms appear, or the pain changes in character, seek urgent medical care immediately by calling 999 or attending A&E."

BIOLOGICAL SEX CONSIDERATIONS:
- Female patients often present with atypical chest pain symptoms (fatigue, nausea, jaw pain, back pain without classic crushing chest pain). Weight these MORE seriously.
- Do not lower risk classification simply because a presentation is "atypical".

WRITING STYLE:
- Professional NHS-friendly tone
- No diagnosis or inappropriate reassurance
- Always include safety-netting`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { age, painDescription, onset, duration, improvesWithRest } = body;

    if (!age || !painDescription || !onset || !duration || !improvesWithRest) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: age, painDescription, onset, duration, improvesWithRest" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      return new Response(
        JSON.stringify({ error: "age must be a valid number between 0 and 150" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clinicalSummary = buildClinicalSummary(body);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: clinicalSummary },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_chest_pain",
              description: "Return a chest pain risk assessment with numerical score, risk category, summary, reasoning, and advice.",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "integer",
                    description: "The computed numerical risk score (total of all categories A-J).",
                  },
                  riskCategory: {
                    type: "string",
                    enum: ["Very Low", "Low", "Medium", "High", "Very High"],
                    description: "Risk classification based on total score: 0-3=Very Low, 4-7=Low, 8-12=Medium, 13-16=High, 17+=Very High.",
                  },
                  aiSummary: {
                    type: "string",
                    description: "A concise clinical summary of the presentation.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Full score breakdown by category (A-J) with points awarded and final classification explanation.",
                  },
                  aiAdvice: {
                    type: "string",
                    description: "Safe, non-diagnostic guidance with safety-netting. Must not include diagnosis or treatment.",
                  },
                },
                required: ["score", "riskCategory", "aiSummary", "aiReasoning", "aiAdvice"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "assess_chest_pain" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned from AI");

    const result = JSON.parse(toolCall.function.arguments);

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error: dbError } = await supabase
      .from("chest_pain_assessments")
      .insert({
        age: ageNum,
        pain_description: body.painDescription,
        onset,
        duration,
        triggers: body.triggers || null,
        improves_with_rest: improvesWithRest,
        radiation: body.radiation || null,
        associated_symptoms: body.associatedSymptoms || null,
        past_medical_history: body.pastMedicalHistory || null,
        family_history: body.familyHistory || null,
        smoking_history: body.smokingHistory || null,
        medications: body.medications || null,
        ai_risk_level: result.riskCategory,
        ai_summary: result.aiSummary,
        ai_reasoning: result.aiReasoning,
        ai_advice: result.aiAdvice,
        ai_score: result.score,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save assessment");
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("assess-chest-pain error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
