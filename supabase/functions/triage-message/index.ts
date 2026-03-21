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

SAFETY RULES (non-negotiable):
- Never provide a medical diagnosis or treatment recommendation.
- Never tell the patient what condition they have or what medication to take.
- All draft replies must be safe, generic, and empathetic — acknowledging the patient's concern and directing them to the appropriate clinical team.
- If in doubt, err on the side of a HIGHER risk level.

YOUR TASK:
Given a patient message, produce:
1. aiSummary — A 1-2 sentence plain-language summary of what the patient is asking or reporting.
2. aiRiskLevel — One of: High, Medium, or Low.
3. aiDraftReply — A short, empathetic, non-clinical reply that acknowledges the concern, does NOT give medical advice, and tells the patient their message will be reviewed by the clinical team. If High risk, advise them to call 999/111 or attend A&E immediately.
4. aiReasoning — Brief explanation of why you assigned that risk level.

RISK LEVEL RULES:
HIGH — Assign if the message contains ANY of these red flags:
  • Chest pain or tightness
  • Shortness of breath or difficulty breathing
  • Severe or uncontrolled pain
  • Significant or unexplained bleeding
  • Suicidal thoughts, self-harm, or mental health crisis
  • Loss of consciousness, seizure, or sudden neurological symptoms
  • Allergic reaction symptoms (swelling, throat closing)
  • Any language suggesting an emergency or immediate danger

MEDIUM — Assign if the message mentions:
  • Medication side effects, errors, or concerns about current prescriptions
  • Symptoms that are worsening or not improving with current treatment
  • New symptoms that need timely (but not emergency) clinical review
  • Post-operative concerns or post-discharge issues
  • Requests for urgent (same-week) appointments

LOW — Assign if the message is about:
  • Administrative queries (appointment booking, cancellations, referrals)
  • Routine test result follow-ups
  • Prescription refill or repeat requests
  • General wellness or lifestyle questions
  • Non-urgent information requests`,
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
              description: "Triage a patient message with summary, risk level, draft reply, and reasoning.",
              parameters: {
                type: "object",
                properties: {
                  aiSummary: {
                    type: "string",
                    description: "A concise summary of the patient's concern.",
                  },
                  aiRiskLevel: {
                    type: "string",
                    enum: ["High", "Medium", "Low"],
                    description: "The assessed risk level.",
                  },
                  aiDraftReply: {
                    type: "string",
                    description: "A safe, generic reply that does not give medical advice.",
                  },
                  aiReasoning: {
                    type: "string",
                    description: "Explanation of the risk assessment and response rationale.",
                  },
                },
                required: ["aiSummary", "aiRiskLevel", "aiDraftReply", "aiReasoning"],
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
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save triage result");
    }

    return new Response(JSON.stringify(data), {
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
