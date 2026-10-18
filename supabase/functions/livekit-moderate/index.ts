import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RoomServiceClient, TrackType } from "livekit-server-sdk";

/*
 * Host moderation for live audio rooms.
 *
 * Body: { roomId, userId, action }
 *   action: "mute" | "remove" | "restore" | "speaker" | "listener"
 *
 * The database change runs as the caller (moderate_live_participant /
 * set_live_participant_role), which only succeeds for the room host. The
 * change is then enforced on the LiveKit server so a client cannot ignore
 * it: the participant's microphone is muted, they are disconnected, or
 * their publish permission is changed.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTIONS = ["mute", "remove", "restore", "speaker", "listener"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing");
    }

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error("LiveKit secrets are missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return json({ error: "Invalid or expired Supabase session" }, 401);
    }

    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const roomId = typeof body.roomId === "string" ? body.roomId : "";
    const targetUserId = typeof body.userId === "string" ? body.userId : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!roomId || !targetUserId || !ACTIONS.includes(action)) {
      return json({ error: "roomId, userId and a valid action are required" }, 400);
    }

    /*
     * Database first: these functions reject anyone but the host.
     */
    const { error: dbError } =
      action === "speaker" || action === "listener"
        ? await supabase.rpc("set_live_participant_role", {
            p_room_id: roomId,
            p_user_id: targetUserId,
            p_role: action,
          })
        : await supabase.rpc("moderate_live_participant", {
            p_room_id: roomId,
            p_user_id: targetUserId,
            p_action: action,
          });

    if (dbError) {
      return json({ error: dbError.message }, 403);
    }

    if (action === "restore") {
      return json({ ok: true, action, enforced: 0 });
    }

    const { data: room, error: roomError } = await supabase
      .from("live_audio_rooms")
      .select("room_name")
      .eq("id", roomId)
      .single();

    if (roomError) throw roomError;

    /*
     * LiveKit identities are "<userId>-<random>" (one per connection).
     */
    const roomService = new RoomServiceClient(
      livekitUrl.replace(/^wss?:\/\//, "https://"),
      apiKey,
      apiSecret
    );

    const participants = await roomService.listParticipants(room.room_name);

    const targets = participants.filter((participant) =>
      participant.identity.startsWith(`${targetUserId}-`)
    );

    for (const participant of targets) {
      if (action === "remove") {
        await roomService.removeParticipant(room.room_name, participant.identity);
      } else if (action === "mute") {
        for (const track of participant.tracks) {
          if (track.type === TrackType.AUDIO && !track.muted) {
            await roomService.mutePublishedTrack(
              room.room_name,
              participant.identity,
              track.sid,
              true
            );
          }
        }
      } else {
        await roomService.updateParticipant(room.room_name, participant.identity, {
          permission: {
            canPublish: action === "speaker",
            canSubscribe: true,
            canPublishData: true,
          },
        });
      }
    }

    console.log("LIVE ROOM MODERATION", {
      roomId,
      hostId: user.id,
      targetUserId,
      action,
      enforced: targets.length,
    });

    return json({ ok: true, action, enforced: targets.length });
  } catch (error) {
    console.error("LiveKit moderation error:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Moderation failed",
      },
      500
    );
  }
});
