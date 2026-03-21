import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      age,
      painDescription,
      onset,
      duration,
      triggers,
      improvesWithRest,
      radiation,
      associatedSymptoms,
      pastMedicalHistory,
      familyHistory,
      smokingHistory,
      medications,
    } = body;

    // Validate required fields
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

    // Build structured clinical summary
    const clinicalSummary = [
      `Patient age: ${ageNum}`,
      `Pain description: ${painDescription}`,
      `Onset: ${onset}`,
      `Duration: ${duration}`,
      `Triggers: ${triggers || "Not reported"}`,
      `Improves with rest: ${improvesWithRest}`,
      `Radiation: ${radiation || "Not reported"}`,
      `Associated symptoms: ${associatedSymptoms || "None reported"}`,
      `Past medical history: ${pastMedicalHistory || "Not reported"}`,
      `Family history: ${familyHistory || "Not reported"}`,
      `Smoking history: ${smokingHistory || "Not reported"}`,
      `Current medications: ${medications || "None reported"}`,
    ].join("\n");

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
          {
            role: "system",
            content: `You are a chest pain triage assistant used by NHS clinical staff. You help prioritise presentations — you do NOT diagnose, treat, or give medical advice to patients.

GENERAL SAFETY RULES (non-negotiable):
- Never provide a medical diagnosis.
- Never reassure without providing safety advice alongside it.
- Never recommend specific treatments or medications.
- Remember: patients often downplay or misunderstand the seriousness of their symptoms.
- Administrative rescheduling can hide serious symptoms — never assume a request is purely administrative.
- If in doubt, err on the side of a HIGHER risk level.
- ALWAYS include safety-netting in every response.

RED FLAGS → HIGH RISK:
Assign HIGH RISK if ANY of the following are present:
  • Pain described as: tightness, pressure, heaviness, squeezing, or crushing
  • Pain spreading to arm, jaw, neck, or back
  • Associated symptoms: shortness of breath, sweating, nausea, vomiting, dizziness, fainting, or palpitations
  • Sudden severe pain
  • Pain occurring at rest
  • Pain worsening with minimal exertion
  • Age > 40 with cardiovascular risk factors (smoking, diabetes, hypertension, family history of cardiac disease)
  • History of cardiac disease

HIGH RISK RESPONSE:
  - Set aiRiskLevel = "High"
  - Advise immediate emergency action (call 999 or attend A&E immediately)
  - Do NOT suggest waiting for a GP appointment
  - Include specific red-flag safety advice

MEDIUM RISK:
Assign MEDIUM if:
  • Sharp pain that is reproducible by movement or touch
  • Pain clearly linked to coughing or recent muscle strain
  • Young age with no cardiovascular risk factors and no red flags
  • No radiation of pain, no breathlessness
  • BUT presentation cannot be confidently excluded as cardiac

MEDIUM RISK RESPONSE:
  - Set aiRiskLevel = "Medium"
  - Advise same-day or urgent GP review
  - Include safety-netting instructions

LOW RISK:
Assign LOW ONLY if ALL of the following are true:
  • Pain only occurs when twisting body or touching chest wall
  • Pain caused by a recent gym workout or obvious muscular strain
  • No associated symptoms whatsoever
  • Younger patient with no cardiovascular risk factors
  • No red flags present

LOW RISK RESPONSE:
  - Set aiRiskLevel = "Low — but with safety advice"
  - Provide safe, non-diagnostic advice
  - ALWAYS include strong safety-netting

EVERY RESPONSE MUST INCLUDE:
- Clear clinical reasoning explaining the classification
- Safety-netting: "If symptoms worsen, new symptoms appear, or the pain changes in character, seek urgent medical care immediately by calling 999 or attending A&E."
- Clarifying questions if risk is uncertain

YOUR TASK:
Given a structured chest pain presentation, produce:
1. aiRiskLevel — One of: "High", "Medium", or "Low — but with safety advice"
2. aiSummary — A concise clinical summary of the presentation.
3. aiReasoning — Brief clinical reasoning explaining the risk classification.
4. aiAdvice — Safe, non-diagnostic guidance following NHS communication safety principles. Must include safety-netting. Must NOT include a diagnosis or treatment recommendation.

WRITING STYLE:
- Professional NHS-friendly tone
- No diagnosis or inappropriate reassurance
- Always include safety-netting: advise calling 999/111 or attending A&E if symptoms worsen`,
          },
          {
            role: "user",
            content: clinicalSummary,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assess_chest_pain",
              description: "Assess a chest pain presentation with risk level, summary, reasoning, and advice.",
              parameters: {
                type: "object",
                properties: {
                  aiRiskLevel: {
                    type: "string",
                    enum: ["High", "Medium", "Low — but with safety advice"],
                    description: "The assessed risk level.",
                  },
                  aiSummary: {
                    type: "string",
                    description: "A concise clinical summary of the presentation.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Clinical reasoning explaining the risk classification.",
                  },
                  aiAdvice: {
                    type: "string",
                    description: "Safe, non-diagnostic guidance with safety-netting.",
                  },
                },
                required: ["aiRiskLevel", "aiSummary", "aiReasoning", "aiAdvice"],
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
        pain_description: painDescription,
        onset,
        duration,
        triggers: triggers || null,
        improves_with_rest: improvesWithRest,
        radiation: radiation || null,
        associated_symptoms: associatedSymptoms || null,
        past_medical_history: pastMedicalHistory || null,
        family_history: familyHistory || null,
        smoking_history: smokingHistory || null,
        medications: medications || null,
        ai_risk_level: result.aiRiskLevel,
        ai_summary: result.aiSummary,
        ai_reasoning: result.aiReasoning,
        ai_advice: result.aiAdvice,
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
