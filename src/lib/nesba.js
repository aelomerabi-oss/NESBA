import { supabase } from './supabase';

/*
|--------------------------------------------------------------------------
| NESBA DATA LAYER
|--------------------------------------------------------------------------
|
| Central Supabase data layer for NESBA.
|
| Main responsibilities:
|
| - Authentication
| - Profiles
| - Users
| - Following
| - Posts
| - Comments
| - Likes
| - Shares
| - Stories
| - Courses
| - Learning progress
| - Certificates
| - Badges
| - Media
| - Notifications
| - Search
|
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| GENERAL HELPERS
|--------------------------------------------------------------------------
*/

function safeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}


function normalizeId(value) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}


function throwIfError(error) {
  if (error) {
    throw error;
  }
}


function normalizeRole(value) {
  if (
    value === 'organisation' ||
    value === 'organization'
  ) {
    return 'organization';
  }

  return value || 'student';
}


function cleanText(value) {
  return String(
    value || ''
  ).trim();
}


/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

export async function getCurrentUserId() {
  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      'getCurrentUserId error:',
      error
    );

    return null;
  }

  return user?.id || null;
}


export async function getCurrentUser() {
  const {
    data: {
      user,
    },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      'getCurrentUser error:',
      error
    );

    return null;
  }

  return user || null;
}


export async function getCurrentSession() {
  const {
    data: {
      session,
    },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(
      'getCurrentSession error:',
      error
    );

    return null;
  }

  return session || null;
}


/*
|--------------------------------------------------------------------------
| PROFILES
|--------------------------------------------------------------------------
*/

