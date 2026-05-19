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
    const fromEmail = Deno.env.get("OUTREACH_FROM_EMAIL") ?? "reginald@satsrewards.co.uk";
    const fromName = Deno.env.get("OUTREACH_FROM_NAME") ?? "Reginald Orme";
    const replyTo = Deno.env.get("OUTREACH_REPLY_TO") ?? "regorme101@gmail.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read Resend key — prefer env var, fall back to vault
    let resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    if (!resendKey) {
      const { data: vaultRow } = await supabase.rpc("get_secret", { secret_name: "RESEND_API_KEY" });
      resendKey = vaultRow ?? "";
    }

    // Auth check
    const authHeader = req.headers.get("Authorization");
    let userId = "demo-user";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    const body = await req.json();
    const { to, subject, html, text, email_id, prospect_id, preview_only = false } = body;

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: "to, subject, and html or text are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Always enforce correct sign-off — strips any AI-generated name and replaces with real one
    const signoff = `\n\nKind regards,\n\nReginald Orme\nFounder, SatsRewards\nreginald@satsrewards.co.uk\nwww.satsrewards.co.uk`;
    let finalText = text ?? "";
    let finalHtml = html ?? "";

    if (finalText && !finalText.includes("Reginald Orme")) {
      // Strip anything after the last paragraph that looks like a sign-off
      finalText = finalText.replace(/\n\n(Kind regards|Best regards|Regards|Yours sincerely|Best wishes|Warm regards|Many thanks)[^\0]*$/i, "").trimEnd() + signoff;
    }
    if (finalHtml && !finalHtml.includes("Reginald Orme")) {
      const htmlSignoff = signoff.replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>");
      finalHtml = finalHtml.replace(/(<br\/>){2}(Kind regards|Best regards|Regards|Yours sincerely|Best wishes|Warm regards|Many thanks)[^\0]*$/i, "").trimEnd() + `<br/><br/>${htmlSignoff}`;
    }

    // In preview_only mode, just return what would be sent without sending
    if (preview_only) {
      return new Response(
        JSON.stringify({ preview: true, to, subject, from: `${fromName} <${fromEmail}>`, reply_to: replyTo }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sendResult: { id?: string; error?: string } = {};

    if (resendKey) {
      // Send via Resend
      const emailPayload: Record<string, any> = {
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        bcc: [replyTo],
        reply_to: replyTo,
        subject,
      };
      if (finalHtml) emailPayload.html = finalHtml;
      if (finalText) emailPayload.text = finalText;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      if (resendResponse.ok) {
        const data = await resendResponse.json();
        sendResult = { id: data.id };
      } else {
        const errText = await resendResponse.text();
        console.error("Resend API error:", errText);
        sendResult = { error: `Email send failed: ${resendResponse.status}` };
      }
    } else {
      console.error(`[EMAIL NOT SENT] RESEND_API_KEY is not configured. Email to ${to} was NOT delivered. Set RESEND_API_KEY in Supabase edge function secrets.`);
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured — email was not sent. Add it to Supabase edge function secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the outreach_emails record if email_id was provided
    if (email_id && sendResult.id && !sendResult.error) {
      await supabase
        .from("outreach_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email_id);

      // Update prospect stage to 'emailed' if currently 'identified' or 'researched'
      if (prospect_id) {
        await supabase
          .from("outreach_prospects")
          .update({
            stage: "emailed",
            last_contacted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", prospect_id)
          .in("stage", ["identified", "researched"]);
      }
    }

    if (sendResult.error) {
      return new Response(
        JSON.stringify({ error: sendResult.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message_id: sendResult.id, simulated: !resendKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("send-email error:", err);
    return new Response(
      JSON.stringify({ error: err.message ?? "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
