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
    const { noteText } = await req.json();

    if (!noteText || typeof noteText !== "string" || noteText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "noteText is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (noteText.length > 10000) {
      return new Response(
        JSON.stringify({ error: "noteText must be less than 10000 characters" }),
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
            content: `You are a clinical note summarisation assistant used by healthcare professionals. Your role is to structure and summarise clinical notes — you do NOT diagnose, recommend treatments, or add clinical interpretation beyond what is stated in the note.

SAFETY RULES (non-negotiable):
- Only extract and summarise information explicitly present in the note.
- Never invent, infer, or assume clinical details not stated.
- Never recommend treatments, medications, or clinical actions.
- Flag if the note appears incomplete or contains ambiguous information.

YOUR TASK:
Given a clinical note, produce:
1. aiSummary — A concise 2-3 sentence summary of the main medical issues, written for a clinician audience. Include the patient context (age, sex if available) and primary concerns.
2. aiKeyPoints — Structured extraction of:
   • Active diagnoses and conditions
   • Current medications (with doses where stated)
   • Allergies or adverse reactions (if mentioned)
   • Recent investigations and results (labs, imaging, ECG, etc.)
   • Significant recent events (admissions, procedures, A&E visits)
   • Outstanding actions or pending results
3. aiTimeline — A clean, chronological, clinician-friendly timeline of medically relevant events. Each entry should include the date (or relative timing) and what happened. Format as a simple list, earliest first. Only include events with clear temporal markers.
4. aiReasoning — Brief explanation of how you identified the key information, any assumptions made about chronology, and any gaps or ambiguities in the note.

FORMATTING:
- Use bullet points for aiKeyPoints.
- Use "date: event" format for aiTimeline entries.
- Keep language clinical and professional.
- If dates are ambiguous, note this in aiReasoning.`,
          },
          {
            role: "user",
            content: noteText,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "summarise_note",
              description: "Summarise a clinical note with key points, timeline, and reasoning.",
              parameters: {
                type: "object",
                properties: {
                  aiSummary: {
                    type: "string",
                    description: "Concise summary of main medical issues.",
                  },
                  aiKeyPoints: {
                    type: "string",
                    description: "Key clinical info: diagnoses, medications, recent events.",
                  },
                  aiTimeline: {
                    type: "string",
                    description: "Chronological sequence of medically relevant events.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Reasoning behind the summary and extraction.",
                  },
                  aiAlternativeInterpretations: {
                    type: "string",
                    description: "Other possible clinical interpretations or differential considerations based on the note content.",
                  },
                  aiClarifyingQuestions: {
                    type: "string",
                    description: "2-3 questions a clinician might want to clarify based on gaps or ambiguities in the note.",
                  },
                },
                required: ["aiSummary", "aiKeyPoints", "aiTimeline", "aiReasoning", "aiAlternativeInterpretations", "aiClarifyingQuestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "summarise_note" } },
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
      .from("clinical_notes")
      .insert({
        note_text: noteText.trim(),
        ai_summary: result.aiSummary,
        ai_key_points: result.aiKeyPoints,
        ai_timeline: result.aiTimeline,
        ai_reasoning: result.aiReasoning,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save summarised note");
    }

    return new Response(JSON.stringify({
      ...data,
      ai_alternative_interpretations: result.aiAlternativeInterpretations,
      ai_clarifying_questions: result.aiClarifyingQuestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarise-note error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