export async function getUserProfile(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      bio,
      role,
      is_premium,
      created_at,
      updated_at,
      onboarded,
      goals,
      verification_status,
      requested_role,
      expertise,
      experience
    `)
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (error) {
    console.error(
      'getUserProfile error:',
      error
    );

    return null;
  }

  return data || null;
}


export async function getMyProfile() {
  const userId =
    await getCurrentUserId();

  if (!userId) {
    return null;
  }

  return getUserProfile(
    userId
  );
}


export async function updateUserProfile(
  userId,
  updates
) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .update(
      updates
    )
    .eq(
      'id',
      id
    )
    .select()
    .single();

  throwIfError(
    error
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| USER SEARCH
|--------------------------------------------------------------------------
*/

export async function searchUsers(
  query = ''
) {
  const search =
    cleanText(query);

  if (!search) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      avatar_url,
      role,
      bio,
      is_premium,
      verification_status
    `)
    .ilike(
      'full_name',
      `%${search}%`
    )
    .order(
      'full_name',
      {
        ascending: true,
      }
    )
    .limit(30);

  if (error) {
    console.error(
      'searchUsers error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
|--------------------------------------------------------------------------
| FOLLOW SYSTEM
|--------------------------------------------------------------------------
*/

export async function isFollowing(
  followerId,
  followedUserId
) {
  const follower =
    normalizeId(
      followerId
    );

  const followed =
    normalizeId(
      followedUserId
    );

  if (
    !follower ||
    !followed ||
    follower === followed
  ) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from('follows')
    .select(
      'id'
    )
    .eq(
      'follower_id',
      follower
    )
    .eq(
      'followed_user_id',
      followed
    )
    .maybeSingle();

  if (error) {
    console.error(
      'isFollowing error:',
      error
    );

    return false;
  }

  return !!data;
}


/*
 * Follows or unfollows a user (followingUserId) or an organization
 * (followingOrganizationId). Returns true when now following.
 */
export async function toggleFollow({
  followerId,
  followingUserId,
  followingOrganizationId,
}) {
  const follower =
    normalizeId(
      followerId
    );

  const organization =
    normalizeId(
      followingOrganizationId
    );

  const followed =
    organization ||
    normalizeId(
      followingUserId
    );

  const column =
    organization
      ? 'followed_organization_id'
      : 'followed_user_id';

  if (
    !follower ||
    !followed
  ) {
    throw new Error(
      'Missing follower or followed user ID.'
    );
  }

  if (
    !organization &&
    follower === followed
  ) {
    throw new Error(
      'You cannot follow yourself.'
    );
  }

  const {
    data: existing,
    error:
      lookupError,
  } = await supabase
    .from('follows')
    .select(
      'id'
    )
    .eq(
      'follower_id',
      follower
    )
    .eq(
      column,
      followed
    )
    .maybeSingle();

  throwIfError(
    lookupError
  );

  if (existing) {
    const {
      error,
    } = await supabase
      .from('follows')
      .delete()
      .eq(
        'id',
        existing.id
      );

    throwIfError(
      error
    );

    return false;
  }

  const {
    error,
  } = await supabase
    .from('follows')
    .insert({
      follower_id:
        follower,

      [column]:
        followed,
    });

  throwIfError(
    error
  );

  return true;
}


export async function getFollowing(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('follows')
    .select(`
      id,
      follower_id,
      followed_user_id,
      created_at
    `)
    .eq(
      'follower_id',
      id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      'getFollowing error:',
      error
    );

    return [];
  }

  const rows =
    safeArray(data);

  const ids = [
    ...new Set(
      rows
        .map(
          row =>
            row.followed_user_id
        )
        .filter(Boolean)
    ),
  ];

  if (!ids.length) {
    return [];
  }

  const {
    data: profiles,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        role,
        bio
      `)
      .in(
        'id',
        ids
      );

  const profileMap =
    new Map(
      safeArray(
        profiles
      ).map(
        profile => [
          profile.id,
          profile,
        ]
      )
    );

  return rows.map(
    row => ({
      ...row,

      profile:
        profileMap.get(
          row.followed_user_id
        ) || null,
    })
  );
}


export async function getFollowers(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('follows')
    .select(`
      id,
      follower_id,
      followed_user_id,
      created_at
    `)
    .eq(
      'followed_user_id',
      id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      'getFollowers error:',
      error
    );

    return [];
  }

  const rows =
    safeArray(data);

  const ids = [
    ...new Set(
      rows
        .map(
          row =>
            row.follower_id
        )
        .filter(Boolean)
    ),
  ];

  if (!ids.length) {
    return [];
  }

  const {
    data: profiles,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        role,
        bio
      `)
      .in(
        'id',
        ids
      );

  const profileMap =
    new Map(
      safeArray(
        profiles
      ).map(
        profile => [
          profile.id,
          profile,
        ]
      )
    );

  return rows.map(
    row => ({
      ...row,

      profile:
        profileMap.get(
          row.follower_id
        ) || null,
    })
  );
}


/*
|--------------------------------------------------------------------------
| SUGGESTED USERS
|--------------------------------------------------------------------------
*/

export async function getSuggestedUsers(
  userId = null
) {
  const user =
    normalizeId(userId);

  const {
    data: profiles,
    error,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url,
      role,
      bio,
      is_premium,
      verification_status
    `)
    .limit(100);

  if (error) {
    console.error(
      'getSuggestedUsers profiles error:',
      error
    );

    return [];
  }

  let users =
    safeArray(profiles);

  if (!user) {
    return users.slice(
      0,
      20
    );
  }

  users =
    users.filter(
      profile =>
        profile.id !== user
    );

  const {
    data: follows,
    error:
      followError,
  } = await supabase
    .from('follows')
    .select(
      'followed_user_id'
    )
    .eq(
      'follower_id',
      user
    );

  if (followError) {
    console.error(
      'getSuggestedUsers follows error:',
      followError
    );

    return users.slice(
      0,
      20
    );
  }

  const followedIds =
    new Set(
      safeArray(
        follows
      ).map(
        row =>
          row.followed_user_id
      )
    );

  return users
    .filter(
      profile =>
        !followedIds.has(
          profile.id
        )
    )
    .slice(
      0,
      20
    );
}


/*
|--------------------------------------------------------------------------
| PUBLIC PROFILE
|--------------------------------------------------------------------------
*/

export async function getPublicProfile(
  userId,
  viewerId = null
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return null;
  }

  const profile =
    await getUserProfile(
      id
    );

  if (!profile) {
    return null;
  }

  const [
    followersResult,
    followingResult,
    postsResult,
    coursesResult,
  ] =
    await Promise.all([
      supabase
        .from('follows')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'followed_user_id',
          id
        ),

      supabase
        .from('follows')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'follower_id',
          id
        ),

      supabase
        .from('posts')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'author_id',
          id
        ),

      supabase
        .from('courses')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'teacher_id',
          id
        ),
    ]);

  const viewer =
    normalizeId(
      viewerId
    );

  const following =
    viewer &&
    viewer !== id
      ? await isFollowing(
          viewer,
          id
        )
      : false;

  return {
    ...profile,

    role:
      normalizeRole(
        profile.role
      ),

    full_name:
      profile.full_name ||
      profile.email ||
      'NESBA Member',

    avatar_url:
      profile.avatar_url ||
      null,

    bio:
      profile.bio ||
      '',

    isFollowing:
      following,

    stats: {
      followers:
        followersResult.count ||
        0,

      following:
        followingResult.count ||
        0,

      posts:
        postsResult.count ||
        0,

      courses:
        coursesResult.count ||
        0,
    },
  };
}
/*
|--------------------------------------------------------------------------
| POSTS
|--------------------------------------------------------------------------
*/

export async function getPosts({
  userId = null,
  limit = 30,
  offset = 0,
} = {}) {
  let query = supabase
    .from('posts')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .range(
      offset,
      offset + limit - 1
    );

  if (userId) {
    query = query.or(
      `visibility.eq.public,author_id.eq.${userId}`
    );
  } else {
    query = query.eq(
      'visibility',
      'public'
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    console.error(
      'getPosts error:',
      error
    );

    return [];
  }

  const posts =
    safeArray(data);

  const authorIds = [
    ...new Set(
      posts
        .map(post =>
          post?.author_id ||
          post?.user_id
        )
        .filter(Boolean)
    ),
  ];

  if (!authorIds.length) {
    return posts;
  }

  const {
    data: profiles,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url,
        role
      `)
      .in(
        'id',
        authorIds
      );

  const profileMap =
    new Map(
      safeArray(profiles).map(
        profile => [
          profile.id,
          profile,
        ]
      )
    );

  return posts.map(post => {
    const authorId =
      post?.author_id ||
      post?.user_id ||
      null;

    const profile =
      profileMap.get(
        authorId
      ) || null;

    return {
      ...post,
      author_id:
        authorId,
      user_id:
        post?.user_id ||
        authorId,
      profiles:
        profile,
      profile:
        profile,
      author:
        profile,
      author_name:
        profile?.full_name ||
        post?.author_name ||
        'NESBA Member',
      author_avatar:
        profile?.avatar_url ||
        null,
    };
  });
}

/*
|--------------------------------------------------------------------------
| CREATE POST
|--------------------------------------------------------------------------
|
| This is deliberately kept simple:
|
| 1. Validate user.
| 2. Validate that something exists.
| 3. Insert into posts.
| 4. Return the inserted row.
|
| We DO NOT request author_name from
| the posts table because that may not
| be an actual column.
|
|--------------------------------------------------------------------------
*/

export async function createPost({
  userId,
  content = '',
  imageUrl = null,
  videoUrl = null,
  linkUrl = null,
  organizationId = null,
  visibility = 'public',
}) {
  const authorId =
    normalizeId(userId);

  const text =
    cleanText(content);

  const image =
    imageUrl || null;

  const video =
    videoUrl || null;

  const link =
    linkUrl || null;

  if (!authorId) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (
    !text &&
    !image &&
    !video &&
    !link
  ) {
    throw new Error(
      'Post cannot be empty.'
    );
  }

  const payload = {
    author_id:
      authorId,

    content:
      text || '',

    image_url:
      image,

    video_url:
      video,

    link_url:
      link,

    organization_id:
      normalizeId(
        organizationId
      ),

    visibility:
      visibility ||
      'public',
  };

  console.log(
    'NESBA createPost payload:',
    payload
  );

  const {
    data,
    error,
  } = await supabase
    .from('posts')
    .insert(
      payload
    )
    .select(`
      id,
      author_id,
      organization_id,
      content,
      image_url,
      video_url,
      link_url,
      visibility,
      created_at,
      updated_at
    `)
    .single();

  if (error) {
    console.error(
      'NESBA createPost Supabase error:',
      error
    );

    throw new Error(
      error.message ||
      'Failed to create post.'
    );
  }

  if (!data) {
    throw new Error(
      'Post was not returned after creation.'
    );
  }

  console.log(
    'NESBA post created successfully:',
    data
  );

  return data;
}


/*
|--------------------------------------------------------------------------
| EXTRACT MENTIONS
|--------------------------------------------------------------------------
*/

export function extractMentions(
  content = ''
) {
  const matches =
    String(content)
      .match(
        /@([a-zA-Z0-9._-]+)/g
      );

  if (!matches) {
    return [];
  }

  return [
    ...new Set(
      matches.map(
        mention =>
          mention.substring(1)
      )
    ),
  ];
}


/*
|--------------------------------------------------------------------------
| CREATE POST WITH MENTIONS
|--------------------------------------------------------------------------
|
| Important:
|
| A mention/notification failure
| must NEVER destroy a successfully
| created post.
|
|--------------------------------------------------------------------------
*/

export async function createPostWithMentions({
  userId,
  content = '',
  imageUrl = null,
  videoUrl = null,
  linkUrl = null,
}) {
  const post =
    await createPost({
      userId,
      content,
      imageUrl,
      videoUrl,
      linkUrl,
    });

  /*
   * Post is already created.
   *
   * Everything below is optional.
   */

  const mentions =
    extractMentions(
      content
    );

  if (!mentions.length) {
    return post;
  }

  /*
   * Resolve @names to profiles, then notify them through
   * notify_post_mentions (notifications have no client INSERT policy).
   */
  const mentionedIds =
    new Set();

  for (
    const username of mentions
  ) {
    const {
      data: users,
      error,
    } = await supabase
      .from('profiles')
      .select('id')
      .ilike(
        'full_name',
        `%${username.replace(/[%_]/g, '')}%`
      )
      .limit(5);

    if (error) {
      console.error(
        'Mention lookup error:',
        error
      );

      continue;
    }

    safeArray(users).forEach(
      (mentionedUser) => {
        if (
          String(mentionedUser.id) !==
          String(userId)
        ) {
          mentionedIds.add(
            mentionedUser.id
          );
        }
      }
    );
  }

  if (mentionedIds.size) {
    const {
      error: notificationError,
    } = await supabase.rpc(
      'notify_post_mentions',
      {
        p_post_id:
          post.id,

        p_user_ids: [
          ...mentionedIds,
        ],
      }
    );

    // Notifications should not break posting.
    if (notificationError) {
      console.error(
        'Mention notification error:',
        notificationError
      );
    }
  }

  return post;
}


/*
|--------------------------------------------------------------------------
| DELETE POST
|--------------------------------------------------------------------------
*/

export async function deletePost(
  postId,
  userId
) {
  const id =
    normalizeId(postId);

  const authorId =
    normalizeId(userId);

  if (!id || !authorId) {
    throw new Error(
      'Missing post ID or user ID.'
    );
  }

  const {
    error,
  } = await supabase
    .from('posts')
    .delete()
    .eq(
      'id',
      id
    )
    .eq(
      'author_id',
      authorId
    );

  if (error) {
    console.error(
      'deletePost error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not delete post.'
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| IMAGE UPLOAD
|--------------------------------------------------------------------------
*/

export async function uploadPostImage({
  userId,
  fileUri,
  fileName = 'post-image.jpg',
  contentType = 'image/jpeg',
}) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!fileUri) {
    throw new Error(
      'Missing image.'
    );
  }

  /*
   * React Native / Expo file upload.
   */

  const response =
    await fetch(
      fileUri
    );

  if (!response.ok) {
    throw new Error(
      'Could not read selected image.'
    );
  }

  const blob =
    await response.blob();

  const extension =
    String(
      fileName
    )
      .split('.')
      .pop() ||
    'jpg';

  const path =
    `${id}/posts/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

  console.log(
    'Uploading post image:',
    path
  );

  const {
    error,
  } = await supabase
    .storage
    .from('posts')
    .upload(
      path,
      blob,
      {
        contentType:
          contentType ||
          'image/jpeg',

        upsert:
          false,
      }
    );

  if (error) {
    console.error(
      'uploadPostImage storage error:',
      error
    );

    throw new Error(
      error.message ||
      'Image upload failed.'
    );
  }

  const {
    data:
      publicData,
  } =
    supabase
      .storage
      .from('posts')
      .getPublicUrl(
        path
      );

  const publicUrl =
    publicData?.publicUrl;

  if (!publicUrl) {
    throw new Error(
      'Image uploaded but public URL could not be generated.'
    );
  }

  console.log(
    'Post image uploaded:',
    publicUrl
  );

  return {
    path,
    url:
      publicUrl,
    publicUrl,
  };
}


/*
|--------------------------------------------------------------------------
| VIDEO UPLOAD
|--------------------------------------------------------------------------
*/

export async function uploadPostVideo({
  userId,
  fileUri,
  fileName = 'post-video.mp4',
  contentType = 'video/mp4',
}) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!fileUri) {
    throw new Error(
      'Missing video.'
    );
  }

  const response =
    await fetch(
      fileUri
    );

  if (!response.ok) {
    throw new Error(
      'Could not read selected video.'
    );
  }

  const blob =
    await response.blob();

  const extension =
    String(
      fileName
    )
      .split('.')
      .pop() ||
    'mp4';

  const path =
    `${id}/posts/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

  console.log(
    'Uploading post video:',
    path
  );

  const {
    error,
  } = await supabase
    .storage
    .from('posts')
    .upload(
      path,
      blob,
      {
        contentType:
          contentType ||
          'video/mp4',

        upsert:
          false,
      }
    );

  if (error) {
    console.error(
      'uploadPostVideo storage error:',
      error
    );

    throw new Error(
      error.message ||
      'Video upload failed.'
    );
  }

  const {
    data:
      publicData,
  } =
    supabase
      .storage
      .from('posts')
      .getPublicUrl(
        path
      );

  const publicUrl =
    publicData?.publicUrl;

  if (!publicUrl) {
    throw new Error(
      'Video uploaded but public URL could not be generated.'
    );
  }

  return {
    path,
    url:
      publicUrl,
    publicUrl,
  };
}


/*
|--------------------------------------------------------------------------
| POST LIKE
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Never increment a count locally
| without checking the actual like row.
|
| This prevents:
|
| Like → 1
| Like → 2
| Like → 3
| Like → 4
|
| when the user is simply toggling.
|
|--------------------------------------------------------------------------
*/

export async function hasLikedPost(
  postId,
  userId
) {
  const id =
    normalizeId(postId);

  const user =
    normalizeId(userId);

  if (!id || !user) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from('post_likes')
    .select(
      'id'
    )
    .eq(
      'post_id',
      id
    )
    .eq(
      'user_id',
      user
    )
    .maybeSingle();

  if (error) {
    console.error(
      'hasLikedPost error:',
      error
    );

    return false;
  }

  return !!data;
}


export async function getPostLikeCount(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('post_likes')
    .select(
      'id',
      {
        count:
          'exact',
        head:
          true,
      }
    )
    .eq(
      'post_id',
      id
    );

  if (error) {
    console.error(
      'getPostLikeCount error:',
      error
    );

    return 0;
  }

  return count || 0;
}


export async function togglePostLike(
  postId,
  userId
) {
  const id =
    normalizeId(postId);

  const user =
    normalizeId(userId);

  if (!id || !user) {
    throw new Error(
      'Missing post ID or user ID.'
    );
  }

  /*
   * First check whether THIS USER
   * already has a like.
   */

  const {
    data: existing,
    error:
      lookupError,
  } = await supabase
    .from('post_likes')
    .select(
      'id'
    )
    .eq(
      'post_id',
      id
    )
    .eq(
      'user_id',
      user
    )
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      lookupError.message
    );
  }

  if (existing) {
    const {
      error,
    } = await supabase
      .from('post_likes')
      .delete()
      .eq(
        'id',
        existing.id
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return {
      liked: false,

      count:
        await getPostLikeCount(
          id
        ),
    };
  }

  /*
   * No existing like:
   * create exactly one.
   */

  const {
    error:
      insertError,
  } = await supabase
    .from('post_likes')
    .insert({
      post_id:
        id,

      user_id:
        user,
    });

  if (insertError) {
    /*
     * A unique constraint means the
     * user already liked it.
     */
    if (
      insertError.code ===
      '23505'
    ) {
      return {
        liked: true,

        count:
          await getPostLikeCount(
            id
          ),
      };
    }

    throw new Error(
      insertError.message
    );
  }

  return {
    liked: true,

    count:
      await getPostLikeCount(
        id
      ),
  };
}


/*
|--------------------------------------------------------------------------
| POST STATS
|--------------------------------------------------------------------------
*/

export async function getPostStats(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return {
      likes: 0,
      comments: 0,
      shares: 0,
    };
  }

  const [
    likes,
    comments,
    shares,
  ] =
    await Promise.all([
      getPostLikeCount(
        id
      ),

      getPostCommentCount(
        id
      ),

      getPostShareCount(
        id
      ),
    ]);

  return {
    likes,
    comments,
    shares,
  };
}


