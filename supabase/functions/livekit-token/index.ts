import { createClient } from "https://esm.sh/@Supabase/supabase-js@2";
import { AccessToken } from "livekit-server-sdk";

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
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: "Missing Authorization header",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Supabase environment variables are missing"
      );
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired Supabase session",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let body = {};

    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const roomName =
      typeof body.roomName === "string" &&
      body.roomName.trim()
        ? body.roomName.trim()
        : "nesba-live-test";

    const participantName =
      typeof body.participantName === "string" &&
      body.participantName.trim()
        ? body.participantName.trim()
        : user.email || "NESBA User";

    const apiKey =
      Deno.env.get("LIVEKIT_API_KEY");

    const apiSecret =
      Deno.env.get("LIVEKIT_API_SECRET");

    const livekitUrl =
      Deno.env.get("LIVEKIT_URL");

    if (!apiKey) {
      throw new Error(
        "LIVEKIT_API_KEY is missing"
      );
    }

    if (!apiSecret) {
      throw new Error(
        "LIVEKIT_API_SECRET is missing"
      );
    }

    if (!livekitUrl) {
      throw new Error(
        "LIVEKIT_URL is missing"
      );
    }

    /*
     * IMPORTANT:
     *
     * Every browser connection needs a unique
     * LiveKit participant identity.
     *
     * Using only user.id can cause the second
     * browser/session to be rejected because
     * both connections have the same identity.
     */
    const participantIdentity =
      `${user.id}-${crypto.randomUUID()}`;

    const token = new AccessToken(
      apiKey,
      apiSecret,
      {
        identity: participantIdentity,
        name: participantName,
        ttl: "2h",
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    console.log(
      "LIVEKIT TOKEN CREATED",
      {
        roomName,
        userId: user.id,
        participantIdentity,
        participantName,
        apiKeyPrefix:
          apiKey.substring(0, 8),
        tokenLength: jwt.length,
        livekitUrl,
      }
    );

    return new Response(
      JSON.stringify({
        token: jwt,
        url: livekitUrl,
        roomName,
        participantIdentity,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "LiveKit token error:",
      error
    );

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Failed to create LiveKit token",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});