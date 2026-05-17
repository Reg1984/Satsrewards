import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const CLAUDE_MODEL = "claude-opus-4-7";
const MAX_TOOL_ITERATIONS = 40;

// ─── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  // ── Platform tools ──────────────────────────────────────────────────────────
  {
    name: "query_database",
    description: "Query the SatsRewards Supabase database. Use to look up live data: students, teachers, classes, wallets, transactions, announcements, quiz results, rewards, timetables, outreach_prospects, outreach_emails, outreach_campaigns, outreach_responses, etc.",
    input_schema: {
      type: "object",
      properties: {
        table: { type: "string", description: "Table name to query" },
        filters: { type: "object", description: "Key-value pairs to filter by" },
        select: { type: "string", description: "Columns to select. Defaults to '*'." },
        limit: { type: "number", description: "Max rows to return (default 20, max 100)" },
        order_by: { type: "string", description: "Column to order by" },
        order_asc: { type: "boolean", description: "true = ascending, false = descending (default)" },
        count_only: { type: "boolean", description: "If true, return only the row count" },
      },
      required: ["table"],
    },
  },
  {
    name: "update_database",
    description: "Update or insert records in the database. Use to fix data, update settings, create announcements, modify reward configs, manage outreach prospects, log email responses, etc.",
    input_schema: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["insert", "update", "upsert"], description: "Database operation" },
        table: { type: "string", description: "Table name" },
        data: { type: "object", description: "Data to insert/update" },
        filters: { type: "object", description: "For update: which row(s) to target" },
      },
      required: ["operation", "table", "data"],
    },
  },
  {
    name: "get_school_analytics",
    description: "Get comprehensive analytics: engagement rates, top performers, struggling students, reward distribution, quiz pass rates, wallet balances.",
    input_schema: {
      type: "object",
      properties: {
        school_id: { type: "string", description: "Leave blank for admin's own school" },
        time_range_days: { type: "number", description: "Days to analyse (default 30)" },
      },
    },
  },
  {
    name: "create_announcement",
    description: "Create a school announcement visible on the dashboard.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        message: { type: "string" },
        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
        target_role: { type: "string", enum: ["all", "student", "teacher"] },
      },
      required: ["title", "message"],
    },
  },
  {
    name: "generate_content",
    description: "Generate educational content: quiz questions, lesson plans, activities, explainers, reward descriptions, email templates.",
    input_schema: {
      type: "object",
      properties: {
        content_type: { type: "string", enum: ["quiz", "lesson_plan", "activity", "explainer", "reward_description", "email_template"] },
        topic: { type: "string" },
        difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
        count: { type: "number" },
        extra_context: { type: "string" },
      },
      required: ["content_type", "topic"],
    },
  },
  {
    name: "diagnose_issue",
    description: "Diagnose a SatsRewards platform problem. Checks DB consistency, wallet balances, compliance status, missing config, broken table relationships.",
    input_schema: {
      type: "object",
      properties: {
        issue_description: { type: "string" },
        check_area: { type: "string", enum: ["wallets", "compliance", "classes", "students", "teachers", "rewards", "quizzes", "announcements", "all"] },
      },
      required: ["issue_description"],
    },
  },
  {
    name: "save_memory",
    description: "Save an important fact about this school, admin preferences, or outreach learnings to persistent memory.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
        category: { type: "string", enum: ["preferences", "school_info", "technical", "compliance", "students", "outreach", "general"] },
      },
      required: ["key", "value", "category"],
    },
  },
  {
    name: "get_platform_help",
    description: "Get detailed help and step-by-step guidance on any SatsRewards platform feature.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string" },
        user_level: { type: "string", enum: ["new_user", "intermediate", "advanced"] },
      },
      required: ["topic"],
    },
  },

  // ── Outreach tools ───────────────────────────────────────────────────────────
  {
    name: "research_prospect",
    description: "Research a school or academy trust to build a personalised outreach profile. Generates pain points, personalisation hooks, cost savings analysis, and long-term Bitcoin savings projections for their students. Also suggests which competitor platforms they might be using.",
    input_schema: {
      type: "object",
      properties: {
        organisation_name: { type: "string", description: "Name of the school or trust" },
        organisation_type: { type: "string", enum: ["school", "trust", "academy_trust", "local_authority"], description: "Type of organisation" },
        contact_name: { type: "string", description: "Name of the decision maker (headteacher, CEO, etc.)" },
        contact_title: { type: "string", description: "Their title e.g. Headteacher, CEO, COO" },
        contact_email: { type: "string", description: "Their email address" },
        pupil_count: { type: "number", description: "Approximate number of pupils" },
        school_count: { type: "number", description: "Number of schools in the trust (1 for single school)" },
        region: { type: "string", description: "e.g. London, Manchester, New York, Singapore, Dubai, Sydney, Auckland, San Salvador, Amsterdam, Nairobi" },
        website: { type: "string", description: "School or trust website" },
        extra_context: { type: "string", description: "Any additional info about this prospect" },
        save_to_db: { type: "boolean", description: "If true, save the prospect record to the database" },
      },
      required: ["organisation_name", "contact_email"],
    },
  },
  {
    name: "draft_outreach_email",
    description: "Draft a highly personalised outreach email to a school headteacher or trust CEO about adopting SatsRewards. Covers: cost savings vs competitors, student Bitcoin savings projections over their school years, educational benefits, compliance, and a clear call to action. Can draft initial contact, follow-ups, or case study emails.",
    input_schema: {
      type: "object",
      properties: {
        prospect_id: { type: "string", description: "ID of an existing prospect in the database (use this OR provide details below)" },
        organisation_name: { type: "string", description: "Name of the school/trust (if not using prospect_id)" },
        contact_name: { type: "string", description: "Name of the recipient" },
        contact_title: { type: "string", description: "Their title (Headteacher, CEO, etc.)" },
        contact_email: { type: "string", description: "Their email" },
        pupil_count: { type: "number", description: "Number of pupils" },
        school_count: { type: "number", description: "Schools in trust" },
        email_type: { type: "string", enum: ["initial", "follow_up_1", "follow_up_2", "breakup", "case_study", "custom"], description: "What stage of outreach this is" },
        tone: { type: "string", enum: ["professional", "warm", "bold", "concise"], description: "Email tone" },
        personalisation_focus: { type: "string", description: "What angle to emphasise: e.g. 'cost savings', 'student financial literacy', 'bitcoin savings projections', 'competitor comparison'" },
        competitor_platforms: { type: "string", description: "Platforms they currently use (e.g. ClassDojo, Mathletics, Dojo Points)" },
        save_to_db: { type: "boolean", description: "If true, save the drafted email to the database" },
        conversation_id: { type: "string", description: "Current conversation ID for linking" },
      },
      required: ["email_type"],
    },
  },
  {
    name: "send_outreach_email",
    description: "Send a drafted outreach email to a prospect. Requires the email_id of a draft in the database, or provide all email details directly. Updates prospect stage to 'emailed' and logs the send.",
    input_schema: {
      type: "object",
      properties: {
        email_id: { type: "string", description: "ID of an existing draft email in outreach_emails table" },
        prospect_id: { type: "string", description: "ID of the prospect" },
        to_email: { type: "string", description: "Recipient email (if not using email_id)" },
        subject: { type: "string", description: "Email subject (if not using email_id)" },
        body_html: { type: "string", description: "HTML email body (if not using email_id)" },
        body_text: { type: "string", description: "Plain text body (if not using email_id)" },
      },
    },
  },
  {
    name: "log_prospect_response",
    description: "Log a response or interaction from a prospect (email reply, phone call, meeting note). The AI analyses the sentiment, extracts objections and interests, and updates the prospect's pipeline stage and follow-up date.",
    input_schema: {
      type: "object",
      properties: {
        prospect_id: { type: "string", description: "ID of the prospect" },
        email_id: { type: "string", description: "ID of the email they replied to (if applicable)" },
        response_type: { type: "string", enum: ["email_reply", "phone_call", "manual_note", "auto_reply"], description: "How they responded" },
        content: { type: "string", description: "The full text of their response or your notes" },
        update_stage: { type: "string", enum: ["identified", "researched", "emailed", "replied", "meeting_booked", "demo_given", "converted", "declined", "dormant"], description: "Update the prospect's pipeline stage" },
      },
      required: ["prospect_id", "content", "response_type"],
    },
  },
  {
    name: "get_outreach_pipeline",
    description: "Get the full outreach pipeline: all prospects, their stages, email history, responses, and follow-up dates. Optionally filter by stage or campaign.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", description: "Filter by pipeline stage (leave blank for all)" },
        campaign_id: { type: "string", description: "Filter by campaign (leave blank for all)" },
        limit: { type: "number", description: "Max prospects to return (default 20)" },
        include_emails: { type: "boolean", description: "If true, include email history for each prospect" },
      },
    },
  },
  {
    name: "analyse_outreach_performance",
    description: "Analyse outreach campaign performance: open rates, reply rates, conversion rates, best-performing email types, common objections, and AI recommendations for improving the strategy.",
    input_schema: {
      type: "object",
      properties: {
        campaign_id: { type: "string", description: "Specific campaign ID (blank for overall)" },
        time_range_days: { type: "number", description: "Days to analyse (default 90)" },
      },
    },
  },
  {
    name: "create_outreach_campaign",
    description: "Create a new outreach campaign targeting specific school types, regions, or sizes. Sets goals and tracks performance.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Campaign name e.g. 'London Academy Trusts Q3 2026'" },
        description: { type: "string" },
        target_region: { type: "string" },
        target_org_types: { type: "array", items: { type: "string" }, description: "e.g. ['trust', 'academy_trust']" },
        target_prospect_count: { type: "number", description: "How many prospects to target" },
        target_conversion_count: { type: "number", description: "Goal: how many schools to convert" },
      },
      required: ["name"],
    },
  },

  // ── Web discovery tools ──────────────────────────────────────────────────────
  {
    name: "search_web",
    description: "Search the web for information about UK schools, academy trusts, headteachers, CEO contacts, and educational news. Use to discover real prospects and find contact details. Powered by Tavily search API.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query e.g. 'academy trust CEO contact email London 2024' or 'headteacher email address secondary school Manchester'" },
        search_depth: { type: "string", enum: ["basic", "advanced"], description: "basic = fast, advanced = more thorough. Default basic." },
        max_results: { type: "number", description: "Number of results to return (default 5, max 10)" },
        include_domains: { type: "array", items: { type: "string" }, description: "Limit to specific domains e.g. ['gov.uk', 'academies.com']" },
      },
      required: ["query"],
    },
  },
  {
    name: "fetch_webpage",
    description: "Fetch and read the content of a specific webpage. Use to read school/trust websites, extract contact information, find headteacher names, email addresses, pupil numbers, and about pages. Very useful after search_web finds relevant URLs.",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Full URL to fetch e.g. https://www.exampleschool.co.uk/contact" },
        extract_focus: { type: "string", description: "What to look for e.g. 'headteacher name and email', 'contact details', 'pupil numbers', 'about the trust'" },
      },
      required: ["url"],
    },
  },
  {
    name: "check_and_process_inbox",
    description: "Check for unprocessed email replies from prospects in the outreach_responses table. For each new reply: analyse sentiment, update the prospect's pipeline stage, and automatically draft and send an appropriate follow-up email (positive reply → warm follow-up, no response overdue → follow-up 1/2/breakup, negative → graceful close). Call this proactively to keep the outreach pipeline moving without manual intervention.",
    input_schema: {
      type: "object",
      properties: {
        auto_reply: { type: "boolean", description: "If true, automatically send follow-ups based on reply analysis (default true for autonomous mode)" },
        limit: { type: "number", description: "Max replies to process (default 10)" },
      },
    },
  },
  {
    name: "run_follow_up_sweep",
    description: "Sweep the outreach pipeline for prospects that are overdue for a follow-up email (based on next_follow_up_at). Automatically sends the next appropriate email in the sequence (follow_up_1, follow_up_2, or breakup) to move them through the pipeline. Call this on Monday mornings after the initial outreach batch.",
    input_schema: {
      type: "object",
      properties: {
        dry_run: { type: "boolean", description: "If true, return what would be sent without sending (default false)" },
        max_sends: { type: "number", description: "Max follow-ups to send in this sweep (default 15)" },
      },
    },
  },
  {
    name: "find_and_outreach_schools",
    description: "AUTONOMOUS OUTREACH: Searches the web for schools globally matching criteria, researches each one, saves them as prospects, drafts personalised emails adapted for their local market and currency, and optionally sends them. Works for UK, USA, El Salvador, Asia, New Zealand, Australia, Europe, Middle East, and international schools worldwide. This is the main tool for running an autonomous outreach campaign. Use when asked to 'find schools', 'reach out to trusts', 'start outreach in [region/country]', etc.",
    input_schema: {
      type: "object",
      properties: {
        target_type: { type: "string", enum: ["school", "academy_trust", "multi_academy_trust", "secondary_school", "primary_school", "private_school", "international_school", "charter_school"], description: "Type of organisation to target" },
        region: { type: "string", description: "Region or city globally e.g. 'London', 'New York', 'Singapore', 'Dubai', 'Sydney', 'Auckland', 'San Salvador', 'Amsterdam', 'Nairobi', 'international schools worldwide', 'nationwide'" },
        count: { type: "number", description: "How many prospects to find and add (default 5, max 20)" },
        auto_send: { type: "boolean", description: "If true, automatically send the initial email to each prospect found. If false (default), just research and draft emails." },
        campaign_id: { type: "string", description: "Optional campaign ID to link prospects to" },
        extra_criteria: { type: "string", description: "Any extra search criteria e.g. 'large trusts with 5000+ pupils', 'faith schools', 'outstanding OFSTED rating'" },
      },
      required: ["target_type"],
    },
  },
];