/*
|--------------------------------------------------------------------------
| COMMENTS
|--------------------------------------------------------------------------
*/

export async function getPostComments(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('post_comments')
    .select(`
      id,
      post_id,
      author_id,
      content,
      parent_id,
      media_url,
      media_type,
      created_at
    `)
    .eq(
      'post_id',
      id
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    );

  if (error) {
    console.error(
      'getPostComments error:',
      error
    );

    return [];
  }

  const rows =
    safeArray(data);

  const userIds = [
    ...new Set(
      rows
        .map(
          comment =>
            comment.author_id
        )
        .filter(Boolean)
    ),
  ];

  if (!userIds.length) {
    return rows;
  }

  const {
    data: profiles,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        avatar_url
      `)
      .in(
        'id',
        userIds
      );

  const profileMap =
    new Map(
      safeArray(
        profiles
      ).map(
        profile => [
          profile.id,
          profile,
        ]
      )
    );

  return rows.map(
    comment => ({
      ...comment,

      profile:
        profileMap.get(
          comment.author_id
        ) || null,

      author_name:
        profileMap.get(
          comment.author_id
        )?.full_name ||
        'NESBA Member',

      author_avatar:
        profileMap.get(
          comment.author_id
        )?.avatar_url ||
        null,
    })
  );
}


export async function getPostCommentCount(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('post_comments')
    .select(
      'id',
      {
        count:
          'exact',
        head:
          true,
      }
    )
    .eq(
      'post_id',
      id
    );

  if (error) {
    console.error(
      'getPostCommentCount error:',
      error
    );

    return 0;
  }

  return count || 0;
}


export async function createComment({
  postId,
  userId,
  content,
  parentId = null,
  mediaUrl = null,
  mediaType = null,
}) {
  const post =
    normalizeId(postId);

  const user =
    normalizeId(userId);

  const text =
    cleanText(content);

  if (!post) {
    throw new Error(
      'Missing post ID.'
    );
  }

  if (!user) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!text) {
    throw new Error(
      'Comment cannot be empty.'
    );
  }

  const payload = {
    post_id:
      post,

    author_id:
      user,

    content:
      text,

    parent_id:
      normalizeId(parentId),

    media_url:
      mediaUrl || null,

    media_type:
      mediaType || null,
  };

  const {
    data,
    error,
  } = await supabase
    .from('post_comments')
    .insert(
      payload
    )
    .select(`
      id,
      post_id,
      author_id,
      content,
      parent_id,
      media_url,
      media_type,
      created_at
    `)
    .single();

  if (error) {
    console.error(
      'createComment error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not create comment.'
    );
  }

  return data;
}


export async function uploadCommentMedia({
  userId,
  fileUri,
  fileName = 'comment-media.jpg',
  contentType = 'image/jpeg',
}) {
  const id = normalizeId(userId);

  if (!id || !fileUri) {
    throw new Error('Missing user ID or comment media.');
  }

  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('Could not read selected comment media.');
  }

  const blob = await response.blob();
  const extension = String(fileName).split('.').pop() || 'jpg';
  const path = `${id}/comments/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error } = await supabase.storage.from('posts').upload(path, blob, {
    contentType: contentType || 'image/jpeg',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message || 'Comment media upload failed.');
  }

  const { data } = supabase.storage.from('posts').getPublicUrl(path);
  const publicUrl = data?.publicUrl;

  if (!publicUrl) {
    throw new Error('Comment media URL could not be generated.');
  }

  return { path, url: publicUrl, publicUrl };
}


/*
|--------------------------------------------------------------------------
| SHARES
|--------------------------------------------------------------------------
*/

export async function getPostShareCount(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('post_shares')
    .select(
      'id',
      {
        count:
          'exact',
        head:
          true,
      }
    )
    .eq(
      'post_id',
      id
    );

  if (error) {
    console.error(
      'getPostShareCount error:',
      error
    );

    return 0;
  }

  return count || 0;
}


