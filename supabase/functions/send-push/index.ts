/*
 * Deliver one notification to the user's phones through Expo's push service.
 *
 * Called by the notifications_queue_push trigger (pg_net) with
 * { notification_id }. The request needs no secret: the function reads the
 * notification itself and only sends notifications that are new and not yet
 * pushed, so a forged call can at most deliver a real notification early.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MAX_AGE_MS = 10 * 60 * 1000;

// Notification types that belong to each preference switch.
const PREFERENCE_BY_TYPE: Record<string, string> = {
  message: "message_enabled",
  event_live: "event_enabled",
  tutoring_booked: "event_enabled",
  tutoring_confirmed: "event_enabled",
  course_sale: "course_enabled",
  course_purchase: "course_enabled",
  assignment_submitted: "course_enabled",
  assignment_reviewed: "course_enabled",
  badge_earned: "course_enabled",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Where tapping the notification should open in the app.
function routeFor(type: string, data: Record<string, unknown>) {
  if (type === "message" && data.sender_id) return `/messages/${data.sender_id}`;
  if (data.room_id) return `/live/${data.room_id}`;
  if (data.booking_id) return "/bookings";
  if (data.course_id) return `/course/${data.course_id}`;
  if (data.lesson_id) return `/lesson/${data.lesson_id}`;
  if (data.post_id) return `/post/${data.post_id}`;
  return "/notifications";
}

Deno.serve(async (req) => {
  try {
    const { notification_id: id } = await req.json().catch(() => ({}));
    if (typeof id !== "string") return json({ error: "notification_id is required" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Claim the notification so it is never pushed twice.
    const { data: note } = await db
      .from("notifications")
      .update({ pushed_at: new Date().toISOString() })
      .eq("id", id)
      .is("pushed_at", null)
      .select("*")
      .maybeSingle();

    if (!note) return json({ skipped: "already sent or not found" });

    if (Date.now() - new Date(note.created_at).getTime() > MAX_AGE_MS) {
      return json({ skipped: "too old" });
    }

    const { data: prefs } = await db
      .from("notification_preferences")
      .select("*")
      .eq("user_id", note.user_id)
      .maybeSingle();

    const switchName = PREFERENCE_BY_TYPE[note.type] || "social_enabled";
    if (prefs && (prefs.push_enabled === false || prefs[switchName] === false)) {
      return json({ skipped: "turned off by user" });
    }

    const { data: tokens } = await db
      .from("push_tokens")
      .select("token")
      .eq("user_id", note.user_id);

    if (!tokens?.length) return json({ skipped: "no devices" });

    const data = (note.data || {}) as Record<string, unknown>;

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(tokens.map(({ token }) => ({
        to: token,
        title: note.title || "NESBA",
        body: note.body || "",
        sound: "default",
        data: { ...data, url: routeFor(note.type, data) },
      }))),
    });

    const result = await response.json().catch(() => ({}));

    // Forget devices that uninstalled the app or turned notifications off.
    const tickets = Array.isArray(result.data) ? result.data : [];
    const dead = tickets
      .map((ticket: { details?: { error?: string } }, i: number) =>
        ticket?.details?.error === "DeviceNotRegistered" ? tokens[i].token : null)
      .filter(Boolean);

    if (dead.length) await db.from("push_tokens").delete().in("token", dead);

    return json({ sent: tokens.length - dead.length });
  } catch (error) {
    console.error("send-push error:", error);
    return json({ error: "Push failed" }, 500);
  }
});
