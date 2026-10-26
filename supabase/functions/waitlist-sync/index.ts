/*
 * Send waitlist sign-ups to the beehiiv newsletter.
 *
 * Called by the waitlist_queue_sync trigger (pg_net) with { waitlist_id },
 * and every hour with {} to send any sign-ups that were not sent yet. The
 * request needs no secret: the function reads the waitlist itself and only
 * sends rows that were not sent before.
 *
 * Needs BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID (pub_...) in the Supabase
 * dashboard. Without them it does nothing and the sign-ups wait.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH = 50;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const apiKey = Deno.env.get("BEEHIIV_API_KEY");
  const publication = Deno.env.get("BEEHIIV_PUBLICATION_ID");
  if (!apiKey || !publication) return json({ skipped: "beehiiv is not set up yet" });

  const { waitlist_id: id } = await req.json().catch(() => ({}));

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let query = db.from("waitlist").select("id, email, interest, source").is("beehiiv_synced_at", null);
  query = typeof id === "string" ? query.eq("id", id) : query.order("created_at").limit(BATCH);
  const { data: rows, error } = await query;
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const row of rows ?? []) {
    const res = await fetch(`https://api.beehiiv.com/v2/publications/${publication}/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: row.email,
        reactivate_existing: false,
        send_welcome_email: true,
        utm_source: row.source || "nesba-waitlist",
        utm_medium: "waitlist",
        utm_campaign: row.interest,
      }),
    });

    if (res.ok) {
      await db.from("waitlist").update({ beehiiv_synced_at: new Date().toISOString(), beehiiv_error: null }).eq("id", row.id);
      sent++;
    } else {
      const detail = (await res.text()).slice(0, 300);
      await db.from("waitlist").update({ beehiiv_error: `${res.status} ${detail}` }).eq("id", row.id);
    }
  }

  return json({ sent, pending: (rows?.length ?? 0) - sent });
});
