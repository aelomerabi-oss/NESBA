import { supabase } from './supabase';

/*
 * Live session recordings. LiveKit records the room and uploads the MP4 to
 * the private "recordings" bucket (edge function livekit-record).
 */

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke('livekit-record', { body });

  if (error || data?.error) {
    let message = data?.error;
    if (!message && error?.context?.json) {
      try {
        message = (await error.context.json())?.error;
      } catch {
        message = null;
      }
    }
    throw new Error(message || error?.message || 'Recording failed.');
  }

  return data;
}

export const startRecording = (roomId) => invoke({ action: 'start', roomId });

export const stopRecording = (roomId) => invoke({ action: 'stop', roomId });

export async function getRecordingUrl(recordingId) {
  const { url } = await invoke({ action: 'url', recordingId });
  return url;
}

export async function isRoomRecording(roomId) {
  const { data } = await supabase
    .from('live_recordings')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'recording')
    .maybeSingle();

  return !!data;
}

// Recordings the signed-in user may watch (row level security decides).
export async function getRecordings() {
  const { data, error } = await supabase
    .from('live_recordings')
    .select('id,status,started_at,ended_at,event:events(title,host:profiles!events_host_id_fkey(full_name))')
    .neq('status', 'failed')
    .order('started_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data || [];
}
