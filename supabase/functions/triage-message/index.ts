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
            content: `You are a medical message triage assistant. Analyze patient messages and provide:
1. A concise summary of the patient's concern.
2. A risk level assessment (High, Medium, or Low).
3. A safe, generic draft reply that does NOT provide medical advice but acknowledges the patient's concern and guides them appropriately.
4. Your reasoning for the risk level and response.

Risk level guidelines:
- High: Mentions chest pain, difficulty breathing, severe bleeding, suicidal thoughts, loss of consciousness, or other emergency symptoms.
- Medium: Ongoing symptoms, medication concerns, worsening conditions, or requests needing timely clinical review.
- Low: Administrative questions, appointment requests, prescription refills, general wellness inquiries.`,
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
