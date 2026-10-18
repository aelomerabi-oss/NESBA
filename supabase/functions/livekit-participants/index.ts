import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { RoomServiceClient } from "npm:livekit-server-sdk";

/*
 * Lists who is connected to a LiveKit room.
 *
 * Requires a signed-in user. Allowed rooms: the open /live-test rooms
 * ("nesba-live-test*"), or an event room the caller hosts or has joined
 * (and was not removed from).
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    const livekitUrl = Deno.env.get("LIVEKIT_URL");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase environment variables are missing.");
    }

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error("LiveKit secrets are missing.");
    }

    // Queries run as the caller, so row level security applies.
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

    const roomName =
      typeof body.roomName === "string" && body.roomName.trim()
        ? body.roomName.trim()
        : null;

    if (!roomName) {
      return json({ error: "roomName is required." }, 400);
    }

    if (!roomName.startsWith(TEST_ROOM_PREFIX)) {
      const { data: room, error: roomError } = await supabase
        .from("live_audio_rooms")
        .select("id, host_id")
        .eq("room_name", roomName)
        .maybeSingle();

      if (roomError) throw roomError;

      let allowed = room?.host_id === user.id;

      if (room && !allowed) {
        const { data: participant, error: participantError } = await supabase
          .from("live_audio_participants")
          .select("is_removed")
          .eq("room_id", room.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (participantError) throw participantError;

        allowed = !!participant && !participant.is_removed;
      }

      if (!allowed) {
        return json({ error: "You are not in this room." }, 403);
      }
    }

    const roomService = new RoomServiceClient(
      livekitUrl.replace(/^wss?:\/\//, "https://"),
      apiKey,
      apiSecret
    );

    const participants = await roomService.listParticipants(roomName);

    return json({
      roomName,
      count: participants.length,
      participants: participants.map((participant) => ({
        identity: participant.identity,
        name: participant.name,
      })),
    });
  } catch (error) {
    console.error("LiveKit participants error:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not list participants.",
      },
      500
    );
  }
});
