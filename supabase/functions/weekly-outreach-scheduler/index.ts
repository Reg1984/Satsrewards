import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Count emails sent this week (Monday 00:00 UTC to now)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setUTCDate(now.getUTCDate() - daysSinceMonday);
    weekStart.setUTCHours(0, 0, 0, 0);

    const { count: emailsSentThisWeek } = await supabase
      .from("outreach_emails")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("sent_at", weekStart.toISOString());

    const TARGET_PER_WEEK = 10;
    const remaining = TARGET_PER_WEEK - (emailsSentThisWeek ?? 0);

    if (remaining <= 0) {
      const msg = `Weekly outreach target already met: ${emailsSentThisWeek} emails sent this week.`;
      console.log(msg);

      // Log the run
      await supabase.from("outreach_scheduler_log").insert({
        run_at: now.toISOString(),
        emails_sent_this_week: emailsSentThisWeek,
        emails_requested: 0,
        status: "target_met",
        notes: msg,
      }).then(() => {});

      return new Response(
        JSON.stringify({ success: true, message: msg, emails_sent_this_week: emailsSentThisWeek }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Weekly outreach: ${emailsSentThisWeek ?? 0} sent so far, requesting ${remaining} more.`);

    // Find the admin user to run outreach on behalf of (first admin in DB)
    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("role", "admin")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const adminId = adminProfile?.id ?? "system";

    // Rotate through global regions week by week
    const regions = [
      // UK
      "London", "Manchester", "Birmingham", "Yorkshire", "Bristol",
      "Edinburgh", "Cardiff", "Leeds", "Liverpool", "Sheffield",
      // USA
      "New York", "Los Angeles", "Chicago", "Houston", "Miami",
      "San Francisco", "Boston", "Seattle", "Washington DC", "Atlanta",
      // El Salvador
      "San Salvador", "El Salvador",
      // Asia
      "Singapore", "Hong Kong", "Tokyo", "Shanghai", "Dubai",
      "Bangkok", "Kuala Lumpur", "Jakarta", "Mumbai", "Seoul",
      // New Zealand
      "Auckland", "Wellington", "Christchurch",
      // Australia
      "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide",
      // Europe
      "Amsterdam", "Berlin", "Paris", "Madrid", "Rome",
      "Zurich", "Stockholm", "Copenhagen", "Dublin", "Lisbon",
      // Middle East
      "Dubai", "Abu Dhabi", "Riyadh", "Doha", "Kuwait City",
      "Bahrain", "Muscat", "Cairo", "Beirut",
      // Rest of world / international schools
      "Nairobi", "Lagos", "Cape Town", "Johannesburg",
      "Toronto", "Vancouver", "Mexico City", "Sao Paulo",
      "Buenos Aires", "international schools worldwide",
    ];
    const weekNumber = Math.floor((now.getTime() - new Date("2026-01-05").getTime()) / (7 * 86400000));
    const region = regions[weekNumber % regions.length];

    // Determine the market context for better search targeting
    const isUK = ["London","Manchester","Birmingham","Yorkshire","Bristol","Edinburgh","Cardiff","Leeds","Liverpool","Sheffield"].includes(region);
    const isUSA = ["New York","Los Angeles","Chicago","Houston","Miami","San Francisco","Boston","Seattle","Washington DC","Atlanta"].includes(region);
    const isElSalvador = ["San Salvador","El Salvador"].includes(region);
    const isInternational = region === "international schools worldwide";

    const targetType = isUSA ? "private school" : isElSalvador ? "school" : isInternational ? "international school" : "academy_trust";
    const marketNote = isUSA ? "US private school or charter school" :
      isElSalvador ? "Salvadoran school (note: El Salvador has Bitcoin as legal tender - major advantage)" :
      isInternational ? "international school" :
      isUK ? "UK academy trust or school" :
      "international school or private school";

    // Call admin-agent to find and outreach schools
    const agentPayload = {
      message: `It is Monday. Run the weekly outreach task: find ${remaining} new ${marketNote}s in the ${region} area that we have NOT contacted before, research each one, draft a personalised email appropriate for their local context and currency, and send it. Use find_and_outreach_schools with auto_send=true, target_type="${targetType}", region="${region}", count=${remaining}. For non-UK schools, adapt the value proposition: reference local currency savings equivalent, international Bitcoin adoption trends, and financial literacy needs in their region. Report back with a summary of what was sent.`,
      conversation_id: null,
    };

    const agentResp = await fetch(`${supabaseUrl}/functions/v1/admin-agent/chat`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseServiceKey}`,
        "Content-Type": "application/json",
        "x-admin-id-override": adminId,
      },
      body: JSON.stringify(agentPayload),
    });

    let agentResult: any = { reply: "Agent did not respond" };
    if (agentResp.ok) {
      agentResult = await agentResp.json();
    } else {
      const errText = await agentResp.text();
      console.error("Admin agent error:", errText);
    }

    // Log the scheduler run
    await supabase.from("outreach_scheduler_log").insert({
      run_at: now.toISOString(),
      emails_sent_this_week: emailsSentThisWeek ?? 0,
      emails_requested: remaining,
      region_targeted: region,
      status: agentResp.ok ? "completed" : "agent_error",
      agent_reply: agentResult.reply ?? null,
      notes: `Weekly auto-outreach: targeted ${region}, requested ${remaining} emails`,
    }).then(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        week_start: weekStart.toISOString(),
        emails_already_sent: emailsSentThisWeek ?? 0,
        emails_requested: remaining,
        region_targeted: region,
        agent_reply: agentResult.reply,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("weekly-outreach-scheduler error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
