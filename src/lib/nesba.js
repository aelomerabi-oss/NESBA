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


export async function toggleFollow({
  followerId,
  followingUserId,
}) {
  const follower =
    normalizeId(
      followerId
    );

  const followed =
    normalizeId(
      followingUserId
    );

  if (
    !follower ||
    !followed
  ) {
    throw new Error(
      'Missing follower or followed user ID.'
    );
  }

  if (
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
      'followed_user_id',
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

      followed_user_id:
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

  for (
    const username of mentions
  ) {
    try {
      const {
        data: users,
        error,
      } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url
        `)
        .ilike(
          'full_name',
          `%${username}%`
        )
        .limit(5);

      if (error) {
        console.error(
          'Mention lookup error:',
          error
        );

        continue;
      }

      for (
        const mentionedUser
        of safeArray(users)
      ) {
        if (
          String(
            mentionedUser.id
          ) ===
          String(
            userId
          )
        ) {
          continue;
        }

        try {
          await createNotification({
            userId:
              mentionedUser.id,

            actorId:
              userId,

            type:
              'mention',

            title:
              'You were mentioned',

            message:
              'You were mentioned in a post.',

            entityId:
              post.id,
          });
        } catch (
          notificationError
        ) {
          console.error(
            'Mention notification error:',
            notificationError
          );
        }
      }
    } catch (
      mentionError
    ) {
      console.error(
        'Mention processing error:',
        mentionError
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
    `posts/${id}/${Date.now()}-${Math.random()
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
    `posts/${id}/${Date.now()}-${Math.random()
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
  const path = `comments/${id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

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

    actor_id:
      normalizeId(
        actorId
      ),

    type:
      type ||
      'general',

    title:
      title ||
      'NESBA',

    message:
      message ||
      null,

    entity_id:
      normalizeId(
        entityId
      ),

    is_read:
      false,
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
    `stories/${id}/${Date.now()}-${Math.random()
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
   * Keep this resilient to the current database schema.
   * Published courses are ordered by newest first.
   * If enrollment statistics are available later,
   * this function can rank by them without changing
   * the Home screen API.
   */

  const courses =
    await getCourses({
      limit: Math.max(
        limit,
        20
      ),
      offset: 0,
    });

  return courses.slice(
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
      earned_at,
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
      'earned_at',
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
      certificate_url,
      issued_at,
      courses (
        id,
        title
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
      actor_id,
      type,
      title,
      message,
      entity_id,
      is_read,
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
      is_read:
        true,
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
    `profiles/${id}/avatar-${Date.now()}.${extension}`;

  const {
    error,
  } = await supabase
    .storage
    .from('profiles')
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
      .from('profiles')
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
      .or(
        'progress_percent.eq.100,completed.eq.true'
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
      .from('audio')
      .select('*')
      .eq(
        'user_id',
        normalizeId(userId)
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
      .from('lectures')
      .select('*')
      .eq(
        'creator_id',
        normalizeId(userId)
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


export async function getPublicProfileShares(
  userId
) {
  try {
    const {
      data,
      error,
    } = await supabase
      .from('post_shares')
      .select('*')
      .eq(
        'user_id',
        normalizeId(userId)
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        'getPublicProfileShares error:',
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
