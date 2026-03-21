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
    const { messageText } = await req.json();

    if (!messageText || typeof messageText !== "string" || messageText.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "messageText is required and must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (messageText.length > 5000) {
      return new Response(
        JSON.stringify({ error: "messageText must be less than 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Call AI with tool calling for structured output
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
            content: `You are a patient message triage assistant used by NHS/healthcare admin staff. Your role is to help staff prioritise and draft responses — you do NOT diagnose, treat, or give medical advice.

GENERAL SAFETY RULES (non-negotiable):
- Never assume a message is low risk just because the patient didn't mention symptoms.
- Hidden symptoms and underreporting are common in NHS communication.
- Appointment rescheduling may hide clinical deterioration or misunderstanding of urgency.
- Never provide a medical diagnosis or treatment recommendation.
- Never give reassurance that could delay appropriate care.
- Always include safety-netting in every draft reply (i.e. advise the patient how to escalate if they feel worse).

RISK CLASSIFICATION RULES:

A) HIGH RISK — Assign if the message mentions ANY of these:
  • Chest pain, chest tightness, pressure, or heaviness
  • Shortness of breath or difficulty breathing
  • Dizziness or fainting
  • Severe pain anywhere in the body
  • Bleeding (significant or unexplained)
  • Suicidal thoughts, self-harm, or mental health crisis
  • Symptoms worsening quickly
  • Severe infection signs (fever combined with feeling very unwell)
  • Loss of consciousness, seizure, or sudden neurological symptoms
  • Allergic reaction symptoms (swelling, throat closing)
  • Any language suggesting an emergency or immediate danger

  If HIGH RISK:
  - Set aiRiskLevel = "High Risk"
  - Draft reply MUST advise urgent clinical contact (call 999/111 or attend A&E immediately)
  - Include red-flag safety advice

B) UNCERTAIN RISK — This is the DEFAULT when no clear symptoms are mentioned.
  Select this when:
  • The message appears administrative (e.g. rescheduling, cancelling)
  • The reason for the appointment is unknown
  • The clinic type is unknown
  • Symptoms may be hidden or underreported

  If UNCERTAIN:
  - Set aiRiskLevel = "Uncertain – Needs Clarification"
  - NEVER treat administrative messages as low risk automatically
  - Draft reply MUST request more information before any action is taken
  - Always include these clarifying questions:
    "Which clinic is this appointment for?"
    "Is the appointment related to any ongoing symptoms?"
    "Have you had any new or worsening symptoms since it was booked?"

C) LOW RISK — Only assign if ALL of these are true:
  • The message is purely administrative with no possible clinical undertone
  • You clearly state that risk is low based only on provided information
  • You still include safety screening questions
  • You still include safety-netting advice

  If LOW RISK:
  - Set aiRiskLevel = "Low Risk — based on available information"
  - Still include safety questions
  - Still include safety-netting

WRITING STYLE:
- Professional, NHS-friendly tone
- No diagnosis
- No inappropriate reassurance
- Always offer a safe way for the patient to escalate concerns

YOUR TASK:
Given a patient message, produce:
1. aiSummary — A 1-2 sentence plain-language summary of what the patient is asking or reporting.
2. aiRiskLevel — One of: "High Risk", "Uncertain – Needs Clarification", or "Low Risk — based on available information".
3. aiDraftReply — A short, empathetic, non-clinical reply following the rules above for the assigned risk level. Must always include safety-netting.
4. aiReasoning — Brief explanation of why you assigned that risk level, referencing the classification rules.
5. aiClarifyingQuestions — 2-3 questions the clinician could ask the patient to better understand their situation. Always include these regardless of risk level.`,
          },
          {
            role: "user",
            content: messageText,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "triage_message",
              description: "Triage a patient message with summary, risk level, draft reply, reasoning, and clarifying questions.",
              parameters: {
                type: "object",
                properties: {
                  aiSummary: {
                    type: "string",
                    description: "A concise summary of the patient's concern.",
                  },
                  aiRiskLevel: {
                    type: "string",
                    enum: ["High Risk", "Uncertain – Needs Clarification", "Low Risk — based on available information"],
                    description: "The assessed risk level.",
                  },
                  aiDraftReply: {
                    type: "string",
                    description: "A safe, empathetic reply with safety-netting that does not give medical advice.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Explanation of the risk assessment and response rationale.",
                  },
                  aiClarifyingQuestions: {
                    type: "string",
                    description: "2-3 questions the clinician could ask the patient to better understand their situation.",
                  },
                },
                required: ["aiSummary", "aiRiskLevel", "aiDraftReply", "aiReasoning", "aiClarifyingQuestions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "triage_message" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      throw new Error(`AI gateway returned ${status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned from AI");

    const triageResult = JSON.parse(toolCall.function.arguments);

    // Save to database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error: dbError } = await supabase
      .from("patient_messages")
      .insert({
        message_text: messageText.trim(),
        ai_summary: triageResult.aiSummary,
        ai_risk_level: triageResult.aiRiskLevel,
        ai_draft_reply: triageResult.aiDraftReply,
        ai_reasoning: triageResult.aiReasoning,
        safety_flag: triageResult.aiRiskLevel === "High",
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save triage result");
    }

    return new Response(JSON.stringify({
      ...data,
      ai_alternative_interpretations: triageResult.aiAlternativeInterpretations,
      ai_clarifying_questions: triageResult.aiClarifyingQuestions,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("triage-message error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
