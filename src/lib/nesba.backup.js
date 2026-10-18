import { supabase } from './supabase';


/*
 * ============================================
 * GET INBOX
 * ============================================
 */

export async function getInbox(userId) {
  if (!userId) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('direct_messages')
    .select(
      'id,sender_id,recipient_id,content,created_at,read_at,message_type,media_url'
    )
    .or(
      `sender_id.eq.${userId},recipient_id.eq.${userId}`
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(200);

  if (error) {
    throw error;
  }

  const latestByPerson =
    new Map();

  (data || []).forEach(
    (message) => {
      const personId =
        message.sender_id ===
        userId
          ? message.recipient_id
          : message.sender_id;

      if (
        !latestByPerson.has(
          personId
        )
      ) {
        latestByPerson.set(
          personId,
          {
            ...message,
            personId,
          }
        );
      }
    }
  );

  const personIds = [
    ...latestByPerson.keys(),
  ];

  if (!personIds.length) {
    return [];
  }

  const {
    data: profiles,
    error: profileError,
  } = await supabase
    .from('profiles')
    .select(
      'id,full_name,avatar_url,role'
    )
    .in(
      'id',
      personIds
    );

  if (profileError) {
    throw profileError;
  }

  const people =
    Object.fromEntries(
      (profiles || []).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  return [
    ...latestByPerson.values(),
  ]
    .map(
      (message) => ({
        ...message,
        person:
          people[
            message.personId
          ],
      })
    )
    .sort(
      (a, b) =>
        new Date(
          b.created_at
        ) -
        new Date(
          a.created_at
        )
    );
}


/*
 * ============================================
 * GET DIRECT MESSAGES
 * ============================================
 */

export async function getDirectMessages(
  userId,
  otherUserId
) {
  if (
    !userId ||
    !otherUserId
  ) {
    return [];
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'direct_messages'
      )
      .select(
        'id,sender_id,recipient_id,content,created_at,read_at,message_type,media_url'
      )
      .or(
        `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      );

  if (error) {
    console.error(
      'getDirectMessages ERROR:',
      error
    );

    throw error;
  }

  console.log(
    'getDirectMessages returned:',
    data
  );

  return data || [];
}


/*
 * ============================================
 * SEND DIRECT MESSAGE
 * ============================================
 */

export async function sendDirectMessage(
  recipientId,
  content
) {
  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'Please log in first.'
    );
  }

  if (
    user.id ===
    recipientId
  ) {
    throw new Error(
      'You cannot message yourself.'
    );
  }

  if (
    !content?.trim()
  ) {
    throw new Error(
      'Message cannot be empty.'
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        'direct_messages'
      )
      .insert({
        sender_id:
          user.id,

        recipient_id:
          recipientId,

        content:
          content.trim(),
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/*
 * ============================================
 * MARK DIRECT MESSAGES READ
 * ============================================
 */

export async function markDirectMessagesRead(
  userId,
  otherUserId
) {
  const {
    error,
  } =
    await supabase
      .from(
        'direct_messages'
      )
      .update({
        read_at:
          new Date().toISOString(),
      })
      .eq(
        'sender_id',
        otherUserId
      )
      .eq(
        'recipient_id',
        userId
      )
      .is(
        'read_at',
        null
      );

  if (error) {
    throw error;
  }
}


/*
 * ============================================
 * GET PUBLIC PROFILE
 * ============================================
 */

export async function getPublicProfile(
  userId,
  viewerId
) {
  if (!userId) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('profiles')
      .select(
        'id,full_name,avatar_url,role'
      )
      .eq(
        'id',
        userId
      )
      .maybeSingle();

  if (error) {
    console.error(
      'getPublicProfile error:',
      error
    );

    throw error;
  }

  return data || null;
}