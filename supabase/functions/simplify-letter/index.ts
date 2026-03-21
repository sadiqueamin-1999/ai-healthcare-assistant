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
    const { letterText } = await req.json();

    if (!letterText || typeof letterText !== "string" || letterText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "letterText is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (letterText.length > 10000) {
      return new Response(
        JSON.stringify({ error: "letterText must be less than 10000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
            content: `You are a patient letter simplifier used by healthcare services to help patients understand their clinical correspondence. Your role is to rewrite medical letters in plain, accessible English — you do NOT diagnose, recommend treatments, or give medical advice.

SAFETY RULES (non-negotiable):
- Never provide a medical diagnosis or treatment recommendation beyond what is explicitly stated in the letter.
- Never tell the patient to start, stop, or change any medication.
- Never downplay or dismiss anything in the letter.
- If the letter contains serious or concerning information, make sure the patient understands its importance without causing unnecessary alarm.
- Always encourage the patient to contact their GP or clinical team if they have questions.

YOUR TASK:
Given a clinical/hospital letter, produce:
1. aiPlainEnglish — A complete rewrite of the letter in plain, simple English that a non-medical person can understand. Replace medical jargon with everyday language. Keep the same information but make it accessible. Use short sentences and simple words. Address the patient directly using "you/your" language.
2. aiNextSteps — A clear, simple list of what the patient needs to do next, based only on what the letter says. This might include:
   • Appointments they need to attend
   • Medications to continue taking (as prescribed — do not advise changes)
   • Tests or scans they need to have
   • Referrals that have been made
   • When and how to follow up
   If no next steps are mentioned, say "No specific next steps were mentioned in this letter. If you're unsure what to do, contact your GP."
3. aiImportantWarnings — Things the patient should watch out for, based on what the letter mentions or implies. This might include:
   • Symptoms to look out for that should prompt them to seek help
   • Side effects of mentioned medications
   • Red flags that mean they should go to A&E or call 999
   • Time-sensitive actions (e.g. "You must attend this appointment")
   If nothing warrants a warning, say "No specific warnings were mentioned, but always contact your GP or call 111 if you feel unwell or have concerns."
4. aiReasoning — Brief explanation of your simplification choices, any medical terms you translated, and any parts of the letter that were ambiguous or unclear.

TONE & STYLE:
- Warm, reassuring, but honest.
- Reading age of approximately 11-12 years old.
- Avoid patronising language.
- Use "you" and "your" — write as if speaking directly to the patient.
- Break up long paragraphs into short, digestible sections.`,
          },
          {
            role: "user",
            content: letterText,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "simplify_letter",
              description: "Simplify a clinical letter into plain English with next steps and warnings.",
              parameters: {
                type: "object",
                properties: {
                  aiPlainEnglish: {
                    type: "string",
                    description: "The letter rewritten in plain, simple English.",
                  },
                  aiNextSteps: {
                    type: "string",
                    description: "Clear list of what the patient needs to do next.",
                  },
                  aiImportantWarnings: {
                    type: "string",
                    description: "Things the patient should watch out for.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Explanation of simplification choices and any ambiguities.",
                  },
                  aiAlternativeInterpretations: {
                    type: "string",
                    description: "Other ways the letter content could be interpreted, or things the patient might misunderstand.",
                  },
                  aiClarifyingQuestions: {
                    type: "string",
                    description: "2-3 questions the patient or clinician might want to ask to clarify the letter's content.",
                  },
                },
                required: ["aiPlainEnglish", "aiNextSteps", "aiImportantWarnings", "aiReasoning", "aiAlternativeInterpretations", "aiClarifyingQuestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "simplify_letter" } },
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error: dbError } = await supabase
      .from("patient_letters")
      .insert({
        letter_text: letterText.trim(),
        ai_plain_english: result.aiPlainEnglish,
        ai_next_steps: result.aiNextSteps,
        ai_important_warnings: result.aiImportantWarnings,
        ai_reasoning: result.aiReasoning,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save simplified letter");
    }

    return new Response(JSON.stringify({
      ...data,
      ai_alternative_interpretations: result.aiAlternativeInterpretations,
      ai_clarifying_questions: result.aiClarifyingQuestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("simplify-letter error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
