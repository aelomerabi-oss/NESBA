/*
 * Record a live session so people can rewatch it.
 *
 * Body: { action, roomId?, recordingId? }
 *   "start" (host)  -> LiveKit records the whole room (speaker layout) and
 *                      uploads an MP4 into the private "recordings" bucket
 *                      through Supabase Storage's S3 endpoint
 *   "stop"  (host)  -> stops it; the file is ready a few moments later
 *   "url"           -> a 2-hour link to watch a recording the caller may see
 *
 * Needs secrets: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET,
 * RECORDINGS_S3_ACCESS_KEY, RECORDINGS_S3_SECRET_KEY (Supabase dashboard >
 * Storage > S3 configuration > Access keys).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from "livekit-server-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function env(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Recording is not set up yet (${name} is missing)`);
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please log in." }, 401);

    const supabaseUrl = env("SUPABASE_URL");

    // As the caller (row level security applies) and as the service.
    const asUser = createClient(supabaseUrl, env("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });
    const db = createClient(supabaseUrl, env("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false },
    });

    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Please log in." }, 401);

    const body = await req.json().catch(() => ({}));

    if (body.action === "url") {
      // Readable through RLS means the caller may watch it.
      const { data: recording } = await asUser
        .from("live_recordings")
        .select("file_path,status")
        .eq("id", body.recordingId)
        .maybeSingle();

      if (!recording) return json({ error: "Recording not found." }, 404);

      const { data, error } = await db.storage
        .from("recordings")
        .createSignedUrl(recording.file_path, 2 * 60 * 60);

      if (error) return json({ error: "The recording is still being processed. Try again in a minute." }, 409);

      if (recording.status !== "ready") {
        await db.from("live_recordings").update({ status: "ready" }).eq("id", body.recordingId);
      }

      return json({ url: data.signedUrl });
    }

    const { data: room } = await db
      .from("live_audio_rooms")
      .select("id,room_name,host_id,event_id,status")
      .eq("id", body.roomId)
      .maybeSingle();

    if (!room) return json({ error: "Live room not found." }, 404);
    if (room.host_id !== user.id) return json({ error: "Only the host can record." }, 403);

    const egress = new EgressClient(
      env("LIVEKIT_URL").replace(/^wss?:\/\//, "https://"),
      env("LIVEKIT_API_KEY"),
      env("LIVEKIT_API_SECRET"),
    );

    if (body.action === "start") {
      if (room.status !== "live") return json({ error: "The session is not live." }, 409);

      const { data: running } = await db
        .from("live_recordings")
        .select("id")
        .eq("room_id", room.id)
        .eq("status", "recording")
        .maybeSingle();

      if (running) return json({ error: "This session is already being recorded." }, 409);

      const filePath = `${room.id}/${Date.now()}.mp4`;

      const output = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: filePath,
        output: {
          case: "s3",
          value: new S3Upload({
            accessKey: env("RECORDINGS_S3_ACCESS_KEY"),
            secret: env("RECORDINGS_S3_SECRET_KEY"),
            region: Deno.env.get("RECORDINGS_S3_REGION") || "eu-central-1",
            endpoint: `${supabaseUrl}/storage/v1/s3`,
            bucket: "recordings",
            forcePathStyle: true,
          }),
        },
      });

      const info = await egress.startRoomCompositeEgress(room.room_name, output, { layout: "speaker" });

      const { data: recording, error } = await db
        .from("live_recordings")
        .insert({
          room_id: room.id,
          event_id: room.event_id,
          egress_id: info.egressId,
          file_path: filePath,
          started_by: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;
      return json({ recordingId: recording.id });
    }

    if (body.action === "stop") {
      const { data: recording } = await db
        .from("live_recordings")
        .select("id,egress_id")
        .eq("room_id", room.id)
        .eq("status", "recording")
        .maybeSingle();

      if (!recording) return json({ ok: true });

      try {
        await egress.stopEgress(recording.egress_id);
      } catch (error) {
        // Already stopped (e.g. the room ended first): still close the row.
        console.warn("stopEgress:", error);
      }

      await db
        .from("live_recordings")
        .update({ status: "ready", ended_at: new Date().toISOString() })
        .eq("id", recording.id);

      return json({ ok: true });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("livekit-record error:", error);
    return json({ error: error instanceof Error ? error.message : "Recording failed" }, 500);
  }
});
