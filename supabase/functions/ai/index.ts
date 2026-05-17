import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLAUDE_MODEL = "claude-opus-4-7";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check - accept both authenticated and anonymous requests (demo mode)
    let userId = "anonymous";
    let userRole = "student";
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, name")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) userRole = profile.role;
      }
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/ai/, "");

    if (req.method === "POST" && (path === "" || path === "/" || path === "/chat")) {
      const body = await req.json();
      const {
        prompt,
        context = "",
        type = "chat",
        max_tokens = 2000,
        system_prompt,
        metadata = {},
      } = body;

      if (!prompt) {
        return new Response(
          JSON.stringify({ error: "prompt is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build role-aware system prompt
      const roleSystemPrompts: Record<string, string> = {
        teacher: `You are an expert AI assistant for teachers on the SatsRewards platform — a Bitcoin rewards educational system for schools. You help teachers with:
- Creating engaging lesson plans about Bitcoin, financial literacy, and money
- Understanding student progress and identifying struggling students
- Writing quiz questions and assessment criteria
- Designing reward strategies that motivate students
- Explaining complex financial concepts in age-appropriate ways
- Managing class activities and timetables effectively

Be direct, practical, and specific. Teachers are busy — give actionable answers.`,

        admin: `You are an expert AI assistant for school administrators on SatsRewards. You help admins with:
- School compliance (KYC, age verification, regulatory requirements)
- Managing Bitcoin wallets and funding strategies
- Understanding platform analytics and student engagement metrics
- Configuring school settings and reward policies
- Troubleshooting technical issues
- Planning Bitcoin education rollouts

Be concise and solution-focused. Admins need decisions, not lectures.`,

        student: `You are a friendly, encouraging AI tutor on SatsRewards — a platform where students earn Bitcoin (sats) for learning. You help students:
- Understand Bitcoin: what it is, how it works, why it matters
- Learn financial literacy: saving, budgeting, investing concepts
- Grasp blockchain and cryptocurrency fundamentals
- Prepare for quizzes and earn more rewards
- Explore real-world applications of Bitcoin

You speak like a knowledgeable friend, not a textbook. Use analogies, examples, and keep it engaging. Always be encouraging and age-appropriate.`,

        default: `You are an AI assistant for the SatsRewards educational platform — helping schools teach Bitcoin and financial literacy through a rewards system. Be helpful, accurate, and educational.`,
      };

      const finalSystemPrompt = system_prompt || roleSystemPrompts[userRole] || roleSystemPrompts.default;

      // Build messages — context can be prior conversation turns as a string
      const messages: Array<{ role: string; content: string }> = [];
      if (context) {
        messages.push({ role: "user", content: `[Context from previous conversation]\n${context}` });
        messages.push({ role: "assistant", content: "Understood, I have that context." });
      }
      messages.push({ role: "user", content: prompt });

      // Call Claude with adaptive thinking for deep reasoning
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens,
          thinking: { type: "adaptive" },
          system: finalSystemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Claude API error:", errorText);
        return new Response(
          JSON.stringify({ error: `AI request failed: ${response.status}` }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();

      // Extract text from response content (skip thinking blocks)
      let generatedText = "";
      let inputTokens = 0;
      let outputTokens = 0;

      for (const block of result.content ?? []) {
        if (block.type === "text") generatedText += block.text;
      }
      inputTokens = result.usage?.input_tokens ?? 0;
      outputTokens = result.usage?.output_tokens ?? 0;

      // Log request
      if (userId !== "anonymous") {
        try {
          await supabase.from("ai_request_logs").insert({
            user_id: userId,
            prompt: prompt.substring(0, 500),
            response: generatedText.substring(0, 1000),
            model: CLAUDE_MODEL,
            tokens_used: inputTokens + outputTokens,
            metadata: { ...metadata, type, role: userRole, inputTokens, outputTokens },
          });
        } catch (_) { /* non-critical */ }
      }

      return new Response(
        JSON.stringify({
          content: generatedText,
          model: CLAUDE_MODEL,
          usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("ai function error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