export async function createShare({
  postId,
  userId,
}) {
  const post =
    normalizeId(postId);

  const user =
    normalizeId(userId);

  if (!post || !user) {
    throw new Error(
      'Missing post ID or user ID.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('post_shares')
    .insert({
      post_id:
        post,

      user_id:
        user,
    })
    .select()
    .single();

  if (error) {
    console.error(
      'createShare error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not share post.'
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function createNotification({
  userId,
  actorId = null,
  type,
  title,
  message,
  entityId = null,
}) {
  const recipient =
    normalizeId(userId);

  if (!recipient) {
    return null;
  }

  const payload = {
    user_id:
      recipient,

    type:
      type ||
      'general',

    title:
      title ||
      'NESBA',

    body:
      message ||
      null,

    data: {
      actor_id:
        normalizeId(
          actorId
        ),

      entity_id:
        normalizeId(
          entityId
        ),
    },
  };

  const {
    data,
    error,
  } = await supabase
    .from('notifications')
    .insert(
      payload
    )
    .select()
    .single();

  if (error) {
    console.error(
      'createNotification error:',
      error
    );

    /*
     * Notifications should not break
     * the main action.
     */

    return null;
  }

  return data;
}
/*
|--------------------------------------------------------------------------
| STORIES
|--------------------------------------------------------------------------
*/

export async function uploadStoryMedia({
  userId,
  fileUri,
  fileName = 'story-image.jpg',
  contentType = 'image/jpeg',
}) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!fileUri) {
    throw new Error(
      'Missing story media.'
    );
  }

  const response =
    await fetch(
      fileUri
    );

  if (!response.ok) {
    throw new Error(
      'Could not read selected story media.'
    );
  }

  const blob =
    await response.blob();

  const extension =
    String(
      fileName
    )
      .split('.')
      .pop() ||
    'jpg';

  const path =
    `${id}/stories/${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

  const {
    error,
  } = await supabase
    .storage
    .from('stories')
    .upload(
      path,
      blob,
      {
        contentType:
          contentType ||
          'image/jpeg',

        upsert:
          false,
      }
    );

  if (error) {
    console.error(
      'uploadStoryMedia error:',
      error
    );

    throw new Error(
      error.message ||
      'Story upload failed.'
    );
  }

  const {
    data:
      publicData,
  } =
    supabase
      .storage
      .from('stories')
      .getPublicUrl(
        path
      );

  const publicUrl =
    publicData?.publicUrl;

  if (!publicUrl) {
    throw new Error(
      'Story uploaded but no public URL was generated.'
    );
  }

  return {
    path,
    url:
      publicUrl,
    publicUrl,
  };
}


export async function uploadStoryAudio({
  userId,
  fileUri,
  fileName = 'story-audio.m4a',
  contentType = 'audio/m4a',
}) {
  return uploadStoryMedia({
    userId,
    fileUri,
    fileName,
    contentType,
  });
}


export async function createStory({
  userId,
  mediaUrl,
  mediaType = 'image',
  caption = null,
  filterName = 'normal',
  overlayText = '',
  locationText = '',
  audioUrl = null,
  audioName = null,
}) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!mediaUrl) {
    throw new Error(
      'Missing story media URL.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('stories')
    .insert({
      user_id:
        id,

      media_url:
        mediaUrl,

      media_type:
        mediaType,

      caption:
        cleanText(caption) || null,

      filter_name:
        filterName || 'normal',

      overlay_text:
        cleanText(overlayText) || null,

      location_text:
        cleanText(locationText) || null,

      audio_url:
        audioUrl || null,

      audio_name:
        cleanText(audioName) || null,

      expires_at:
        new Date(
          Date.now() +
          24 * 60 * 60 * 1000
        ).toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error(
      'createStory error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not create story.'
    );
  }

  return data;
}


export async function getStoryGroups(
  currentUserId = null
) {
  const now =
    new Date()
      .toISOString();

  const {
    data: stories,
    error,
  } = await supabase
    .from('stories')
    .select(`
      id,
      user_id,
      media_url,
      media_type,
      caption,
      filter_name,
      overlay_text,
      location_text,
      audio_url,
      audio_name,
      created_at,
      expires_at
    `)
    .gt(
      'expires_at',
      now
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    );

  if (error) {
    console.error(
      'getStoryGroups error:',
      error
    );

    return [];
  }

  const rows =
    safeArray(stories);

  if (!rows.length) {
    return [];
  }

  const userIds = [
    ...new Set(
      rows
        .map(
          story =>
            story.user_id
        )
        .filter(Boolean)
    ),
  ];

  const {
    data: profiles,
    error:
      profileError,
  } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      avatar_url
    `)
    .in(
      'id',
      userIds
    );

  if (profileError) {
    console.error(
      'getStoryGroups profile error:',
      profileError
    );
  }

  const profileMap =
    new Map(
      safeArray(
        profiles
      ).map(
        profile => [
          profile.id,
          profile,
        ]
      )
    );

  const groups =
    new Map();

  rows.forEach(
    story => {
      if (
        !groups.has(
          story.user_id
        )
      ) {
        const profile =
          profileMap.get(
            story.user_id
          );

        groups.set(
          story.user_id,
          {
            userId:
              story.user_id,

            fullName:
              profile?.full_name ||
              'NESBA Member',

            avatarUrl:
              profile?.avatar_url ||
              null,

            stories: [],
          }
        );
      }

      groups
        .get(
          story.user_id
        )
        .stories
        .push({
          ...story,
          userId:
            story.user_id,
        });
    }
  );

  return Array.from(
    groups.values()
  );
}


export async function getStoriesByUser(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('stories')
    .select(`
      id,
      user_id,
      media_url,
      media_type,
      caption,
      filter_name,
      overlay_text,
      location_text,
      audio_url,
      audio_name,
      created_at,
      expires_at
    `)
    .eq(
      'user_id',
      id
    )
    .gt(
      'expires_at',
      new Date()
        .toISOString()
    )
    .order(
      'created_at',
      {
        ascending:
          true,
      }
    );

  if (error) {
    console.error(
      'getStoriesByUser error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
|--------------------------------------------------------------------------
| COURSES
|--------------------------------------------------------------------------
*/

export async function getCourses({
  limit = 20,
  offset = 0,
} = {}) {
  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .range(
      offset,
      offset + limit - 1
    );

  if (error) {
    console.error(
      'getCourses error:',
      error
    );

    return [];
  }

  return safeArray(data)
    .filter(course =>
      course?.is_published !== false
    )
    .map(course => ({
      ...course,
      thumbnail_url:
        course?.thumbnail_url ||
        course?.thumbnail ||
        null,
      title:
        course?.title ||
        course?.name ||
        'NESBA Course',
      description:
        course?.description ||
        course?.short_description ||
        '',
    }));
}


export async function getTrendingCourses(
  limit = 10
) {
  /*
   * Ranked by get_course_discovery_stats (recent and total
   * enrollments plus ratings). Falls back to newest first
   * if the ranking cannot be loaded.
   */

  const courses =
    await getCourses({
      limit: Math.max(
        limit,
        50
      ),
      offset: 0,
    });

  const {
    data: ranking,
    error,
  } = await supabase.rpc(
    'get_course_discovery_stats',
    {
      p_limit: 200,
    }
  );

  if (error) {
    console.error(
      'getTrendingCourses ranking error:',
      error
    );

    return courses.slice(
      0,
      limit
    );
  }

  const rank = new Map(
    safeArray(ranking).map(
      (row, index) => [
        row.course_id,
        index,
      ]
    )
  );

  return [...courses]
    .sort(
      (a, b) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
    )
    .slice(
      0,
      limit
    );
}


export async function getCourse(
  courseId
) {
  const id =
    normalizeId(courseId);

  if (!id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .select('*')
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (error) {
    console.error(
      'getCourse error:',
      error
    );

    return null;
  }

  return data || null;
}

/*
|--------------------------------------------------------------------------
| COURSE HELPERS
|--------------------------------------------------------------------------
*/

export function getCourseTitle(
  course
) {
  return (
    course?.title ||
    course?.name ||
    'Untitled Course'
  );
}


export function getCourseDescription(
  course
) {
  return (
    course?.description ||
    ''
  );
}


/*
|--------------------------------------------------------------------------
| LEARNING PROGRESS
|--------------------------------------------------------------------------
*/

export async function getCourseProgress({
  userId,
  courseId,
}) {
  const user =
    normalizeId(userId);

  const course =
    normalizeId(courseId);

  if (
    !user ||
    !course
  ) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('course_progress')
    .select('*')
    .eq(
      'user_id',
      user
    )
    .eq(
      'course_id',
      course
    )
    .maybeSingle();

  if (error) {
    console.error(
      'getCourseProgress error:',
      error
    );

    return null;
  }

  return data || null;
}


export async function updateCourseProgress({
  userId,
  courseId,
  progress = 0,
  completed = false,
}) {
  const user =
    normalizeId(userId);

  const course =
    normalizeId(courseId);

  if (
    !user ||
    !course
  ) {
    throw new Error(
      'Missing user ID or course ID.'
    );
  }

  const payload = {
    user_id:
      user,

    course_id:
      course,

    progress:
      Number(
        progress
      ) || 0,

    completed:
      Boolean(
        completed
      ),

    updated_at:
      new Date()
        .toISOString(),
  };

  const {
    data,
    error,
  } = await supabase
    .from('course_progress')
    .upsert(
      payload,
      {
        onConflict:
          'user_id,course_id',
      }
    )
    .select()
    .single();

  if (error) {
    console.error(
      'updateCourseProgress error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not update course progress.'
    );
  }

  return data;
}


/*
 * Marks a lesson complete for the signed-in learner.
 *
 * The database recomputes course progress and, at 100%,
 * issues the certificate and any badges earned.
 *
 * Returns { progress_percent, course_completed, certificate_id }.
 */
export async function completeLesson(
  moduleId
) {
  const id =
    normalizeId(moduleId);

  if (!id) {
    throw new Error(
      'Missing lesson ID.'
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'mark_lesson_complete',
    {
      p_module_id: id,
    }
  );

  if (error) {
    console.error(
      'completeLesson error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not save lesson progress.'
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| BADGES
|--------------------------------------------------------------------------
*/

export async function getUserBadges(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('user_badges')
    .select(`
      id,
      user_id,
      badge_id,
      earned_at:awarded_at,
      awarded_at,
      badges (
        id,
        name,
        description,
        icon_url
      )
    `)
    .eq(
      'user_id',
      id
    )
    .order(
      'awarded_at',
      {
        ascending:
          false,
      }
    );

  if (error) {
    console.error(
      'getUserBadges error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
|--------------------------------------------------------------------------
| CERTIFICATES
|--------------------------------------------------------------------------
*/

export async function getUserCertificates(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('certificates')
    .select(`
      id,
      user_id,
      course_id,
      certificate_id,
      issued_at,
      courses (
        id,
        title,
        teacher_name
      )
    `)
    .eq(
      'user_id',
      id
    )
    .order(
      'issued_at',
      {
        ascending:
          false,
      }
    );

  if (error) {
    console.error(
      'getUserCertificates error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
|--------------------------------------------------------------------------
| SEARCH
|--------------------------------------------------------------------------
*/

export async function searchPosts(
  query = ''
) {
  const search =
    cleanText(query);

  if (!search) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      content,
      image_url,
      video_url,
      link_url,
      visibility,
      created_at
    `)
    .eq(
      'visibility',
      'public'
    )
    .ilike(
      'content',
      `%${search}%`
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    )
    .limit(20);

  if (error) {
    console.error(
      'searchPosts error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


export async function searchCourses(
  query = ''
) {
  const search =
    cleanText(query).toLowerCase();

  if (!search) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .select('*')
    .limit(100);

  if (error) {
    console.error(
      'searchCourses error:',
      error
    );

    return [];
  }

  return safeArray(data)
    .filter(course =>
      course?.is_published !== false
    )
    .filter(course => {
      const title =
        String(
          course?.title ||
          course?.name ||
          ''
        ).toLowerCase();

      const description =
        String(
          course?.description ||
          course?.short_description ||
          ''
        ).toLowerCase();

      const category =
        String(
          course?.category ||
          course?.category_name ||
          ''
        ).toLowerCase();

      return (
        title.includes(search) ||
        description.includes(search) ||
        category.includes(search)
      );
    })
    .slice(0, 20);
}

export async function searchAll(
  query = ''
) {
  const search =
    cleanText(query);

  if (!search) {
    return {
      users: [],
      courses: [],
      posts: [],
    };
  }

  const [
    users,
    courses,
    posts,
  ] =
    await Promise.all([
      searchUsers(
        search
      ),

      searchCourses(
        search
      ),

      searchPosts(
        search
      ),
    ]);

  return {
    users:
      safeArray(
        users
      ),

    courses:
      safeArray(
        courses
      ),

    posts:
      safeArray(
        posts
      ),
  };
}


/*
|--------------------------------------------------------------------------
| HOME DATA
|--------------------------------------------------------------------------
*/

export async function getHomeData(
  userId = null
) {
  const id =
    normalizeId(userId);

  const [
    posts,
    stories,
    trendingCourses,
    suggestedUsers,
  ] =
    await Promise.all([
      getPosts({
        userId:
          id,

        limit:
          30,

        offset:
          0,
      }),

      getStoryGroups(
        id
      ),

      getTrendingCourses(
        10
      ),

      getSuggestedUsers(
        id
      ),
    ]);

  return {
    posts:
      safeArray(
        posts
      ),

    stories:
      safeArray(
        stories
      ),

    trendingCourses:
      safeArray(
        trendingCourses
      ),

    suggestedUsers:
      safeArray(
        suggestedUsers
      ),
  };
}


/*
|--------------------------------------------------------------------------
| OPEN PROFILE HELPER
|--------------------------------------------------------------------------
*/

export function getPostAuthorName(
  post
) {
  return (
    post?.author?.full_name ||
    post?.author_name ||
    'NESBA Member'
  );
}


export function getPostAvatar(
  post
) {
  return (
    post?.author?.avatar_url ||
    post?.author_avatar ||
    null
  );
}


/*
|--------------------------------------------------------------------------
| TIME FORMATTER
|--------------------------------------------------------------------------
*/

export function formatTime(
  value
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const now =
    Date.now();

  const difference =
    Math.max(
      0,
      now -
      date.getTime()
    );

  const seconds =
    Math.floor(
      difference /
      1000
    );

  if (
    seconds < 60
  ) {
    return 'Just now';
  }

  const minutes =
    Math.floor(
      seconds /
      60
    );

  if (
    minutes < 60
  ) {
    return `${minutes}m`;
  }

  const hours =
    Math.floor(
      minutes /
      60
    );

  if (
    hours < 24
  ) {
    return `${hours}h`;
  }

  const days =
    Math.floor(
      hours /
      24
    );

  if (
    days < 7
  ) {
    return `${days}d`;
  }

  return date.toLocaleDateString();
}


/*
|--------------------------------------------------------------------------
| INITIALS
|--------------------------------------------------------------------------
*/

export function getInitials(
  name
) {
  const text =
    cleanText(
      name
    );

  if (!text) {
    return 'N';
  }

  const parts =
    text
      .split(
        /\s+/
      )
      .filter(Boolean);

  if (
    parts.length === 1
  ) {
    return parts[0]
      .substring(
        0,
        2
      )
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[
      parts.length - 1
    ][0]
  ).toUpperCase();
}
/*
|--------------------------------------------------------------------------
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

export async function getNotifications(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('notifications')
    .select(`
      id,
      user_id,
      type,
      title,
      message:body,
      body,
      data,
      read_at,
      created_at
    `)
    .eq(
      'user_id',
      id
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    )
    .limit(50);

  if (error) {
    console.error(
      'getNotifications error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


export async function markNotificationRead(
  notificationId
) {
  const id =
    normalizeId(
      notificationId
    );

  if (!id) {
    return false;
  }

  const {
    error,
  } = await supabase
    .from('notifications')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'id',
      id
    );

  if (error) {
    console.error(
      'markNotificationRead error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not mark notification as read.'
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| STORY VIEWS
|--------------------------------------------------------------------------
*/

export async function markStoryViewed({
  storyId,
  userId,
}) {
  const story =
    normalizeId(
      storyId
    );

  const user =
    normalizeId(
      userId
    );

  if (
    !story ||
    !user
  ) {
    return false;
  }

  /*
   * If your project has a story_views
   * table, record the view.
   *
   * If the table does not exist yet,
   * don't let viewing a story crash
   * the application.
   */

  try {
    const {
      error,
    } = await supabase
      .from('story_views')
      .upsert(
        {
          story_id:
            story,

          viewer_id:
            user,

          viewed_at:
            new Date()
              .toISOString(),
        },
        {
          onConflict:
            'story_id,viewer_id',

          // Repeat views are skipped. Updating them would need an
          // UPDATE policy on story_views, which viewers do not have.
          ignoreDuplicates:
            true,
        }
      );

    if (error) {
      console.error(
        'markStoryViewed error:',
        error
      );

      return false;
    }

    return true;
  } catch (
    error
  ) {
    console.error(
      'markStoryViewed exception:',
      error
    );

    return false;
  }
}


/*
|--------------------------------------------------------------------------
| DELETE STORY
|--------------------------------------------------------------------------
*/

export async function deleteStory(
  storyId,
  userId
) {
  const story =
    normalizeId(
      storyId
    );

  const user =
    normalizeId(
      userId
    );

  if (
    !story ||
    !user
  ) {
    throw new Error(
      'Missing story ID or user ID.'
    );
  }

  const {
    error,
  } = await supabase
    .from('stories')
    .delete()
    .eq(
      'id',
      story
    )
    .eq(
      'user_id',
      user
    );

  if (error) {
    console.error(
      'deleteStory error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not delete story.'
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| USER POSTS
|--------------------------------------------------------------------------
*/

export async function getUserPosts(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      organization_id,
      content,
      image_url,
      video_url,
      link_url,
      visibility,
      created_at,
      updated_at
    `)
    .eq(
      'author_id',
      id
    )
    .order(
      'created_at',
      {
        ascending:
          false,
      }
    )
    .limit(50);

  if (error) {
    console.error(
      'getUserPosts error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
|--------------------------------------------------------------------------
| POST BY ID
|--------------------------------------------------------------------------
*/

export async function getPostById(
  postId
) {
  const id =
    normalizeId(postId);

  if (!id) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('posts')
    .select(`
      id,
      author_id,
      organization_id,
      content,
      image_url,
      video_url,
      link_url,
      visibility,
      created_at,
      updated_at
    `)
    .eq(
      'id',
      id
    )
    .maybeSingle();

  if (error) {
    console.error(
      'getPostById error:',
      error
    );

    return null;
  }

  return data || null;
}


/*
|--------------------------------------------------------------------------
| MEDIA HELPERS
|--------------------------------------------------------------------------
*/

export async function removePostImage(
  path
) {
  if (!path) {
    return false;
  }

  const {
    error,
  } = await supabase
    .storage
    .from('posts')
    .remove([
      path,
    ]);

  if (error) {
    console.error(
      'removePostImage error:',
      error
    );

    return false;
  }

  return true;
}


export async function removeStoryMedia(
  path
) {
  if (!path) {
    return false;
  }

  const {
    error,
  } = await supabase
    .storage
    .from('stories')
    .remove([
      path,
    ]);

  if (error) {
    console.error(
      'removeStoryMedia error:',
      error
    );

    return false;
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| PROFILE MEDIA
|--------------------------------------------------------------------------
*/

export async function uploadProfileImage({
  userId,
  fileUri,
  fileName = 'avatar.jpg',
  contentType = 'image/jpeg',
}) {
  const id =
    normalizeId(userId);

  if (!id) {
    throw new Error(
      'Missing user ID.'
    );
  }

  if (!fileUri) {
    throw new Error(
      'Missing profile image.'
    );
  }

  const response =
    await fetch(
      fileUri
    );

  if (!response.ok) {
    throw new Error(
      'Could not read selected profile image.'
    );
  }

  const blob =
    await response.blob();

  const extension =
    String(
      fileName
    )
      .split('.')
      .pop() ||
    'jpg';

  const path =
    `${id}/avatar-${Date.now()}.${extension}`;

  const {
    error,
  } = await supabase
    .storage
    .from('avatars')
    .upload(
      path,
      blob,
      {
        contentType:
          contentType ||
          'image/jpeg',

        upsert:
          true,
      }
    );

  if (error) {
    console.error(
      'uploadProfileImage error:',
      error
    );

    throw new Error(
      error.message ||
      'Profile image upload failed.'
    );
  }

  const {
    data:
      publicData,
  } =
    supabase
      .storage
      .from('avatars')
      .getPublicUrl(
        path
      );

  const publicUrl =
    publicData?.publicUrl;

  if (!publicUrl) {
    throw new Error(
      'Profile image uploaded but no public URL was generated.'
    );
  }

  await updateUserProfile(
    id,
    {
      avatar_url:
        publicUrl,
    }
  );

  return {
    path,
    url:
      publicUrl,
    publicUrl,
  };
}


/*
|--------------------------------------------------------------------------
| USER STATS
|--------------------------------------------------------------------------
*/

export async function getUserStats(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return {
      followers: 0,
      following: 0,
      posts: 0,
      courses: 0,
    };
  }

  const [
    followers,
    following,
    posts,
    courses,
  ] =
    await Promise.all([
      supabase
        .from('follows')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'followed_user_id',
          id
        ),

      supabase
        .from('follows')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'follower_id',
          id
        ),

      supabase
        .from('posts')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'author_id',
          id
        ),

      supabase
        .from('courses')
        .select(
          'id',
          {
            count:
              'exact',
            head:
              true,
          }
        )
        .eq(
          'teacher_id',
          id
        ),
    ]);

  return {
    followers:
      followers.count ||
      0,

    following:
      following.count ||
      0,

    posts:
      posts.count ||
      0,

    courses:
      courses.count ||
      0,
  };
}


/*
|--------------------------------------------------------------------------
| AUTH STATE LISTENER
|--------------------------------------------------------------------------
*/

export function onAuthStateChange(
  callback
) {
  return supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {
      if (
        typeof callback ===
        'function'
      ) {
        callback(
          event,
          session
        );
      }
    }
  );
}


/*
|--------------------------------------------------------------------------
| SIGN OUT
|--------------------------------------------------------------------------
*/

export async function signOut() {
  const {
    error,
  } =
    await supabase.auth.signOut();

  if (error) {
    console.error(
      'signOut error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not sign out.'
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| DEFAULT HOME REFRESH
|--------------------------------------------------------------------------
*/

export async function refreshHome(
  userId
) {
  return getHomeData(
    userId
  );
}


/*
|--------------------------------------------------------------------------
| END OF NESBA DATA LAYER
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| COMPATIBILITY API
|--------------------------------------------------------------------------
|
| These functions keep the current screens on one consistent
| data-layer API.
|--------------------------------------------------------------------------
*/

export async function getActiveStories() {
  const groups =
    await getStoryGroups();

  return safeArray(groups).flatMap(
    group =>
      safeArray(group?.stories).map(
        story => ({
          ...story,

          user_id:
            story?.user_id ||
            group?.userId,

          profiles: {
            id:
              group?.userId,

            full_name:
              group?.fullName ||
              'NESBA Member',

            avatar_url:
              group?.avatarUrl ||
              null,
          },
        })
      )
  );
}


export async function getStory(
  storyId
) {
  const id =
    normalizeId(storyId);

  if (!id) {
    return null;
  }

  const stories =
    await getActiveStories();

  return (
    stories.find(
      story =>
        String(story?.id) ===
        String(id)
    ) || null
  );
}


export async function getPost(
  postId,
  viewerId = null
) {
  const post =
    await getPostById(
      postId
    );

  if (!post) {
    return null;
  }

  const posts =
    await getPosts({
      userId:
        viewerId,
      limit:
        100,
      offset:
        0,
    });

  const enriched =
    posts.find(
      item =>
        String(item?.id) ===
        String(post.id)
    ) || post;

  const [
    liked,
    likes,
    comments,
  ] = await Promise.all([
    viewerId
      ? hasLikedPost(
          post.id,
          viewerId
        )
      : false,

    getPostLikeCount(
      post.id
    ),

    getPostCommentCount(
      post.id
    ),
  ]);

  return {
    ...enriched,
    liked,
    likes,
    comments,
  };
}


export async function createPostComment(
  postId,
  content,
  userId = null,
  parentId = null,
  mediaUrl = null,
  mediaType = null
) {
  const id =
    normalizeId(
      userId
    ) ||
    await getCurrentUserId();

  return createComment({
    postId,
    userId: id,
    content,
    parentId,
    mediaUrl,
    mediaType,
  });
}


/*
|--------------------------------------------------------------------------
| PUBLIC PROFILE COMPATIBILITY
|--------------------------------------------------------------------------
*/

export async function getPublicProfilePosts(
  userId
) {
  return getUserPosts(
    userId
  );
}


export async function getPublicProfileCourses(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  /*
   * Support either creator_id or teacher_id
   * without breaking if one field is absent.
   */

  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .select('*')
    .limit(100);

  if (error) {
    console.error(
      'getPublicProfileCourses error:',
      error
    );

    return [];
  }

  return safeArray(data)
    .filter(course =>
      course?.creator_id === id ||
      course?.teacher_id === id
    )
    .map(course => ({
      ...course,

      title:
        course?.title ||
        course?.name ||
        'NESBA Course',

      thumbnail_url:
        course?.thumbnail_url ||
        null,
    }));
}


export async function getPublicProfileCompletedCourses(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  try {
    const {
      data,
      error,
    } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses (*)
      `)
      .eq(
        'user_id',
        id
      )
      .gte(
        'progress_percent',
        100
      );

    if (error) {
      console.error(
        'getPublicProfileCompletedCourses error:',
        error
      );

      return [];
    }

    return safeArray(data);
  } catch (
    error
  ) {
    console.error(
      'getPublicProfileCompletedCourses exception:',
      error
    );

    return [];
  }
}


export async function getPublicProfileCertificates(
  userId
) {
  return getUserCertificates(
    userId
  );
}


export async function getPublicProfileBadges(
  userId
) {
  return getUserBadges(
    userId
  );
}


export async function getPublicProfileAudio(
  userId
) {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('media_items')
      .select('*')
      .eq(
        'creator_id',
        normalizeId(userId)
      )
      .in(
        'media_type',
        [
          'podcast_episode',
          'audio_lesson',
        ]
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        'getPublicProfileAudio error:',
        error
      );

      return [];
    }

    return safeArray(data);
  } catch (
    error
  ) {
    return [];
  }
}


export async function getPublicProfileLectures(
  userId
) {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('media_items')
      .select('*')
      .eq(
        'creator_id',
        normalizeId(userId)
      )
      .eq(
        'media_type',
        'recording'
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        'getPublicProfileLectures error:',
        error
      );

      return [];
    }

    return safeArray(data);
  } catch (
    error
  ) {
    return [];
  }
}


// Shares are not recorded yet (there is no post_shares table),
// so profiles always show an empty Shares list.
export async function getPublicProfileShares() {
  return [];
}


/*
|--------------------------------------------------------------------------
| EVENTS
|--------------------------------------------------------------------------
*/

const EVENT_SELECT =
  '*, organizations(name), host:profiles!events_host_id_fkey(full_name,avatar_url), live_audio_rooms(id,status)';

/*
 * Upcoming and live events, soonest first.
 * Events that started more than a day ago and are not live are hidden.
 */
export async function getEvents({
  limit = 50,
} = {}) {
  const since = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const {
    data,
    error,
  } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .in(
      'status',
      [
        'scheduled',
        'live',
      ]
    )
    .or(
      `status.eq.live,starts_at.gte."${since}"`
    )
    .order(
      'starts_at',
      {
        ascending: true,
      }
    )
    .limit(limit);

  if (error) {
    console.error(
      'getEvents error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not load events.'
    );
  }

  return safeArray(data).map(
    (event) => ({
      ...event,

      liveRoom:
        safeArray(
          event.live_audio_rooms
        ).find(
          (room) =>
            room.status === 'live'
        ) || null,
    })
  );
}


/*
 * Events whose host is live right now, newest first. Anyone can see that an
 * event is live; joining the room still needs an account.
 */
export async function getLiveNowEvents({
  limit = 10,
} = {}) {
  const {
    data,
    error,
  } = await supabase
    .from('events')
    .select(EVENT_SELECT)
    .eq('status', 'live')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(
      error.message ||
      'Could not load live sessions.'
    );
  }

  return safeArray(data).map(
    (event) => ({
      ...event,

      liveRoom:
        safeArray(
          event.live_audio_rooms
        ).find(
          (room) =>
            room.status === 'live'
        ) || null,
    })
  );
}


export async function createEvent({
  title,
  description = '',
  eventType = 'live_class',
  startsAt,
  durationMinutes = 60,
  meetingUrl = null,
  capacity = null,
  priceCents = 0,
}) {
  const hostId =
    await getCurrentUserId();

  if (!hostId) {
    throw new Error(
      'Please log in to schedule an event.'
    );
  }

  const start =
    new Date(startsAt);

  if (
    Number.isNaN(
      start.getTime()
    )
  ) {
    throw new Error(
      'Enter a valid date and time.'
    );
  }

  const minutes =
    Number(durationMinutes) || 60;

  const {
    data,
    error,
  } = await supabase
    .from('events')
    .insert({
      title:
        title.trim(),

      description:
        description.trim() ||
        null,

      event_type:
        eventType,

      starts_at:
        start.toISOString(),

      ends_at:
        new Date(
          start.getTime() +
          minutes * 60 * 1000
        ).toISOString(),

      meeting_url:
        meetingUrl?.trim() ||
        null,

      capacity:
        capacity
          ? Number(capacity)
          : null,

      host_id:
        hostId,

      price_cents:
        priceCents || 0,

      status:
        'scheduled',
    })
    .select()
    .single();

  if (error) {
    console.error(
      'createEvent error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not schedule the event.'
    );
  }

  return data;
}


export async function getMyEventRegistrations(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return new Set();
  }

  const {
    data,
    error,
  } = await supabase
    .from('event_registrations')
    .select('event_id')
    .eq(
      'user_id',
      id
    );

  if (error) {
    console.error(
      'getMyEventRegistrations error:',
      error
    );

    return new Set();
  }

  return new Set(
    safeArray(data).map(
      (row) => row.event_id
    )
  );
}


export async function isRegisteredForEvent(
  eventId,
  userId
) {
  const registrations =
    await getMyEventRegistrations(
      userId
    );

  return registrations.has(
    normalizeId(eventId)
  );
}


/*
 * Registers or unregisters the user.
 * Returns true when the user is now registered.
 */
export async function toggleEventRegistration(
  eventId,
  userId
) {
  const event =
    normalizeId(eventId);

  const user =
    normalizeId(userId);

  if (
    !event ||
    !user
  ) {
    throw new Error(
      'Missing event or user.'
    );
  }

  const {
    data: existing,
    error: lookupError,
  } = await supabase
    .from('event_registrations')
    .select('id')
    .eq(
      'event_id',
      event
    )
    .eq(
      'user_id',
      user
    )
    .maybeSingle();

  if (lookupError) {
    throw new Error(
      lookupError.message
    );
  }

  if (existing) {
    const {
      error,
    } = await supabase
      .from('event_registrations')
      .delete()
      .eq(
        'id',
        existing.id
      );

    if (error) {
      throw new Error(
        error.message
      );
    }

    return false;
  }

  const {
    error,
  } = await supabase
    .from('event_registrations')
    .insert({
      event_id:
        event,

      user_id:
        user,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  return true;
}


/*
|--------------------------------------------------------------------------
| LIVE AUDIO ROOMS
|--------------------------------------------------------------------------
|
| Hosts start and end rooms; attendees join as listeners and the host can
| promote them to speakers. Roles are enforced in the database, and the
| livekit-token edge function only lets hosts and speakers publish audio.
*/

async function callLiveRpc(
  name,
  params,
  fallbackMessage
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    name,
    params
  );

  if (error) {
    console.error(
      `${name} error:`,
      error
    );

    throw new Error(
      error.message ||
      fallbackMessage
    );
  }

  return data;
}


export function startLiveRoom(
  eventId
) {
  return callLiveRpc(
    'start_live_room',
    {
      p_event_id:
        normalizeId(eventId),
    },
    'Could not start the live session.'
  );
}


export function joinLiveRoom(
  roomId
) {
  return callLiveRpc(
    'join_live_room',
    {
      p_room_id:
        normalizeId(roomId),
    },
    'Could not join the live session.'
  );
}


export function endLiveRoom(
  roomId
) {
  return callLiveRpc(
    'end_live_room',
    {
      p_room_id:
        normalizeId(roomId),
    },
    'Could not end the live session.'
  );
}


export function setLiveParticipantRole(
  roomId,
  userId,
  role
) {
  return callLiveRpc(
    'set_live_participant_role',
    {
      p_room_id:
        normalizeId(roomId),

      p_user_id:
        normalizeId(userId),

      p_role:
        role,
    },
    'Could not change the participant role.'
  );
}


export async function getLiveRoom(
  roomId
) {
  const {
    data,
    error,
  } = await supabase
    .from('live_audio_rooms')
    .select(
      '*, events(id,title,description,host_id)'
    )
    .eq(
      'id',
      normalizeId(roomId)
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ||
      'Could not load the live room.'
    );
  }

  return data;
}


/*
 * People currently in the room (left_at is null), host first,
 * then speakers, then raised hands, then listeners.
 */
export async function getLiveParticipants(
  roomId
) {
  const {
    data,
    error,
  } = await supabase
    .from('live_audio_participants')
    .select(
      'id,user_id,role,hand_raised,is_muted,joined_at,profiles(full_name,avatar_url)'
    )
    .eq(
      'room_id',
      normalizeId(roomId)
    )
    .is(
      'left_at',
      null
    )
    .order(
      'joined_at',
      {
        ascending: true,
      }
    );

  if (error) {
    throw new Error(
      error.message ||
      'Could not load participants.'
    );
  }

  const rank = {
    host: 0,
    speaker: 1,
    listener: 2,
  };

  return safeArray(data).sort(
    (a, b) =>
      (rank[a.role] ?? 3) -
        (rank[b.role] ?? 3) ||
      Number(b.hand_raised) -
        Number(a.hand_raised)
  );
}


export async function updateMyLiveParticipation(
  roomId,
  userId,
  changes
) {
  const {
    error,
  } = await supabase
    .from('live_audio_participants')
    .update(changes)
    .eq(
      'room_id',
      normalizeId(roomId)
    )
    .eq(
      'user_id',
      normalizeId(userId)
    );

  if (error) {
    throw new Error(
      error.message ||
      'Could not update your participation.'
    );
  }
}


export function leaveLiveRoom(
  roomId,
  userId
) {
  return updateMyLiveParticipation(
    roomId,
    userId,
    {
      left_at:
        new Date().toISOString(),

      hand_raised:
        false,
    }
  );
}


/*
|--------------------------------------------------------------------------
| DIRECT MESSAGES
|--------------------------------------------------------------------------
*/

const DIRECT_MESSAGE_SELECT =
  'id,sender_id,recipient_id,content,created_at,read_at,message_type,media_url';

/*
 * One row per conversation partner: the latest message, the partner's
 * profile (person) and how many of their messages are unread.
 */
export async function getInbox(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('direct_messages')
    .select(DIRECT_MESSAGE_SELECT)
    .or(
      `sender_id.eq.${id},recipient_id.eq.${id}`
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(500);

  if (error) {
    console.error(
      'getInbox error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not load messages.'
    );
  }

  const conversations =
    new Map();

  safeArray(data).forEach(
    (message) => {
      const personId =
        message.sender_id === id
          ? message.recipient_id
          : message.sender_id;

      if (
        !conversations.has(
          personId
        )
      ) {
        conversations.set(
          personId,
          {
            ...message,

            content:
              message.content ||
              (message.message_type &&
              message.message_type !== 'text'
                ? '📎 Attachment'
                : ''),

            personId,

            unreadCount:
              0,
          }
        );
      }

      if (
        message.recipient_id === id &&
        !message.read_at
      ) {
        conversations.get(
          personId
        ).unreadCount += 1;
      }
    }
  );

  const personIds = [
    ...conversations.keys(),
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
    console.error(
      'getInbox profiles error:',
      profileError
    );
  }

  const people =
    Object.fromEntries(
      safeArray(profiles).map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  // Map insertion order is newest conversation first.
  return [
    ...conversations.values(),
  ].map(
    (conversation) => ({
      ...conversation,

      person:
        people[
          conversation.personId
        ] || null,
    })
  );
}


/*
 * Full conversation between two users, oldest first.
 */
export async function getDirectMessages(
  userId,
  otherUserId
) {
  const me =
    normalizeId(userId);

  const other =
    normalizeId(otherUserId);

  if (
    !me ||
    !other
  ) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('direct_messages')
    .select(DIRECT_MESSAGE_SELECT)
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`
    )
    .order(
      'created_at',
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      'getDirectMessages error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not load the conversation.'
    );
  }

  return safeArray(data);
}


export async function sendDirectMessage(
  recipientId,
  content
) {
  const senderId =
    await getCurrentUserId();

  const recipient =
    normalizeId(recipientId);

  if (!senderId) {
    throw new Error(
      'Please log in first.'
    );
  }

  if (!recipient) {
    throw new Error(
      'Missing recipient.'
    );
  }

  if (
    senderId === recipient
  ) {
    throw new Error(
      'You cannot message yourself.'
    );
  }

  const text =
    String(
      content || ''
    ).trim();

  if (!text) {
    throw new Error(
      'Message cannot be empty.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('direct_messages')
    .insert({
      sender_id:
        senderId,

      recipient_id:
        recipient,

      content:
        text,
    })
    .select(DIRECT_MESSAGE_SELECT)
    .single();

  if (error) {
    console.error(
      'sendDirectMessage error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not send the message.'
    );
  }

  return data;
}


/*
 * Marks every unread message from otherUserId to userId as read.
 */
export async function markDirectMessagesRead(
  userId,
  otherUserId
) {
  const me =
    normalizeId(userId);

  const other =
    normalizeId(otherUserId);

  if (
    !me ||
    !other
  ) {
    return;
  }

  const {
    error,
  } = await supabase
    .from('direct_messages')
    .update({
      read_at:
        new Date().toISOString(),
    })
    .eq(
      'sender_id',
      other
    )
    .eq(
      'recipient_id',
      me
    )
    .is(
      'read_at',
      null
    );

  if (error) {
    console.error(
      'markDirectMessagesRead error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not mark messages as read.'
    );
  }
}


/*
|--------------------------------------------------------------------------
| COURSE BUILDER
|--------------------------------------------------------------------------
|
| Used by Creator Studio. A course has sections; each section has lessons
| (course_modules); each lesson has content items (lesson_content).
| Teachers can only write to courses where they are teacher_id (RLS).
*/

function courseBuilderError(
  label,
  error,
  fallbackMessage
) {
  console.error(
    `${label} error:`,
    error
  );

  return new Error(
    error?.message ||
    fallbackMessage
  );
}


export async function getCategories() {
  const {
    data,
    error,
  } = await supabase
    .from('categories')
    .select('id,name')
    .order(
      'name',
      {
        ascending: true,
      }
    );

  if (error) {
    throw courseBuilderError(
      'getCategories',
      error,
      'Could not load categories.'
    );
  }

  return safeArray(data);
}


/*
 * Courses the user teaches, newest first, drafts included.
 */
export async function getMyCourses(
  userId
) {
  const id =
    normalizeId(userId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .select(
      'id,title,description,thumbnail_url,difficulty,category_id,is_published,published_at,lesson_count,duration_minutes,created_at,updated_at'
    )
    .eq(
      'teacher_id',
      id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    );

  if (error) {
    throw courseBuilderError(
      'getMyCourses',
      error,
      'Could not load your courses.'
    );
  }

  return safeArray(data);
}


export async function createCourse({
  title,
  description = '',
  difficulty = 'beginner',
  thumbnailUrl = null,
  categoryId = null,
  isPublished = false,
  isPremium = false,
}) {
  const teacherId =
    await getCurrentUserId();

  if (!teacherId) {
    throw new Error(
      'Please log in before creating a course.'
    );
  }

  if (
    !String(
      title || ''
    ).trim()
  ) {
    throw new Error(
      'Course title is required.'
    );
  }

  const {
    data: profile,
  } = await supabase
    .from('profiles')
    .select('full_name')
    .eq(
      'id',
      teacherId
    )
    .maybeSingle();

  const {
    data,
    error,
  } = await supabase
    .from('courses')
    .insert({
      title:
        title.trim(),

      description:
        description?.trim() ||
        null,

      difficulty,

      thumbnail_url:
        thumbnailUrl ||
        null,

      category_id:
        categoryId ||
        null,

      teacher_id:
        teacherId,

      teacher_name:
        profile?.full_name ||
        null,

      is_premium:
        Boolean(
          isPremium
        ),

      // The column defaults to true; drafts must be saved explicitly.
      is_published:
        Boolean(
          isPublished
        ),

      published_at:
        isPublished
          ? new Date().toISOString()
          : null,
    })
    .select()
    .single();

  if (error) {
    throw courseBuilderError(
      'createCourse',
      error,
      'Could not create the course.'
    );
  }

  return data;
}


export async function createCourseSection({
  courseId,
  title,
  description = null,
  sortOrder = 0,
}) {
  const {
    data,
    error,
  } = await supabase
    .from('course_sections')
    .insert({
      course_id:
        normalizeId(courseId),

      title:
        String(
          title || ''
        ).trim() ||
        'Untitled section',

      description:
        description ||
        null,

      sort_order:
        Number(sortOrder) || 0,
    })
    .select()
    .single();

  if (error) {
    throw courseBuilderError(
      'createCourseSection',
      error,
      'Could not create the section.'
    );
  }

  return data;
}


export async function createCourseLesson({
  courseId,
  sectionId = null,
  title,
  durationMinutes = 0,
  sortOrder = 0,
  isLocked = false,
  videoUrl = null,
}) {
  const {
    data,
    error,
  } = await supabase
    .from('course_modules')
    .insert({
      course_id:
        normalizeId(courseId),

      section_id:
        normalizeId(sectionId),

      title:
        String(
          title || ''
        ).trim() ||
        'Untitled lesson',

      duration_minutes:
        Number(durationMinutes) || 0,

      sort_order:
        Number(sortOrder) || 0,

      is_locked:
        Boolean(
          isLocked
        ),

      video_url:
        videoUrl ||
        null,
    })
    .select()
    .single();

  if (error) {
    throw courseBuilderError(
      'createCourseLesson',
      error,
      'Could not create the lesson.'
    );
  }

  return data;
}


export async function createLessonContent({
  lessonId,
  title,
  description = null,
  contentType = 'text',
  provider = null,
  contentUrl = null,
  storagePath = null,
  durationMinutes = null,
  sortOrder = 1,
  isRequired = true,
  isPublished = false,
}) {
  const {
    data,
    error,
  } = await supabase
    .from('lesson_content')
    .insert({
      lesson_id:
        normalizeId(lessonId),

      title:
        String(
          title || ''
        ).trim() ||
        'Lesson content',

      description:
        description ||
        null,

      content_type:
        contentType,

      provider:
        provider ||
        null,

      content_url:
        contentUrl ||
        null,

      storage_path:
        storagePath ||
        null,

      duration_minutes:
        durationMinutes == null
          ? null
          : Number(durationMinutes) || 0,

      sort_order:
        Number(sortOrder) || 1,

      is_required:
        Boolean(
          isRequired
        ),

      is_published:
        Boolean(
          isPublished
        ),
    })
    .select()
    .single();

  if (error) {
    throw courseBuilderError(
      'createLessonContent',
      error,
      'Could not save the lesson content.'
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| ORGANIZATIONS
|--------------------------------------------------------------------------
|
| Organizations are created only when a NESBA admin approves an
| application (enforced in the database). The owner is added as an
| 'owner' member automatically.
*/

export async function getOrganizations() {
  const {
    data,
    error,
  } = await supabase
    .from('organizations')
    .select(
      'id,name,slug,description,logo_url,organization_type,location,verification_status,created_at'
    )
    .order(
      'name',
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      'getOrganizations error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not load organizations.'
    );
  }

  // Verified organizations first.
  return safeArray(data).sort(
    (a, b) =>
      Number(
        b.verification_status === 'verified'
      ) -
      Number(
        a.verification_status === 'verified'
      )
  );
}


/*
 * Organizations are created by NESBA admins when they approve an
 * application (review_creator_request). This files or updates the
 * signed-in user's pending organization application.
 */
export async function applyForOrganization({
  name,
  organizationType = null,
  description = null,
  website = null,
  location = null,
  contactEmail = null,
  reason = null,
}) {
  if (
    !String(
      name || ''
    ).trim()
  ) {
    throw new Error(
      'Organization name is required.'
    );
  }

  const {
    data,
    error,
  } = await supabase.rpc(
    'apply_for_organization',
    {
      p_name:
        name,

      p_type:
        organizationType,

      p_description:
        description,

      p_website:
        website,

      p_location:
        location,

      p_contact_email:
        contactEmail,

      p_reason:
        reason,
    }
  );

  if (error) {
    console.error(
      'applyForOrganization error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not submit the organization application.'
    );
  }

  return data;
}


export async function getOrganizationPosts(
  organizationId,
  {
    limit = 30,
  } = {}
) {
  const id =
    normalizeId(organizationId);

  if (!id) {
    return [];
  }

  const {
    data,
    error,
  } = await supabase
    .from('posts')
    .select('*')
    .eq(
      'organization_id',
      id
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    console.error(
      'getOrganizationPosts error:',
      error
    );

    return [];
  }

  return safeArray(data);
}


/*
 * Number of followers of a user or, with { organization: true },
 * of an organization.
 */
export async function getFollowerCount(
  id,
  {
    organization = false,
  } = {}
) {
  const target =
    normalizeId(id);

  if (!target) {
    return 0;
  }

  const {
    count,
    error,
  } = await supabase
    .from('follows')
    .select(
      'id',
      {
        count: 'exact',
        head: true,
      }
    )
    .eq(
      organization
        ? 'followed_organization_id'
        : 'followed_user_id',
      target
    );

  if (error) {
    console.error(
      'getFollowerCount error:',
      error
    );

    return 0;
  }

  return count || 0;
}


export async function getOrganizationStats(
  organizationId
) {
  const id =
    normalizeId(organizationId);

  if (!id) {
    return {
      followers: 0,
      courses: 0,
      posts: 0,
    };
  }

  const countRows = async (
    table,
    column,
    extra = (query) => query
  ) => {
    const {
      count,
      error,
    } = await extra(
      supabase
        .from(table)
        .select(
          'id',
          {
            count: 'exact',
            head: true,
          }
        )
        .eq(
          column,
          id
        )
    );

    if (error) {
      console.error(
        `getOrganizationStats ${table} error:`,
        error
      );

      return 0;
    }

    return count || 0;
  };

  const [
    followers,
    courses,
    posts,
  ] = await Promise.all([
    getFollowerCount(
      id,
      {
        organization: true,
      }
    ),

    countRows(
      'courses',
      'organization_id',
      (query) =>
        query.eq(
          'is_published',
          true
        )
    ),

    countRows(
      'posts',
      'organization_id'
    ),
  ]);

  return {
    followers,
    courses,
    posts,
  };
}


/*
 * The user's follow row for the organization ({ id, notifications_enabled })
 * or null when not following.
 */
export async function isFollowingOrganization(
  userId,
  organizationId
) {
  const user =
    normalizeId(userId);

  const organization =
    normalizeId(organizationId);

  if (
    !user ||
    !organization
  ) {
    return null;
  }

  const {
    data,
    error,
  } = await supabase
    .from('follows')
    .select(
      'id,notifications_enabled'
    )
    .eq(
      'follower_id',
      user
    )
    .eq(
      'followed_organization_id',
      organization
    )
    .maybeSingle();

  if (error) {
    console.error(
      'isFollowingOrganization error:',
      error
    );

    return null;
  }

  return data || null;
}


export async function setOrganizationFollowNotifications({
  followerId,
  organizationId,
  enabled,
}) {
  const {
    error,
  } = await supabase
    .from('follows')
    .update({
      notifications_enabled:
        Boolean(
          enabled
        ),
    })
    .eq(
      'follower_id',
      normalizeId(followerId)
    )
    .eq(
      'followed_organization_id',
      normalizeId(organizationId)
    );

  if (error) {
    console.error(
      'setOrganizationFollowNotifications error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not update notifications.'
    );
  }
}


/*
|--------------------------------------------------------------------------
| MEDIA LIBRARY
|--------------------------------------------------------------------------
*/

/*
 * Published recordings and podcast episodes, newest first.
 */
export async function getMediaLibrary({
  limit = 100,
} = {}) {
  const {
    data,
    error,
  } = await supabase
    .from('media_items')
    .select(
      'id,title,description,media_type,media_url,thumbnail_url,duration_seconds,creator_id,organization_id,published_at,created_at'
    )
    .eq(
      'is_published',
      true
    )
    .order(
      'published_at',
      {
        ascending: false,
        nullsFirst: false,
      }
    )
    .limit(limit);

  if (error) {
    console.error(
      'getMediaLibrary error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not load the media library.'
    );
  }

  return safeArray(data).filter(
    (item) =>
      item.media_url
  );
}


/*
 * Publishes a media item (recording, podcast episode or audio lesson)
 * for the signed-in creator.
 */
export async function createMediaItem({
  title,
  description = null,
  mediaType,
  mediaUrl,
  isPublished = true,
}) {
  const creatorId =
    await getCurrentUserId();

  if (!creatorId) {
    throw new Error(
      'Please log in to publish media.'
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from('media_items')
    .insert({
      title:
        String(
          title || ''
        ).trim(),

      description:
        description?.trim() ||
        null,

      media_type:
        mediaType,

      media_url:
        mediaUrl,

      creator_id:
        creatorId,

      is_published:
        Boolean(
          isPublished
        ),

      published_at:
        isPublished
          ? new Date().toISOString()
          : null,
    })
    .select()
    .single();

  if (error) {
    console.error(
      'createMediaItem error:',
      error
    );

    throw new Error(
      error.message ||
      'Could not publish the media.'
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| LIVE ROOM CHAT AND MODERATION
|--------------------------------------------------------------------------
*/

export async function getLiveRoomMessages(
  roomId,
  {
    limit = 200,
  } = {}
) {
  const {
    data,
    error,
  } = await supabase
    .from('live_room_messages')
    .select(
      'id,room_id,user_id,content,created_at,profiles(full_name,avatar_url)'
    )
    .eq(
      'room_id',
      normalizeId(roomId)
    )
    .order(
      'created_at',
      {
        ascending: false,
      }
    )
    .limit(limit);

  if (error) {
    throw new Error(
      error.message ||
      'Could not load the chat.'
    );
  }

  return safeArray(data).reverse();
}


export async function sendLiveRoomMessage(
  roomId,
  userId,
  content
) {
  const {
    data,
    error,
  } = await supabase
    .from('live_room_messages')
    .insert({
      room_id:
        normalizeId(roomId),

      user_id:
        normalizeId(userId),

      content:
        String(
          content || ''
        ).trim(),
    })
    .select(
      'id,room_id,user_id,content,created_at,profiles(full_name,avatar_url)'
    )
    .single();

  if (error) {
    throw new Error(
      error.message ||
      'Could not send the message.'
    );
  }

  return data;
}


export async function deleteLiveRoomMessage(
  messageId
) {
  const {
    error,
  } = await supabase
    .from('live_room_messages')
    .delete()
    .eq(
      'id',
      normalizeId(messageId)
    );

  if (error) {
    throw new Error(
      error.message ||
      'Could not delete the message.'
    );
  }
}


/*
 * Host moderation, enforced in the database and on the LiveKit server
 * (livekit-moderate edge function).
 *
 * action: 'mute' | 'remove' | 'restore' | 'speaker' | 'listener'
 */
export async function moderateLiveParticipant(
  roomId,
  userId,
  action
) {
  const {
    data,
    error,
  } = await supabase.functions.invoke(
    'livekit-moderate',
    {
      body: {
        roomId:
          normalizeId(roomId),

        userId:
          normalizeId(userId),

        action,
      },
    }
  );

  if (error || data?.error) {
    let message =
      data?.error;

    // Non-2xx responses carry the JSON body in error.context.
    if (
      !message &&
      error?.context?.json
    ) {
      try {
        message =
          (await error.context.json())?.error;
      } catch {
        message = null;
      }
    }

    throw new Error(
      message ||
      error?.message ||
      'Moderation failed.'
    );
  }

  return data;
}