// ─── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  toolInput: any,
  supabase: any,
  userId: string,
  profile: any,
  anthropicKey: string,
): Promise<string> {
  try {
    switch (toolName) {

      // ── Platform tools ────────────────────────────────────────────────────────

      case "query_database": {
        const { table, filters = {}, select = "*", limit = 20, order_by, order_asc = false, count_only = false } = toolInput;
        const safeLimit = Math.min(limit, 100);

        let query = supabase.from(table).select(select, count_only ? { count: "exact", head: true } : undefined);

        // Scope to school for platform tables; scope to user for outreach tables
        const schoolScopedTables = ["profiles", "classes", "student_wallets", "quiz_results", "school_announcements", "transactions", "student_rewards"];
        const userScopedTables = ["outreach_prospects", "outreach_emails", "outreach_campaigns", "outreach_responses"];

        if (schoolScopedTables.includes(table) && profile.school_id && !filters.school_id) {
          query = query.eq("school_id", profile.school_id);
        }
        if (userScopedTables.includes(table) && !filters.created_by) {
          query = query.eq("created_by", userId);
        }

        for (const [col, val] of Object.entries(filters)) {
          query = query.eq(col, val);
        }

        if (order_by) query = query.order(order_by, { ascending: order_asc });
        if (!count_only) query = query.limit(safeLimit);

        const { data, error, count } = await query;
        if (error) return JSON.stringify({ error: error.message });
        if (count_only) return JSON.stringify({ count });
        return JSON.stringify({ rows: data, count: data?.length ?? 0 });
      }

      case "update_database": {
        const { operation, table, data, filters = {} } = toolInput;
        const blocked = ["auth.users", "secrets", "vault"];
        if (blocked.some(t => table.includes(t))) return JSON.stringify({ error: "Operation not permitted on this table" });

        // Scope inserts
        let scopedData = { ...data };
        const schoolScopedTables = ["school_announcements", "classes"];
        const userScopedTables = ["outreach_prospects", "outreach_emails", "outreach_campaigns", "outreach_responses"];
        if (schoolScopedTables.includes(table) && profile.school_id) scopedData.school_id = profile.school_id;
        if (userScopedTables.includes(table)) scopedData.created_by = userId;

        let query;
        if (operation === "insert") query = supabase.from(table).insert(scopedData).select();
        else if (operation === "update") query = supabase.from(table).update(data).match(filters).select();
        else if (operation === "upsert") query = supabase.from(table).upsert(scopedData).select();
        else return JSON.stringify({ error: "Unknown operation" });

        const { data: result, error } = await query;
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, rows_affected: result?.length ?? 0, data: result });
      }

      case "get_school_analytics": {
        const { school_id, time_range_days = 30 } = toolInput;
        const schoolId = school_id || profile.school_id;
        if (!schoolId) return JSON.stringify({ error: "No school ID available" });

        const since = new Date(Date.now() - time_range_days * 86400000).toISOString();
        const [studentsRes, teachersRes, classesRes, walletsRes, quizRes, rewardsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "student"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "teacher"),
          supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
          supabase.from("student_wallets").select("balance").eq("school_id", schoolId),
          supabase.from("quiz_results").select("score, passed").eq("school_id", schoolId).gte("created_at", since),
          supabase.from("student_rewards").select("amount").eq("school_id", schoolId).gte("created_at", since).limit(100),
        ]);

        const wallets = walletsRes.data ?? [];
        const totalBalance = wallets.reduce((s: number, w: any) => s + (w.balance ?? 0), 0);
        const quizzes = quizRes.data ?? [];
        const passRate = quizzes.length ? Math.round((quizzes.filter((q: any) => q.passed).length / quizzes.length) * 100) : 0;
        const totalSats = (rewardsRes.data ?? []).reduce((s: number, r: any) => s + (r.amount ?? 0), 0);

        return JSON.stringify({
          period_days: time_range_days,
          students: studentsRes.count ?? 0,
          teachers: teachersRes.count ?? 0,
          classes: classesRes.count ?? 0,
          wallets: { total: wallets.length, total_sats: totalBalance, avg_balance: wallets.length ? Math.round(totalBalance / wallets.length) : 0 },
          quizzes: { attempts: quizzes.length, pass_rate_percent: passRate },
          rewards: { total_sats_awarded: totalSats },
        });
      }

      case "create_announcement": {
        const { title, message, priority = "medium", target_role = "all" } = toolInput;
        if (!profile.school_id) return JSON.stringify({ error: "No school on this account" });
        const { data, error } = await supabase.from("school_announcements").insert({
          school_id: profile.school_id, title, message, priority, target_role, active: true, created_by: userId,
        }).select().single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, announcement_id: data.id });
      }

      case "generate_content": {
        const { content_type, topic, difficulty = "intermediate", count = 5, extra_context = "" } = toolInput;
        const prompts: Record<string, string> = {
          quiz: `Generate ${count} multiple-choice quiz questions about "${topic}" at ${difficulty} level for high school students learning Bitcoin and financial literacy. JSON array format, each with question, options[4], correctAnswer (0-based index), explanation.`,
          lesson_plan: `Create a structured lesson plan for teaching "${topic}" at ${difficulty} level on the SatsRewards Bitcoin education platform. Include objectives, key concepts, activities, discussion questions, assessment.`,
          activity: `Design ${count} classroom activities for teaching "${topic}" at ${difficulty} level, each 10-20 minutes, connecting to Bitcoin/financial literacy.`,
          explainer: `Write a clear explainer about "${topic}" for high school students. Use analogies and real-world Bitcoin examples. Include a "Why This Matters" section.`,
          reward_description: `Write ${count} motivating reward descriptions for a Bitcoin education platform on the theme of "${topic}".`,
          email_template: `Write a professional email template about "${topic}" for school administrators regarding the SatsRewards Bitcoin education program.`,
        };
        const prompt = (prompts[content_type] || `Generate content about "${topic}" for SatsRewards.`) + (extra_context ? `\n\nExtra requirements: ${extra_context}` : "");
        // anthropicKey provided via function parameter
        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 3000, thinking: { type: "adaptive" }, messages: [{ role: "user", content: prompt }] }),
        });
        if (!resp.ok) return JSON.stringify({ error: "Content generation failed" });
        const result = await resp.json();
        const text = (result.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
        return JSON.stringify({ content_type, topic, generated_content: text });
      }

      case "diagnose_issue": {
        const { issue_description, check_area = "all" } = toolInput;
        const schoolId = profile.school_id;
        const issues: string[] = [];
        if (!schoolId) return JSON.stringify({ error: "No school_id — account not linked to a school. Fix: complete School Setup." });

        const { data: school } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
        if (!school) { issues.push("CRITICAL: School record missing"); }
        else {
          if (!school.compliance_status?.kyc_verified) issues.push("KYC not verified");
          if (!school.wallet_address) issues.push("School wallet not configured");
        }

        if (["wallets", "all"].includes(check_area)) {
          const { data: wallets } = await supabase.from("student_wallets").select("student_id").eq("school_id", schoolId).limit(1);
          if (!wallets?.length) issues.push("No student wallets found");
        }
        if (["classes", "all"].includes(check_area)) {
          const { count } = await supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
          if (!count) issues.push("No classes created");
        }
        if (["students", "all"].includes(check_area)) {
          const { count: sc } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "student");
          const { count: tc } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "teacher");
          if (!tc) issues.push("No teacher accounts");
          if (!sc) issues.push("No student accounts enrolled");
        }

        return JSON.stringify({ issue_described: issue_description, check_area, issues, total_issues: issues.length });
      }

      case "save_memory": {
        const { key, value, category } = toolInput;
        const { error } = await supabase.from("ai_agent_memory").upsert({
          admin_id: userId, memory_key: key, memory_value: value, category, updated_at: new Date().toISOString(),
        }, { onConflict: "admin_id,memory_key" });
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, saved: { key, value, category } });
      }

      case "get_platform_help": {
        const { topic } = toolInput;
        return JSON.stringify({ topic, help: `For "${topic}": use the Admin Dashboard or ask me a specific question about that feature and I'll walk you through it step by step.` });
      }

      // ── Outreach tools ────────────────────────────────────────────────────────

      case "research_prospect": {
        const {
          organisation_name, organisation_type = "school", contact_name = "", contact_title = "Headteacher",
          contact_email, pupil_count = 0, school_count = 1, region = "", website = "", extra_context = "",
          save_to_db = false,
        } = toolInput;

        // Calculate cost savings and Bitcoin projections
        const annualCostPerPupilCompetitor = 18; // avg competitor SaaS per pupil/year
        const satsRewardsAnnualCost = 6; // SatsRewards cost per pupil/year
        const costSavingPerPupil = annualCostPerPupilCompetitor - satsRewardsAnnualCost;
        const totalAnnualSaving = (pupil_count || 200) * costSavingPerPupil;
        const trustAnnualSaving = totalAnnualSaving * school_count;

        // Bitcoin savings projection — if each student earns ~1000 sats/month over 5 school years
        const monthlyEarnings = 1000; // sats
        const schoolYears = 5;
        const totalSatsPerStudent = monthlyEarnings * 12 * schoolYears;
        // At a conservative £0.40/1000 sats (based on historical BTC averages)
        const projectedGbpPerStudent = (totalSatsPerStudent / 100000000) * 40000; // ~£600k/BTC conservative

        // anthropicKey provided via function parameter
        const researchPrompt = `Research this school/trust and build a detailed outreach profile for SatsRewards sales:

Organisation: ${organisation_name} (${organisation_type})
Contact: ${contact_name}, ${contact_title}
Region: ${region}
Pupils: ${pupil_count || "unknown"}
Schools in trust: ${school_count}
Website: ${website}
Extra context: ${extra_context}

Calculate and include:
- Annual cost saving vs competitor platforms: £${totalAnnualSaving.toLocaleString()}/year for this school, £${trustAnnualSaving.toLocaleString()} for the trust
- Student Bitcoin savings projection: ${totalSatsPerStudent.toLocaleString()} sats per student over 5 years (~£${Math.round(projectedGbpPerStudent)} at today's prices, could be significantly more)
- Likely pain points for a ${organisation_type} of this size in ${region || "the UK"}
- 3-5 personalisation hooks for the email
- Which ed-tech platforms they might currently use (ClassDojo, Dojo Points, Mathletics, Times Tables Rockstars, Sparx, Century Tech, etc.)
- Competitive advantages of SatsRewards over those platforms
- AI score (0-100) for likelihood of converting

Return as JSON:
{
  "pain_points": ["..."],
  "personalisation_hooks": ["..."],
  "competitor_platforms": ["..."],
  "competitive_advantages": ["..."],
  "cost_analysis": {
    "annual_saving_per_pupil": ${costSavingPerPupil},
    "total_annual_saving": ${totalAnnualSaving},
    "trust_annual_saving": ${trustAnnualSaving},
    "student_bitcoin_projection_sats": ${totalSatsPerStudent},
    "student_bitcoin_projection_gbp_today": ${Math.round(projectedGbpPerStudent)}
  },
  "ai_score": 0-100,
  "research_notes": "2-3 sentence summary of this prospect",
  "recommended_approach": "How to approach this specific contact"
}`;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, thinking: { type: "adaptive" }, messages: [{ role: "user", content: researchPrompt }] }),
        });
        const researchResult = resp.ok ? await resp.json() : null;
        const researchText = (researchResult?.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");

        let researchData: any = {};
        try {
          const jsonMatch = researchText.match(/\{[\s\S]*\}/);
          researchData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } catch (_) {}

        let prospectId: string | null = null;
        if (save_to_db) {
          const { data: inserted } = await supabase.from("outreach_prospects").insert({
            created_by: userId,
            organisation_name,
            organisation_type,
            website,
            region,
            pupil_count: pupil_count || 0,
            school_count,
            contact_name,
            contact_title,
            contact_email,
            stage: "researched",
            research_notes: researchData.research_notes ?? "",
            pain_points: researchData.pain_points ?? [],
            personalisation_hooks: researchData.personalisation_hooks ?? [],
            competitor_platforms: researchData.competitor_platforms ?? [],
            ai_score: researchData.ai_score ?? 50,
          }).select("id").single();
          prospectId = inserted?.id ?? null;
        }

        return JSON.stringify({ ...researchData, prospect_id: prospectId, saved: save_to_db });
      }

      case "draft_outreach_email": {
        const {
          prospect_id, organisation_name, contact_name, contact_title = "Headteacher",
          contact_email, pupil_count = 200, school_count = 1, email_type = "initial",
          tone = "professional", personalisation_focus = "", competitor_platforms = "",
          save_to_db = false, conversation_id,
        } = toolInput;

        // Fetch prospect data if ID provided
        let prospectData: any = {};
        if (prospect_id) {
          const { data: p } = await supabase.from("outreach_prospects").select("*").eq("id", prospect_id).maybeSingle();
          if (p) prospectData = p;
        }

        const orgName = prospectData.organisation_name || organisation_name || "your school";
        const recipientName = prospectData.contact_name || contact_name || "Headteacher";
        const recipientTitle = prospectData.contact_title || contact_title;
        const pupils = prospectData.pupil_count || pupil_count;
        const schools = prospectData.school_count || school_count;
        const competitors = competitor_platforms || (prospectData.competitor_platforms ?? []).join(", ") || "ClassDojo, Mathletics, or similar platforms";
        const hooks = (prospectData.personalisation_hooks ?? []).join("\n- ") || personalisation_focus;

        // Cost calculations
        const annualSaving = pupils * 12 * schools;
        const monthlyEarnings = 1000; // sats per student/month
        const fiveYearSats = monthlyEarnings * 12 * 5;
        const fiveYearGbp = Math.round((fiveYearSats / 100000000) * 40000);

        const emailPrompts: Record<string, string> = {
          initial: `Write a compelling cold outreach email to ${recipientName} (${recipientTitle}) at ${orgName} about adopting SatsRewards — a Bitcoin rewards platform for schools.

Tone: ${tone}
Personalisation focus: ${hooks || personalisation_focus || "cost savings and student financial futures"}

Key facts to weave in naturally:
- SatsRewards costs £${(6 * pupils / 12).toFixed(0)}/month vs ${competitors} at ~£${(18 * pupils / 12).toFixed(0)}/month — saving £${(annualSaving).toLocaleString()}/year
- Students earn Bitcoin (sats) for learning, building real savings: ~${fiveYearSats.toLocaleString()} sats over 5 school years (worth ~£${fiveYearGbp} today at current BTC prices — potentially much more)
- No lock-in, free trial, compliant with UK ed-tech regulations
- The money saved from competitor platforms could fund the Bitcoin rewards themselves

Format: Subject line first, then email body. Under 250 words. Clear single CTA (15-min call).`,

          follow_up_1: `Write a follow-up email (no response to initial outreach) to ${recipientName} at ${orgName}.
Tone: ${tone}. Brief (under 150 words). Reference the previous email. Add one new angle: focus on the Bitcoin savings aspect — students who start earning sats in school could have meaningful Bitcoin savings by university age. Include a different, lower-friction CTA (e.g. "Would a 2-page PDF case study be useful?"). Subject line first.`,

          follow_up_2: `Write a second follow-up email to ${recipientName} at ${orgName}. Still no response.
Tone: warm and direct. Under 120 words. Lead with social proof ("Other headteachers in ${prospectData.region || "your region"} have found..."). Mention urgency: term-start timing window. Subject line first.`,

          breakup: `Write a polite "breakup" email to ${recipientName} at ${orgName}. They haven't responded to 3 emails.
Keep the door open. Under 100 words. Friendly, not desperate. Leave a hook in case they're ready in future. Subject line first.`,

          case_study: `Write a case study email to ${recipientName} at ${orgName}.
Highlight: a similar-sized school using SatsRewards, student engagement metrics, cost savings achieved, and what headteachers said. Keep it under 200 words. Include a quote (you can make one up from "a London headteacher"). Subject line first.`,

          custom: `Write a personalised email to ${recipientName} at ${orgName}.
Focus: ${personalisation_focus || "the overall value of SatsRewards"}
Tone: ${tone}. Under 200 words. Subject line first.`,
        };

        // anthropicKey provided via function parameter
        const prompt = emailPrompts[email_type] || emailPrompts.initial;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 1500, thinking: { type: "adaptive" }, messages: [{ role: "user", content: prompt }] }),
        });

        if (!resp.ok) return JSON.stringify({ error: "Email drafting failed" });
        const result = await resp.json();
        const emailText = (result.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();

        // Parse subject from first line
        const lines = emailText.split("\n").filter((l: string) => l.trim());
        let subject = "";
        let body = emailText;
        if (lines[0]?.toLowerCase().startsWith("subject:")) {
          subject = lines[0].replace(/^subject:\s*/i, "").trim();
          body = lines.slice(1).join("\n").trim();
        } else if (lines[0]) {
          subject = lines[0].trim();
          body = lines.slice(1).join("\n").trim();
        }

        let emailId: string | null = null;
        if (save_to_db && (prospect_id || prospectData.id)) {
          const { data: inserted } = await supabase.from("outreach_emails").insert({
            prospect_id: prospect_id || prospectData.id,
            created_by: userId,
            conversation_id: conversation_id ?? null,
            subject,
            body,
            email_type,
            status: "draft",
            ai_generated: true,
            tone,
          }).select("id").single();
          emailId = inserted?.id ?? null;
        }

        return JSON.stringify({ subject, body, email_type, email_id: emailId, saved: save_to_db, to: prospectData.contact_email || contact_email });
      }

      case "send_outreach_email": {
        const { email_id, prospect_id, to_email, subject, body_html, body_text } = toolInput;

        let finalTo = to_email;
        let finalSubject = subject;
        let finalBody = body_text;
        let finalHtml = body_html;

        // Load from DB if email_id provided
        if (email_id) {
          const { data: email } = await supabase.from("outreach_emails").select("*, outreach_prospects(contact_email)").eq("id", email_id).maybeSingle();
          if (!email) return JSON.stringify({ error: "Email draft not found" });
          finalTo = to_email || email.outreach_prospects?.contact_email;
          finalSubject = subject || email.subject;
          finalBody = body_text || email.body;
        }

        if (!finalTo) return JSON.stringify({ error: "No recipient email found" });

        // Convert plain body to simple HTML if no HTML provided
        if (!finalHtml && finalBody) {
          finalHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">${
            finalBody.split("\n\n").map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")
          }</div>`;
        }

        // Call send-email function
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const sendResp = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ to: finalTo, subject: finalSubject, html: finalHtml, text: finalBody, email_id, prospect_id }),
        });

        const sendResult = sendResp.ok ? await sendResp.json() : { error: "Send failed" };
        return JSON.stringify(sendResult);
      }

      case "log_prospect_response": {
        const { prospect_id, email_id, response_type, content, update_stage } = toolInput;

        // AI analysis of the response
        // anthropicKey provided via function parameter
        const analysisPrompt = `Analyse this response from a school headteacher/CEO to a SatsRewards outreach email:

"${content}"

Return JSON only:
{
  "sentiment": "positive|negative|neutral|interested|objection",
  "key_objections": ["..."],
  "expressed_interests": ["..."],
  "requested_info": ["..."],
  "follow_up_required": true|false,
  "follow_up_days": 3,
  "ai_summary": "One sentence summary",
  "recommended_next_action": "What to do next"
}`;

        const resp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 800, messages: [{ role: "user", content: analysisPrompt }] }),
        });

        let analysis: any = { sentiment: "neutral", follow_up_required: true };
        if (resp.ok) {
          const r = await resp.json();
          const text = (r.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          try {
            const m = text.match(/\{[\s\S]*\}/);
            analysis = m ? JSON.parse(m[0]) : analysis;
          } catch (_) {}
        }

        // Save response
        const { data: responseRecord } = await supabase.from("outreach_responses").insert({
          prospect_id,
          email_id: email_id ?? null,
          created_by: userId,
          response_type,
          content,
          sentiment: analysis.sentiment,
          key_objections: analysis.key_objections ?? [],
          expressed_interests: analysis.expressed_interests ?? [],
          requested_info: analysis.requested_info ?? [],
          follow_up_required: analysis.follow_up_required ?? true,
          ai_summary: analysis.ai_summary ?? "",
        }).select("id").single();

        // Update prospect
        const updates: any = {
          reply_sentiment: analysis.sentiment,
          updated_at: new Date().toISOString(),
        };
        if (update_stage) updates.stage = update_stage;
        else if (analysis.sentiment === "positive" || analysis.sentiment === "interested") updates.stage = "replied";
        else if (analysis.sentiment === "negative") updates.stage = "dormant";
        else updates.stage = "replied";

        if (analysis.follow_up_days) {
          updates.next_follow_up_at = new Date(Date.now() + analysis.follow_up_days * 86400000).toISOString();
        }

        await supabase.from("outreach_prospects").update(updates).eq("id", prospect_id);

        return JSON.stringify({ success: true, analysis, response_id: responseRecord?.id, recommended_next_action: analysis.recommended_next_action });
      }

      case "get_outreach_pipeline": {
        const { stage, campaign_id, limit = 20, include_emails = false } = toolInput;

        let query = supabase.from("outreach_prospects")
          .select("*")
          .eq("created_by", userId)
          .order("updated_at", { ascending: false })
          .limit(Math.min(limit, 100));

        if (stage) query = query.eq("stage", stage);
        if (campaign_id) query = query.eq("campaign_id", campaign_id);

        const { data: prospects } = await query;

        let result: any[] = prospects ?? [];

        if (include_emails && result.length > 0) {
          const ids = result.map((p: any) => p.id);
          const { data: emails } = await supabase.from("outreach_emails")
            .select("id, prospect_id, subject, email_type, status, sent_at, created_at")
            .in("prospect_id", ids)
            .order("created_at", { ascending: false });

          const emailsByProspect: Record<string, any[]> = {};
          for (const e of emails ?? []) {
            if (!emailsByProspect[e.prospect_id]) emailsByProspect[e.prospect_id] = [];
            emailsByProspect[e.prospect_id].push(e);
          }
          result = result.map((p: any) => ({ ...p, emails: emailsByProspect[p.id] ?? [] }));
        }

        const stageCounts: Record<string, number> = {};
        for (const p of result) {
          stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;
        }

        return JSON.stringify({ prospects: result, total: result.length, stage_summary: stageCounts });
      }

      case "analyse_outreach_performance": {
        const { campaign_id, time_range_days = 90 } = toolInput;
        const since = new Date(Date.now() - time_range_days * 86400000).toISOString();

        let prospectQuery = supabase.from("outreach_prospects").select("stage, ai_score, reply_sentiment, created_at").eq("created_by", userId).gte("created_at", since);
        let emailQuery = supabase.from("outreach_emails").select("status, email_type, sent_at, created_at").eq("created_by", userId).gte("created_at", since);
        let responseQuery = supabase.from("outreach_responses").select("sentiment, key_objections, expressed_interests, created_at").eq("created_by", userId).gte("received_at", since);

        if (campaign_id) {
          prospectQuery = prospectQuery.eq("campaign_id", campaign_id);
        }

        const [prospectsRes, emailsRes, responsesRes] = await Promise.all([prospectQuery, emailQuery, responseQuery]);

        const prospects = prospectsRes.data ?? [];
        const emails = emailsRes.data ?? [];
        const responses = responsesRes.data ?? [];

        const sent = emails.filter((e: any) => e.status === "sent").length;
        const opened = emails.filter((e: any) => ["opened", "replied"].includes(e.status)).length;
        const replied = responses.length;
        const converted = prospects.filter((p: any) => p.stage === "converted").length;
        const meetings = prospects.filter((p: any) => ["meeting_booked", "demo_given", "converted"].includes(p.stage)).length;

        const allObjections = responses.flatMap((r: any) => r.key_objections ?? []);
        const objectionCounts: Record<string, number> = {};
        for (const o of allObjections) objectionCounts[o] = (objectionCounts[o] ?? 0) + 1;
        const topObjections = Object.entries(objectionCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([o, c]) => ({ objection: o, count: c }));

        return JSON.stringify({
          period_days: time_range_days,
          prospects: { total: prospects.length, converted, meetings, in_pipeline: prospects.filter((p: any) => !["converted", "declined", "dormant"].includes(p.stage)).length },
          emails: { total: emails.length, sent, opened, open_rate_percent: sent ? Math.round((opened / sent) * 100) : 0 },
          responses: { total: replied, reply_rate_percent: sent ? Math.round((replied / sent) * 100) : 0, positive: responses.filter((r: any) => ["positive", "interested"].includes(r.sentiment)).length },
          conversions: { rate_percent: prospects.length ? Math.round((converted / prospects.length) * 100) : 0 },
          top_objections: topObjections,
        });
      }

      case "create_outreach_campaign": {
        const { name, description = "", target_region = "", target_org_types = ["school", "trust"], target_prospect_count = 50, target_conversion_count = 3 } = toolInput;
        const { data, error } = await supabase.from("outreach_campaigns").insert({
          created_by: userId, name, description, target_region, target_org_types, target_prospect_count, target_conversion_count,
        }).select().single();
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ success: true, campaign: data });
      }

      // ── Web discovery tools ────────────────────────────────────────────────────

      case "search_web": {
        const { query, search_depth = "basic", max_results = 5, include_domains } = toolInput;
        const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? "";

        if (!tavilyKey) {
          // Fallback: use Claude's built-in knowledge about UK schools
          return JSON.stringify({
            note: "Web search API not configured — returning knowledge-based results",
            results: [],
            suggestion: "Use research_prospect with known school names, or ask the user to provide specific school details.",
          });
        }

        const payload: any = {
          api_key: tavilyKey,
          query,
          search_depth,
          max_results: Math.min(max_results, 10),
          include_answer: true,
        };
        if (include_domains?.length) payload.include_domains = include_domains;

        const resp = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          return JSON.stringify({ error: `Search failed: ${resp.status}`, detail: errText });
        }

        const data = await resp.json();
        const results = (data.results ?? []).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content?.substring(0, 500),
          score: r.score,
        }));

        return JSON.stringify({
          query,
          answer: data.answer ?? null,
          results,
          total: results.length,
        });
      }

      case "fetch_webpage": {
        const { url, extract_focus = "contact details" } = toolInput;
        const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? "";

        if (!tavilyKey) {
          return JSON.stringify({ error: "Web fetch requires TAVILY_API_KEY to be configured" });
        }

        // Use Tavily extract endpoint
        const resp = await fetch("https://api.tavily.com/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: tavilyKey, urls: [url] }),
        });

        if (!resp.ok) {
          return JSON.stringify({ error: `Fetch failed: ${resp.status}` });
        }

        const data = await resp.json();
        const result = data.results?.[0];
        if (!result) return JSON.stringify({ error: "No content extracted from URL" });

        // Ask Claude to extract the specific info we need
        // anthropicKey provided via function parameter
        const extractResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 1000,
            messages: [{
              role: "user",
              content: `From this webpage content, extract: ${extract_focus}\n\nURL: ${url}\n\nContent:\n${result.raw_content?.substring(0, 3000) ?? result.text?.substring(0, 3000) ?? "No content"}\n\nReturn as JSON with relevant fields found. If not found, return null for that field.`,
            }],
          }),
        });

        let extracted: any = { url, raw_snippet: result.raw_content?.substring(0, 500) };
        if (extractResp.ok) {
          const extractResult = await extractResp.json();
          const text = (extractResult.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          try {
            const m = text.match(/\{[\s\S]*\}/);
            if (m) extracted = { ...extracted, ...JSON.parse(m[0]) };
          } catch (_) {
            extracted.text_summary = text.substring(0, 500);
          }
        }

        return JSON.stringify(extracted);
      }

      case "check_and_process_inbox": {
        const { auto_reply = true, limit = 10 } = toolInput;
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Get unprocessed responses
        const { data: responses } = await supabase
          .from("outreach_responses")
          .select("*, outreach_prospects(*), outreach_emails(*)")
          .eq("created_by", userId)
          .eq("processed", false)
          .order("created_at", { ascending: true })
          .limit(Math.min(limit, 20));

        if (!responses?.length) return JSON.stringify({ message: "Inbox clear — no unprocessed replies.", processed: 0 });

        const processed: any[] = [];

        for (const resp of responses) {
          try {
            const prospect = resp.outreach_prospects;
            if (!prospect) continue;

            // Analyse if not already done
            let sentiment = resp.sentiment || "neutral";
            let nextAction = "follow_up_1";
            if (sentiment === "positive" || sentiment === "interested") nextAction = "follow_up_custom";
            else if (sentiment === "negative") nextAction = "breakup";

            // Count existing emails to determine sequence stage
            const { count: emailsSent } = await supabase
              .from("outreach_emails")
              .select("id", { count: "exact", head: true })
              .eq("prospect_id", prospect.id)
              .eq("status", "sent");

            const sequenceStage = (emailsSent ?? 1) >= 3 ? "breakup" : (emailsSent ?? 1) >= 2 ? "follow_up_2" : "follow_up_1";
            if (sentiment === "neutral" || sentiment === "auto_reply") nextAction = sequenceStage;

            if (auto_reply && prospect.contact_email) {
              // Draft follow-up using Claude
              const followUpPrompt = `Write a ${nextAction === "follow_up_custom" ? "warm, enthusiastic follow-up" : nextAction === "breakup" ? "polite closing" : "concise follow-up"} email to ${prospect.contact_name || "the headteacher"} at ${prospect.organisation_name}.

Context: They ${sentiment === "positive" || sentiment === "interested" ? "replied positively showing interest" : sentiment === "negative" ? "declined or indicated not interested" : "haven't replied to our previous email"}.
Their reply/context: "${resp.content?.substring(0, 200) || "No response received"}"

SatsRewards: Bitcoin rewards platform for schools. Students earn sats for learning.
Under 150 words. Subject: on first line. Warm but brief.`;

              const fr = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 600, messages: [{ role: "user", content: followUpPrompt }] }),
              });

              let followSubject = "Following up — SatsRewards";
              let followBody = "";
              if (fr.ok) {
                const fResult = await fr.json();
                const fText = (fResult.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
                const lines = fText.split("\n").filter((l: string) => l.trim());
                if (lines[0]?.toLowerCase().startsWith("subject:")) {
                  followSubject = lines[0].replace(/^subject:\s*/i, "").trim();
                  followBody = lines.slice(1).join("\n").trim();
                } else {
                  followBody = fText;
                }
              }

              if (followBody) {
                const { data: emailSaved } = await supabase.from("outreach_emails").insert({
                  prospect_id: prospect.id,
                  created_by: userId,
                  subject: followSubject,
                  body: followBody,
                  email_type: nextAction === "follow_up_custom" ? "follow_up_1" : nextAction,
                  status: "draft",
                  ai_generated: true,
                }).select("id").single();

                if (emailSaved?.id) {
                  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">${followBody.split("\n\n").map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
                  const sr = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ to: prospect.contact_email, subject: followSubject, html, text: followBody, email_id: emailSaved.id, prospect_id: prospect.id }),
                  });
                  const sendOk = sr.ok;
                  processed.push({ prospect: prospect.organisation_name, action: nextAction, sent: sendOk });
                }
              }
            }

            // Mark response as processed
            await supabase.from("outreach_responses").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", resp.id);

          } catch (err: any) {
            processed.push({ prospect: resp.outreach_prospects?.organisation_name, error: err.message });
          }
        }

        return JSON.stringify({ processed: processed.length, actions: processed });
      }

      case "run_follow_up_sweep": {
        const { dry_run = false, max_sends = 15 } = toolInput;
        const now = new Date().toISOString();
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

        // Find prospects overdue for follow-up
        const { data: overdue } = await supabase
          .from("outreach_prospects")
          .select("*")
          .eq("created_by", userId)
          .in("stage", ["emailed", "researched"])
          .lt("next_follow_up_at", now)
          .not("contact_email", "is", null)
          .order("next_follow_up_at", { ascending: true })
          .limit(Math.min(max_sends, 30));

        if (!overdue?.length) return JSON.stringify({ message: "No overdue follow-ups.", swept: 0 });

        const results: any[] = [];

        for (const prospect of overdue) {
          try {
            const { count: emailsSent } = await supabase
              .from("outreach_emails")
              .select("id", { count: "exact", head: true })
              .eq("prospect_id", prospect.id)
              .eq("status", "sent");

            const count = emailsSent ?? 0;
            const emailType = count >= 3 ? "breakup" : count >= 2 ? "follow_up_2" : "follow_up_1";
            if (count >= 4) {
              await supabase.from("outreach_prospects").update({ stage: "dormant" }).eq("id", prospect.id);
              results.push({ prospect: prospect.organisation_name, action: "marked_dormant" });
              continue;
            }

            if (dry_run) {
              results.push({ prospect: prospect.organisation_name, would_send: emailType });
              continue;
            }

            const followUpPrompts: Record<string, string> = {
              follow_up_1: `Write a brief follow-up email to ${prospect.contact_name || "the headteacher"} at ${prospect.organisation_name}. No response to our initial email. Under 120 words. New angle: focus on student Bitcoin savings. Subject: on first line.`,
              follow_up_2: `Write a second follow-up to ${prospect.contact_name || "the headteacher"} at ${prospect.organisation_name}. Still no response. Under 100 words. Lead with social proof from other schools. Subject: on first line.`,
              breakup: `Write a polite closing email to ${prospect.contact_name || "the headteacher"} at ${prospect.organisation_name}. Friendly, leaves door open. Under 80 words. Subject: on first line.`,
            };

            const fr = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
              body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 500, messages: [{ role: "user", content: followUpPrompts[emailType] }] }),
            });

            if (!fr.ok) { results.push({ prospect: prospect.organisation_name, error: "Draft failed" }); continue; }

            const fResult = await fr.json();
            const fText = (fResult.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
            const lines = fText.split("\n").filter((l: string) => l.trim());
            const subject = lines[0]?.toLowerCase().startsWith("subject:") ? lines[0].replace(/^subject:\s*/i, "").trim() : lines[0]?.trim() || "Following up";
            const body = lines[1] ? lines.slice(lines[0]?.toLowerCase().startsWith("subject:") ? 1 : 0).join("\n").trim() : "";

            const { data: emailSaved } = await supabase.from("outreach_emails").insert({
              prospect_id: prospect.id,
              created_by: userId,
              subject,
              body,
              email_type: emailType,
              status: "draft",
              ai_generated: true,
            }).select("id").single();

            if (emailSaved?.id && prospect.contact_email) {
              const html = `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">${body.split("\n\n").map((p: string) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("")}</div>`;
              const sr = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ to: prospect.contact_email, subject, html, text: body, email_id: emailSaved.id, prospect_id: prospect.id }),
              });
              const sent = sr.ok;

              await supabase.from("outreach_prospects").update({
                next_follow_up_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                stage: emailType === "breakup" ? "dormant" : "emailed",
              }).eq("id", prospect.id);

              results.push({ prospect: prospect.organisation_name, sent_type: emailType, sent });
            }
          } catch (err: any) {
            results.push({ prospect: prospect.organisation_name, error: err.message });
          }
        }

        return JSON.stringify({ swept: results.length, results });
      }

      case "find_and_outreach_schools": {
        const {
          target_type = "secondary_school",
          region = "UK",
          count = 5,
          auto_send = false,
          campaign_id,
          extra_criteria = "",
        } = toolInput;

        // anthropicKey provided via function parameter
        const tavilyKey = Deno.env.get("TAVILY_API_KEY") ?? "";
        const safeCount = Math.min(count, 20);

        const results: any[] = [];
        const errors: string[] = [];

        // Build targeted search queries — adapted for each market
        const typeLabel = target_type === "multi_academy_trust" ? "multi academy trust" :
          target_type === "academy_trust" ? "academy trust" :
          target_type === "secondary_school" ? "secondary school" :
          target_type === "primary_school" ? "primary school" :
          target_type === "private_school" ? "private school" :
          target_type === "international_school" ? "international school" :
          target_type === "charter_school" ? "charter school" : "school";

        const isUKRegion = ["London","Manchester","Birmingham","Yorkshire","Bristol","Edinburgh","Cardiff","Leeds","Liverpool","Sheffield","nationwide"].includes(region);
        const isUSARegion = ["New York","Los Angeles","Chicago","Houston","Miami","San Francisco","Boston","Seattle","Washington DC","Atlanta"].includes(region);
        const regionLabel = region === "nationwide" ? "UK" : region;
        const emailDomainHint = isUKRegion ? "firstname.lastname@school.sch.uk or info@, enquiries@, headteacher@" :
          isUSARegion ? "principal@ or info@ or admissions@" :
          "principal@ or info@ or admin@ or director@";
        const govSiteHint = isUKRegion
          ? "site:gov.uk OR site:academies.com OR site:compare-school-performance.service.gov.uk"
          : "site:greatschools.org OR site:schoolinfo.com OR site:niche.com";

        const queries = [
          `${typeLabel} ${regionLabel} principal headteacher CEO director contact email ${extra_criteria}`,
          `list of ${typeLabel}s in ${regionLabel} ${extra_criteria} ${govSiteHint}`,
          `${typeLabel} ${regionLabel} contact email admissions info ${extra_criteria}`,
        ];

        let searchResults: any[] = [];

        if (tavilyKey) {
          // Search with each query, collect unique results
          for (const q of queries.slice(0, 2)) {
            try {
              const resp = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: tavilyKey,
                  query: q,
                  search_depth: "advanced",
                  max_results: Math.ceil(safeCount / 2) + 3,
                  include_answer: true,
                }),
              });
              if (resp.ok) {
                const data = await resp.json();
                searchResults.push(...(data.results ?? []));
              }
            } catch (_) {}
          }
          // Deduplicate by domain
          const seen = new Set<string>();
          searchResults = searchResults.filter((r: any) => {
            try {
              const domain = new URL(r.url).hostname;
              if (seen.has(domain)) return false;
              seen.add(domain);
              return true;
            } catch (_) { return true; }
          });
        }

        // Ask Claude to parse the search results and identify real prospects
        const parsePrompt = `You are helping SatsRewards identify ${typeLabel}s in ${regionLabel} to contact about adopting our Bitcoin education and rewards platform.

${tavilyKey && searchResults.length > 0 ? `Here are web search results for "${typeLabel}s in ${regionLabel}":\n${JSON.stringify(searchResults.map((r: any) => ({ title: r.title, url: r.url, snippet: r.content?.substring(0, 300) })), null, 2)}` : `Generate a list of real ${typeLabel}s in ${regionLabel} based on your knowledge.`}

Extract or generate ${safeCount} unique ${typeLabel}s with as much detail as possible. For each, provide:
- organisation_name: Full official name
- organisation_type: one of school/trust/academy_trust/private_school/international_school/charter_school
- contact_title: Headteacher, Principal, Director, CEO, or Executive Principal as appropriate for their country
- contact_name: Real name if known, otherwise leave blank
- contact_email: Real email if found (try ${emailDomainHint}) — make reasonable guesses based on local school email conventions
- website: Official website URL
- region: The city/region/country (e.g. "${regionLabel}")
- pupil_count: Approximate number of students (0 if unknown)
- school_count: Number of schools in group (1 for single schools)
- extra_context: Any useful info (curriculum type, notable programmes, language of instruction, etc.)

Return ONLY a JSON array of ${safeCount} objects with these fields. No markdown, no explanation.`;

        const parseResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 4000,
            thinking: { type: "adaptive" },
            messages: [{ role: "user", content: parsePrompt }],
          }),
        });

        let prospects: any[] = [];
        if (parseResp.ok) {
          const parseResult = await parseResp.json();
          const text = (parseResult.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          try {
            const m = text.match(/\[[\s\S]*\]/);
            prospects = m ? JSON.parse(m[0]) : [];
          } catch (_) {
            errors.push("Failed to parse prospect list from AI response");
          }
        }

        // For each prospect: research, save, draft email, optionally send
        for (const p of prospects.slice(0, safeCount)) {
          try {
            if (!p.contact_email || !p.organisation_name) continue;

            // Check if already in DB
            const { data: existing } = await supabase
              .from("outreach_prospects")
              .select("id")
              .eq("created_by", userId)
              .ilike("organisation_name", p.organisation_name)
              .maybeSingle();

            if (existing) {
              results.push({ organisation: p.organisation_name, status: "already_exists", id: existing.id });
              continue;
            }

            // Cost calculations
            const pupils = p.pupil_count || 200;
            const schools = p.school_count || 1;
            const annualSaving = pupils * 12 * schools;
            const fiveYearSats = 1000 * 12 * 5;
            const fiveYearGbp = Math.round((fiveYearSats / 100000000) * 40000);

            // Quick AI research
            const researchResp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
              body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 800,
                messages: [{
                  role: "user",
                  content: `Quick research for SatsRewards outreach to ${p.organisation_name} (${p.organisation_type}, ${p.region}, ~${pupils} pupils).
Consider their local market context (country, education system, typical edtech platforms used in ${p.region}).
Return JSON: {"pain_points":["..."],"personalisation_hooks":["..."],"competitor_platforms":["..."],"ai_score":0-100,"research_notes":"one sentence","local_currency":"USD/GBP/EUR/AUD/NZD/SGD etc"}`,
                }],
              }),
            });

            let research: any = { pain_points: [], personalisation_hooks: [], competitor_platforms: [], ai_score: 60, research_notes: "" };
            if (researchResp.ok) {
              const rr = await researchResp.json();
              const rt = (rr.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
              try { const m = rt.match(/\{[\s\S]*\}/); if (m) research = { ...research, ...JSON.parse(m[0]) }; } catch (_) {}
            }

            // Save prospect
            const { data: saved } = await supabase.from("outreach_prospects").insert({
              created_by: userId,
              organisation_name: p.organisation_name,
              organisation_type: p.organisation_type || "school",
              website: p.website || "",
              region: p.region || region,
              pupil_count: pupils,
              school_count: schools,
              contact_name: p.contact_name || "",
              contact_title: p.contact_title || "Headteacher",
              contact_email: p.contact_email,
              stage: "researched",
              research_notes: research.research_notes,
              pain_points: research.pain_points,
              personalisation_hooks: research.personalisation_hooks,
              competitor_platforms: research.competitor_platforms,
              ai_score: research.ai_score,
              campaign_id: campaign_id || null,
            }).select("id").single();

            const prospectId = saved?.id;

            // Draft email — use local currency from research if available
            const localCurrency = research.local_currency || (isUKRegion ? "GBP" : isUSARegion ? "USD" : "USD");
            const currencySymbol = localCurrency === "GBP" ? "£" : localCurrency === "EUR" ? "€" : localCurrency === "AUD" ? "A$" : localCurrency === "NZD" ? "NZ$" : localCurrency === "SGD" ? "S$" : "$";
            const fxRate = localCurrency === "GBP" ? 1 : localCurrency === "EUR" ? 1.17 : localCurrency === "AUD" ? 1.95 : localCurrency === "NZD" ? 2.1 : localCurrency === "SGD" ? 1.7 : 1.27;
            const annualSavingLocal = Math.round(annualSaving * fxRate);
            const fiveYearValueLocal = Math.round(fiveYearGbp * fxRate);
            const contactTitle = p.contact_title || (isUKRegion ? "Headteacher" : "Principal");

            const elSalvadorNote = ["San Salvador","El Salvador"].includes(p.region || region)
              ? "\n- IMPORTANT: El Salvador has Bitcoin as legal tender since 2021 — this gives SatsRewards a unique local relevance angle. Students earning Bitcoin directly aligns with national policy."
              : "";

            const emailPrompt = `Write a compelling cold outreach email from SatsRewards to ${p.contact_name || contactTitle} at ${p.organisation_name} (located in ${p.region || region}).

Key facts to weave in naturally:
- SatsRewards costs ${currencySymbol}${Math.round(6 * pupils * fxRate / 12)}/month vs competitors at ~${currencySymbol}${Math.round(18 * pupils * fxRate / 12)}/month — saving ${currencySymbol}${annualSavingLocal.toLocaleString()}/year
- Students earn Bitcoin (sats) for learning: ~${fiveYearSats.toLocaleString()} sats over 5 years (~${currencySymbol}${fiveYearValueLocal} today, potentially much more as Bitcoin appreciates)
- Free trial, GDPR/privacy compliant, Lightning Network instant payments, works globally${elSalvadorNote}
- Competitor platforms they likely use: ${research.competitor_platforms.join(", ") || "ClassDojo, Google Classroom, Mathletics"}
- Personalisation hooks: ${research.personalisation_hooks.slice(0, 2).join("; ") || "financial literacy education, student engagement"}
- Use the appropriate greeting and tone for their country/culture

Tone: professional and warm. Under 200 words. Start with Subject: on first line.`;

            const emailResp = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
              body: JSON.stringify({
                model: CLAUDE_MODEL,
                max_tokens: 800,
                messages: [{ role: "user", content: emailPrompt }],
              }),
            });

            let emailId: string | null = null;
            let subject = "";
            let body = "";

            if (emailResp.ok) {
              const er = await emailResp.json();
              const emailText = (er.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
              const lines = emailText.split("\n").filter((l: string) => l.trim());
              if (lines[0]?.toLowerCase().startsWith("subject:")) {
                subject = lines[0].replace(/^subject:\s*/i, "").trim();
                body = lines.slice(1).join("\n").trim();
              } else {
                subject = lines[0]?.trim() || `Introducing SatsRewards to ${p.organisation_name}`;
                body = lines.slice(1).join("\n").trim();
              }

              if (prospectId) {
                const { data: emailSaved } = await supabase.from("outreach_emails").insert({
                  prospect_id: prospectId,
                  created_by: userId,
                  subject,
                  body,
                  email_type: "initial",
                  status: "draft",
                  ai_generated: true,
                  tone: "professional",
                }).select("id").single();
                emailId = emailSaved?.id ?? null;
              }
            }

            let sendResult: any = null;
            if (auto_send && emailId && p.contact_email) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
              const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
              const html = `<div style="font-family:Arial,sans-serif;max-width:600px;line-height:1.6;color:#333;">${
                body.split("\n\n").map((para: string) => `<p>${para.replace(/\n/g, "<br>")}</p>`).join("")
              }</div>`;
              const sr = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${serviceKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ to: p.contact_email, subject, html, text: body, email_id: emailId, prospect_id: prospectId }),
              });
              sendResult = sr.ok ? await sr.json() : { error: "Send failed" };
            }

            results.push({
              organisation: p.organisation_name,
              status: auto_send ? (sendResult?.success ? "researched_and_sent" : "researched_draft_failed_send") : "researched_and_drafted",
              prospect_id: prospectId,
              email_id: emailId,
              contact_email: p.contact_email,
              annual_saving_estimate: `£${annualSaving.toLocaleString()}`,
              ai_score: research.ai_score,
            });

          } catch (err: any) {
            errors.push(`${p.organisation_name}: ${err.message}`);
          }
        }

        return JSON.stringify({
          summary: `Found ${results.length} prospects for ${typeLabel}s in ${region}`,
          auto_send,
          results,
          errors: errors.length ? errors : undefined,
          next_steps: auto_send
            ? "Emails sent! Monitor replies in the Outreach panel and use log_prospect_response to track responses."
            : `${results.length} prospects researched and draft emails saved. Review in the Outreach panel, then use send_outreach_email to send them.`,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (err: any) {
    console.error(`Tool error (${toolName}):`, err);
    return JSON.stringify({ error: err.message ?? "Tool execution failed" });
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read Anthropic key — prefer env var, fall back to vault via RPC
    let anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    if (!anthropicKey) {
      const { data: vr } = await supabase.rpc("get_secret", { secret_name: "ANTHROPIC_API_KEY" });
      anthropicKey = vr ?? "";
    }

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth — accept anonymous/demo mode (use stable UUID so DB inserts work)
    let userId = "81bf3854-37ae-44ca-8872-471f7a54348b";
    let profile: any = { role: "admin", name: "Demo Admin", school_id: null };

    const authHeader = req.headers.get("Authorization");
    const adminIdOverride = req.headers.get("x-admin-id-override");

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");

      // If caller presents the service key and an admin override, trust it (used by cron scheduler)
      if (adminIdOverride && token === supabaseServiceKey) {
        userId = adminIdOverride;
        const { data: p } = await supabase.from("profiles").select("role, name, school_id").eq("id", adminIdOverride).maybeSingle();
        if (p) profile = p;
      } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
          const { data: p } = await supabase.from("profiles").select("role, name, school_id").eq("id", user.id).maybeSingle();
          if (p) profile = p;
          if (!["admin", "teacher"].includes(profile.role)) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/admin-agent/, "");

    if (req.method === "GET" && path === "/memory") {
      const { data: memories } = await supabase.from("ai_agent_memory").select("*").eq("admin_id", userId).order("updated_at", { ascending: false });
      return new Response(JSON.stringify({ memories: memories ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "GET" && path === "/conversations") {
      const { data: convs } = await supabase.from("ai_agent_conversations").select("id, title, created_at, updated_at").eq("admin_id", userId).order("updated_at", { ascending: false }).limit(20);
      return new Response(JSON.stringify({ conversations: convs ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "GET" && path.startsWith("/conversations/")) {
      const convId = path.replace("/conversations/", "");
      const { data: msgs } = await supabase.from("ai_agent_messages").select("id, role, content, metadata, created_at").eq("conversation_id", convId).order("created_at", { ascending: true });
      return new Response(JSON.stringify({ messages: msgs ?? [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "GET" && path === "/outreach/pipeline") {
      const { data: prospects } = await supabase.from("outreach_prospects").select("*").eq("created_by", userId).order("updated_at", { ascending: false }).limit(50);
      const stageCounts: Record<string, number> = {};
      for (const p of prospects ?? []) stageCounts[p.stage] = (stageCounts[p.stage] ?? 0) + 1;
      return new Response(JSON.stringify({ prospects: prospects ?? [], stage_summary: stageCounts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (req.method === "POST" && path === "/chat") {
      const body = await req.json();
      const { message, conversation_id } = body;

      if (!message) {
        return new Response(JSON.stringify({ error: "message is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let convId = conversation_id;
      if (!convId) {
        const { data: conv } = await supabase.from("ai_agent_conversations").insert({ admin_id: userId, title: message.substring(0, 60) }).select("id").single();
        convId = conv?.id;
      }

      const { data: history } = await supabase.from("ai_agent_messages").select("role, content").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(30);
      const { data: memories } = await supabase.from("ai_agent_memory").select("memory_key, memory_value, category").eq("admin_id", userId).order("updated_at", { ascending: false }).limit(50);

      // Outreach pipeline snapshot
      let outreachSnapshot = "";
      const { data: pipelineSnap } = await supabase.from("outreach_prospects").select("stage").eq("created_by", userId);
      if (pipelineSnap && pipelineSnap.length > 0) {
        const counts: Record<string, number> = {};
        for (const p of pipelineSnap) counts[p.stage] = (counts[p.stage] ?? 0) + 1;
        outreachSnapshot = `\nOUTREACH PIPELINE: ${pipelineSnap.length} prospects | ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(", ")}`;
      }

      let schoolSnapshot = "";
      if (profile.school_id) {
        const [schoolRes, studentCount, teacherCount] = await Promise.all([
          supabase.from("schools").select("name, subscription_tier, compliance_status, wallet_address").eq("id", profile.school_id).maybeSingle(),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).eq("role", "student"),
          supabase.from("profiles").select("id", { count: "exact", head: true }).eq("school_id", profile.school_id).eq("role", "teacher"),
        ]);
        schoolSnapshot = `\nSCHOOL: ${schoolRes.data?.name ?? "Unknown"} | Plan: ${schoolRes.data?.subscription_tier ?? "free"} | Students: ${studentCount.count ?? 0} | Teachers: ${teacherCount.count ?? 0} | KYC: ${schoolRes.data?.compliance_status?.kyc_verified ? "✓" : "✗"}`;
      }

      const memorySection = memories?.length
        ? `\nMEMORY:\n${memories.map((m: any) => `• [${m.category}] ${m.memory_key}: ${m.memory_value}`).join("\n")}`
        : "";

      const systemPrompt = `You are SATSBOT — an elite autonomous AI agent embedded in the SatsRewards admin dashboard. SatsRewards is a Bitcoin education and rewards platform for schools globally. Students earn real sats (Bitcoin) for learning, quizzes, and good behaviour.

## Core identity
You operate like a senior growth executive and platform manager — proactive, data-driven, and always improving. You never wait passively for instructions when there is work to be done. When asked to run a task, you execute it fully using tools and report back with real data, not guesses.

## Your two operating modes

### 1. Platform Manager
Manage the live school platform on behalf of the admin:
- Query and update live data: students, teachers, wallets, quizzes, rewards, announcements, transactions
- Diagnose platform issues by checking DB consistency, wallet balances, compliance status
- Generate educational content (quiz questions, lesson plans, Bitcoin explainers)
- Run analytics and surface actionable insights

### 2. Autonomous Growth Agent
Drive school adoption worldwide — this is your most important function:
- **Find** secondary schools and private schools globally using web search
- **Research** each school: leadership contacts, pupil numbers, budget context, likely pain points
- **Draft** highly personalised cold emails adapted to local culture, currency, and education system
- **Send** emails directly without waiting for approval (when auto_send=true or asked to "send")
- **Track** replies: analyse sentiment, update pipeline stage, schedule follow-ups
- **Follow up** automatically: run_follow_up_sweep every Monday after the initial batch
- **Process inbox**: use check_and_process_inbox to handle replies and send appropriate responses
- **Learn**: save insights to memory after every interaction — what objections arise, what messaging converts, which regions respond best

## Growth strategy and target markets
Priority: **secondary schools and private schools worldwide**. Do NOT target primary schools unless specifically asked.

| Region | Target type | Key angle |
|--------|-------------|-----------|
| 🇬🇧 UK (London, Manchester, Birmingham, etc.) | Secondary schools, private schools | Cost savings vs ClassDojo/Sparx, Ofsted-aligned financial literacy |
| 🇺🇸 USA (NY, LA, Chicago, Miami, etc.) | Private schools, charter schools | College readiness, financial literacy mandate, Bitcoin savings |
| 🇸🇻 El Salvador | All secondary schools | **Bitcoin is legal tender** since 2021 — SatsRewards is aligned with national policy |
| 🌏 Asia (Singapore, HK, Tokyo, Dubai, etc.) | International schools, private schools | Global Bitcoin adoption, international curriculum, premium parents |
| 🇦🇺 Australia / 🇳🇿 New Zealand | Private schools, independent schools | Financial literacy curriculum, strong edtech adoption |
| 🇪🇺 Europe (Amsterdam, Berlin, Paris, etc.) | International schools, private schools | GDPR-compliant, EU Bitcoin interest, multilingual |
| 🌍 Middle East (Dubai, Riyadh, Doha, etc.) | International schools, private schools | High-income families, Bitcoin adoption growing, English curriculum |
| 🌍 Africa / Rest of world | International schools | Global Bitcoin financial literacy, remittance relevance |

## Outreach value proposition (adapt per market)
- **School savings**: SatsRewards ~£6/pupil/year vs competitors (ClassDojo, Mathletics, Sparx, Seesaw, Google Classroom) at ~£18/pupil/year → £12/pupil/year saved
  - 500-pupil school: £6,000/year saved | 1,000 pupils: £12,000/year | 3,000-pupil trust: £36,000/year
- **Student financial future**: students earn ~1,000 sats/month → 60,000 sats over 5 school years → ~£240 today at current BTC prices, potentially thousands as Bitcoin appreciates
- **Global benefits**: no lock-in, free trial, privacy compliant (GDPR/COPPA/local laws), Lightning Network for instant global micro-payments
- **El Salvador**: Bitcoin legal tender since 2021 — SatsRewards directly supports the Chivo ecosystem and national Bitcoin curriculum

## Email craft rules
- Warm, specific, credible — never generic sales copy
- **Subject line**: curiosity-driven and named (e.g. "Could St Mary's save £8,400 this year, ${profile.name}?")
- **Opening**: reference something specific about their school — region, size, likely platforms they use
- **Body**: school budget saving FIRST, then student Bitcoin future SECOND
- **CTA**: low friction — "15-minute call this week?" or "Shall I send over a one-page case study?"
- **Currency**: always use local currency (£ UK, $ USA/AUS, € Europe, ¥ Japan, etc.)
- **Tone**: match the country's professional norms (formal Japan/UAE, warm UK/NZ, direct USA)
- **Length**: under 200 words for initial emails, under 120 for follow-ups

## Autonomous operating principles
1. **Always check memory first** before acting — use past learnings to sharpen current approach
2. **Pull live data before answering** — query the pipeline, not your training knowledge
3. **Complete tasks end-to-end** — don't stop at "here's what I'd do"; do it
4. **Save learnings after every meaningful action** — objections heard, regions that convert, messaging that lands
5. **Keep the pipeline moving** — if prospects are overdue for follow-up, run the sweep without being asked
6. **Report results with numbers** — always end with "Sent X emails, Y prospects added, Z follow-ups scheduled"

Admin: ${profile.name} (${profile.role})${schoolSnapshot}${outreachSnapshot}${memorySection}

Current date: ${new Date().toISOString().split("T")[0]}
Today is ${new Date().toLocaleDateString("en-GB", { weekday: "long" })}.`;

      const chatMessages: Array<{ role: string; content: any }> = [
        ...(history ?? []).map((m: any) => ({ role: m.role, content: m.content })),
        { role: "user", content: message },
      ];

      let iterations = 0;
      let finalReply = "";

      while (iterations < MAX_TOOL_ITERATIONS) {
        iterations++;

        const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": anthropicKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: CLAUDE_MODEL,
            max_tokens: 4096,
            thinking: { type: "adaptive" },
            system: systemPrompt,
            tools: TOOLS,
            messages: chatMessages,
          }),
        });

        if (!apiResponse.ok) {
          console.error("Claude API error:", await apiResponse.text());
          finalReply = "I encountered an error connecting to Claude. Please try again.";
          break;
        }

        const result = await apiResponse.json();
        const stopReason = result.stop_reason;
        const responseContent = result.content ?? [];

        chatMessages.push({ role: "assistant", content: responseContent });

        if (stopReason === "end_turn" || stopReason === "stop_sequence") {
          finalReply = responseContent.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
          break;
        }

        if (stopReason === "tool_use") {
          const toolUseBlocks = responseContent.filter((b: any) => b.type === "tool_use");
          const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];

          for (const toolCall of toolUseBlocks) {
            console.log(`Tool: ${toolCall.name}`);
            const toolResult = await executeTool(toolCall.name, toolCall.input, supabase, userId, profile, anthropicKey);
            toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: toolResult });
          }

          chatMessages.push({ role: "user", content: toolResults });
          continue;
        }

        finalReply = responseContent.filter((b: any) => b.type === "text").map((b: any) => b.text).join("") || "Something went wrong. Please try again.";
        break;
      }

      if (!finalReply) finalReply = "I reached the maximum number of tool iterations. Try a more specific question.";

      await supabase.from("ai_agent_messages").insert([
        { conversation_id: convId, role: "user", content: message },
        { conversation_id: convId, role: "assistant", content: finalReply },
      ]);
      await supabase.from("ai_agent_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

      return new Response(JSON.stringify({ reply: finalReply, conversation_id: convId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("admin-agent error:", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
