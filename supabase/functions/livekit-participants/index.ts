import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { RoomServiceClient } from "npm:livekit-server-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const apiKey =
      Deno.env.get("LIVEKIT_API_KEY");

    const apiSecret =
      Deno.env.get("LIVEKIT_API_SECRET");

    const livekitUrl =
      Deno.env.get("LIVEKIT_URL");

    if (
      !apiKey ||
      !apiSecret ||
      !livekitUrl
    ) {
      throw new Error(
        "LiveKit secrets are missing."
      );
    }

    const body = await req.json();

    const roomName =
      typeof body?.roomName === "string" &&
      body.roomName.trim()
        ? body.roomName.trim()
        : null;

    if (!roomName) {
      return new Response(
        JSON.stringify({
          error:
            "roomName is required.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }

    console.log(
      "Checking LiveKit participants:",
      roomName
    );

    const livekitHost =
      livekitUrl.replace(
        /^wss?:\/\//,
        "https://"
      );

    const roomService =
      new RoomServiceClient(
        livekitHost,
        apiKey,
        apiSecret
      );

    const participants =
      await roomService.listParticipants(
        roomName
      );

    const count =
      participants.length;

    console.log(
      "LiveKit participant count:",
      {
        roomName,
        count,
      }
    );

    return new Response(
      JSON.stringify({
        roomName,
        count,
        participants:
          participants.map(
            (participant) => ({
              identity:
                participant.identity,
              name:
                participant.name,
            })
          ),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "LiveKit participants error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get LiveKit participants.",
        count: 0,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type":
            "application/json",
        },
      }
    );
  }
});