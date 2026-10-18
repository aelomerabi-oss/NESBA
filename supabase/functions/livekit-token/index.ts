import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { AccessToken } from "livekit-server-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/*
 * Rooms whose names start with this prefix are open test rooms used by the
 * /live-test screen. Every other room must be a live_audio_rooms row.
 */
const TEST_ROOM_PREFIX = "nesba-live-test";

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

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing");
    }

    /*
     * Queries run as the caller, so row level security applies.
     */
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

    const participantName =
      typeof body.participantName === "string" &&
      body.participantName.trim()
        ? body.participantName.trim()
        : user.email || "NESBA User";

    let roomName: string;
    let canPublish: boolean;
    let role = "listener";

    if (typeof body.roomId === "string" && body.roomId) {
      /*
       * Event room: the user must have joined it (join_live_room) and the
       * room must be live. Only hosts and speakers may publish audio.
       */
      const { data: room, error: roomError } = await supabase
        .from("live_audio_rooms")
        .select("id, room_name, status")
        .eq("id", body.roomId)
        .maybeSingle();

      if (roomError) throw roomError;

      if (!room) {
        return json({ error: "Live room not found" }, 404);
      }

      if (room.status !== "live") {
        return json({ error: "This live session is not running" }, 409);
      }

      const { data: participant, error: participantError } = await supabase
        .from("live_audio_participants")
        .select("role, left_at, is_removed")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (participantError) throw participantError;

      if (participant?.is_removed) {
        return json({ error: "The host removed you from this session" }, 403);
      }

      if (!participant || participant.left_at) {
        return json({ error: "Join the room before connecting" }, 403);
      }

      roomName = room.room_name;
      role = participant.role;
      canPublish = role === "host" || role === "speaker";
    } else {
      const requested =
        typeof body.roomName === "string" && body.roomName.trim()
          ? body.roomName.trim()
          : TEST_ROOM_PREFIX;

      if (!requested.startsWith(TEST_ROOM_PREFIX)) {
        return json({ error: "Pass roomId to join an event room" }, 400);
      }

      roomName = requested;
      canPublish = true;
    }

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!apiKey) {
      throw new Error("LIVEKIT_API_KEY is missing");
    }

    if (!apiSecret) {
      throw new Error("LIVEKIT_API_SECRET is missing");
    }

    if (!livekitUrl) {
      throw new Error("LIVEKIT_URL is missing");
    }

    /*
     * Every connection needs a unique LiveKit identity, otherwise a second
     * browser/session with the same user is rejected.
     */
    const participantIdentity = `${user.id}-${crypto.randomUUID()}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      metadata: JSON.stringify({ userId: user.id, role }),
      ttl: "2h",
    });

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    console.log("LIVEKIT TOKEN CREATED", {
      roomName,
      userId: user.id,
      role,
      canPublish,
    });

    return json({
      token: jwt,
      url: livekitUrl,
      roomName,
      participantIdentity,
      role,
      canPublish,
    });
  } catch (error) {
    console.error("LiveKit token error:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create LiveKit token",
      },
      500
    );
  }
});
