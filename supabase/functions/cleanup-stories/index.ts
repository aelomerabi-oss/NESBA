/*
 * Nightly clean-up of the "stories" storage bucket.
 *
 * Stories disappear from the app after 24 hours, but their photo, video and
 * audio files stayed in storage forever. This deletes:
 *   - files of stories that expired more than an hour ago, and those stories
 *     (their story_views go with them)
 *   - files older than two days that no story points to (failed uploads)
 *
 * Run by pg_cron every night (src/sql/034_story_cleanup.sql). It needs no
 * secret: it only ever removes content that is already gone from the app.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "stories";
const ORPHAN_AGE_MS = 2 * 24 * 60 * 60 * 1000;
const PUBLIC_PREFIX = `/object/public/${BUCKET}/`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// "https://…/storage/v1/object/public/stories/<path>" -> "<path>"
function pathFromUrl(url: string | null) {
  if (!url) return null;
  const i = url.indexOf(PUBLIC_PREFIX);
  return i === -1 ? null : decodeURIComponent(url.slice(i + PUBLIC_PREFIX.length).split("?")[0]);
}

Deno.serve(async (req) => {
  try {
    // { "dryRun": true } reports what would be deleted without deleting it.
    const { dryRun = false } = await req.json().catch(() => ({}));

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Files still used by stories that are live (or only just expired).
    const { data: live, error: liveError } = await db
      .from("stories")
      .select("media_url,audio_url")
      .gte("expires_at", cutoff);

    if (liveError) throw liveError;

    const keep = new Set(
      (live || []).flatMap((s) => [pathFromUrl(s.media_url), pathFromUrl(s.audio_url)]).filter(Boolean),
    );

    const { data: expired, error: expiredError } = await db
      .from("stories")
      .select("id,media_url,audio_url")
      .lt("expires_at", cutoff);

    if (expiredError) throw expiredError;

    const expiredPaths = new Set(
      (expired || []).flatMap((s) => [pathFromUrl(s.media_url), pathFromUrl(s.audio_url)]).filter(Boolean),
    );

    // Walk every folder: older app versions saved stories as <userId>/<file>,
    // newer ones as <userId>/<media|audio>/<file>. Delete a file when no live
    // story uses it and it belonged to an expired story, or nothing points to
    // it and it is old enough that its upload cannot be in progress.
    const safeToDelete: string[] = [];
    const now = Date.now();
    let scanned = 0;

    const walk = async (prefix: string) => {
      const { data: entries, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
      if (error) throw error;

      for (const entry of entries || []) {
        const path = prefix ? `${prefix}/${entry.name}` : entry.name;

        // Folders have no id.
        if (!entry.id) {
          await walk(path);
          continue;
        }

        scanned += 1;
        const age = now - new Date(entry.created_at || now).getTime();

        if (!keep.has(path) && (expiredPaths.has(path) || age > ORPHAN_AGE_MS)) {
          safeToDelete.push(path);
        }
      }
    };

    await walk("");

    if (dryRun) {
      // Counts only: anyone can call this function, so no file names.
      return json({ dryRun: true, filesScanned: scanned, wouldDelete: safeToDelete.length, expiredStories: expired?.length || 0 });
    }

    for (let i = 0; i < safeToDelete.length; i += 100) {
      const { error } = await db.storage.from(BUCKET).remove(safeToDelete.slice(i, i + 100));
      if (error) throw error;
    }

    let storiesDeleted = 0;

    if (expired?.length) {
      const { error } = await db.from("stories").delete().in("id", expired.map((s) => s.id));
      if (error) throw error;
      storiesDeleted = expired.length;
    }

    return json({ filesScanned: scanned, filesDeleted: safeToDelete.length, storiesDeleted });
  } catch (error) {
    console.error("cleanup-stories error:", error);
    return json({ error: "Clean-up failed" }, 500);
  }
});
