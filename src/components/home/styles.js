import { StyleSheet } from 'react-native';
import { colors as theme, shadow } from '../../constants/theme';

// Home follows the app-wide light/dark palette.
export const colors = {
  background: theme.background,
  backgroundSoft: theme.surfaceAlt,
  surface: theme.surface,
  card: theme.surface,
  primary: theme.primary,
  primarySoft: theme.primarySoft,
  text: theme.text,
  textSecondary: theme.textSecondary,
  textMuted: theme.textMuted,
  border: theme.border,
  success: theme.success,
  warning: theme.warning,
  danger: theme.danger,
  white: '#FFFFFF',
  black: '#000000',
};

/* =======================================================
     PART 7 ENDS HERE
     ======================================================= */
     /* ============================================================
   NESBA HOME — STYLES
   ============================================================ */

export const styles = StyleSheet.create({

  /* ==========================================================
     ROOT
     ========================================================== */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scrollView: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 40,
  },

  bottomSpace: {
    height: 40,
  },


  /* ==========================================================
     LOADING
     ========================================================== */

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  logoText: {
    color: colors.white,
    fontSize: 30,
    fontWeight: '800',
  },

  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: colors.textSecondary,
  },


  /* ==========================================================
     HEADER
     ========================================================== */

  header: {
    height: 64,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  brandMarkText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },

  brandName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headerIconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     SEARCH
     ========================================================== */

  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 50,
  },

  searchBar: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },

  searchInput: {
    flex: 1,
    marginLeft: 9,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
  },

  searchResults: {
    marginTop: 7,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    maxHeight: 440,
  },

  searchLoading: {
    minHeight: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },

  searchLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  searchSection: {
    paddingVertical: 7,
  },

  searchSectionTitle: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  searchResultRow: {
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchResultIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchResultContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },

  searchResultTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  searchResultSubtitle: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
  },

  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 35,
  },

  emptySearchTitle: {
    marginTop: 9,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },

  emptySearchText: {
    marginTop: 4,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 12,
  },


  /* ==========================================================
     SECTIONS
     ========================================================== */

  section: {
    marginTop: 20,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  sectionSubtitle: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 12,
  },

  seeAllText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },


  /* ==========================================================
     STORIES
     ========================================================== */

  storyList: {
    paddingHorizontal: 14,
    gap: 12,
  },

  storyCard: {
    width: 78,
    alignItems: 'center',
  },

  storyAvatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  addStoryAvatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  addStoryButton: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyName: {
    marginTop: 6,
    maxWidth: 74,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },


  /* ==========================================================
     CREATE POST
     ========================================================== */

  createPostCard: {
    marginTop: 18,
    marginHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  createPostTop: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createPostInputFake: {
    flex: 1,
    height: 42,
    marginLeft: 10,
    borderRadius: 21,
    backgroundColor: colors.backgroundSoft,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  createPostPlaceholder: {
    color: colors.textMuted,
    fontSize: 14,
  },

  createPostActions: {
    minHeight: 52,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  createPostAction: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  createPostActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },


  /* ==========================================================
     COURSE CARDS
     ========================================================== */

  courseList: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },

  courseCard: {
    width: 245,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },

  courseImageContainer: {
    height: 130,
    position: 'relative',
    overflow: 'hidden',
  },

  courseImage: {
    width: '100%',
    height: '100%',
  },

  coursePlaceholder: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  trendingBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0,0,0,0.68)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  trendingBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  courseContent: {
    padding: 12,
  },

  courseTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },

  courseDescription: {
    marginTop: 5,
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },

  courseMeta: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  courseMetaText: {
    color: colors.textMuted,
    fontSize: 11,
  },


  /* ==========================================================
     EMPTY STATES
     ========================================================== */

  emptyCard: {
    marginHorizontal: 14,
    paddingHorizontal: 22,
    paddingVertical: 32,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCardTitle: {
    marginTop: 9,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyCardText: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  emptyCardButton: {
    marginTop: 15,
    minHeight: 40,
    paddingHorizontal: 15,
    borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  emptyCardButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },


  /* ==========================================================
     POSTS
     ========================================================== */

  postsList: {
    gap: 12,
  },

  postCard: {
    marginHorizontal: 14,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  postHeader: {
    minHeight: 68,
    paddingHorizontal: 13,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  postAuthorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAuthorInfo: {
    flex: 1,
    marginLeft: 10,
  },

  postAuthorName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  postTime: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  postMoreButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postBody: {
    paddingBottom: 3,
  },

  postText: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },

  postImage: {
    width: '100%',
    height: 300,
    backgroundColor: colors.backgroundSoft,
  },

  postVideoContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#111111',
  },

  postVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postVideoText: {
    marginTop: 7,
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },

  postLinkCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postLinkIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postLinkContent: {
    flex: 1,
    marginHorizontal: 9,
  },

  postLinkTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },

  postLinkUrl: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
  },

  postStats: {
    minHeight: 38,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  postStatsLeft: {
    flex: 1,
  },

  likeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  likeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  postStatsText: {
    color: colors.textMuted,
    fontSize: 11,
  },

  postActionBar: {
    minHeight: 49,
    marginHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  postAction: {
    flex: 1,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  postActionText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  postActionTextLiked: {
    color: colors.danger,
  },


  /* ==========================================================
     COMMENTS
     ========================================================== */

  commentsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
  },

  noComments: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },

  noCommentsText: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 12,
  },

  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },

  replyItem: {
    marginLeft: 42,
  },

  commentContent: {
    flex: 1,
    marginLeft: 8,
  },

  commentBubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: 13,
    backgroundColor: colors.backgroundSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  commentAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },

  commentText: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    lineHeight: 17,
  },

  commentMedia: {
    marginTop: 7,
    width: 150,
    height: 110,
    borderRadius: 9,
  },

  commentActions: {
    paddingHorizontal: 4,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  commentTime: {
    color: colors.textMuted,
    fontSize: 10,
  },

  commentActionText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },

  replyIndicator: {
    marginTop: 7,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  replyIndicatorTitle: {
    color: colors.textMuted,
    fontSize: 10,
  },

  replyIndicatorText: {
    marginTop: 2,
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 240,
  },

  commentInputContainer: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  commentInputBox: {
    flex: 1,
    minHeight: 42,
    marginLeft: 8,
    paddingLeft: 11,
    paddingRight: 8,
    borderRadius: 14,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },

  commentInput: {
    flex: 1,
    minHeight: 39,
    maxHeight: 100,
    color: colors.text,
    fontSize: 12,
    paddingVertical: 10,
  },

  commentTools: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
  },

  commentEmojiPanel: {
    marginTop: 7,
    borderRadius: 12,
    backgroundColor: colors.backgroundSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  commentEmojiButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  commentEmojiText: {
    fontSize: 22,
  },

  commentAttachmentPreview: {
    marginTop: 8,
    width: 90,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },

  commentAttachmentImage: {
    width: '100%',
    height: '100%',
  },

  commentAttachmentRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },


  /* ==========================================================
     COMPOSER
     ========================================================== */

  composerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    zIndex: 100,
    justifyContent: 'flex-end',
  },

  composerKeyboard: {
    width: '100%',
    maxHeight: '94%',
  },

  composerCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 15,
    overflow: 'hidden',
  },

  composerHeader: {
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  composerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  composerAuthor: {
    paddingHorizontal: 16,
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  composerAuthorName: {
    marginLeft: 9,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  composerPrivacy: {
    marginLeft: 9,
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 10,
  },

  composerTextInput: {
    minHeight: 120,
    marginHorizontal: 16,
    marginTop: 12,
    color: colors.text,
    fontSize: 16,
    lineHeight: 23,
  },

  composerMedia: {
    height: 210,
    marginHorizontal: 16,
    marginTop: 7,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },

  composerMediaImage: {
    width: '100%',
    height: '100%',
  },

  composerMediaBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  composerMediaBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },

  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  linkPreview: {
    marginHorizontal: 16,
    marginTop: 9,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  linkPreviewText: {
    flex: 1,
    marginHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 12,
  },

  emojiPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 13,
    backgroundColor: colors.backgroundSoft,
    padding: 7,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  emojiButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emojiText: {
    fontSize: 23,
  },

  mentionPanel: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },

  mentionSearchRow: {
    minHeight: 44,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  mentionInput: {
    flex: 1,
    marginLeft: 7,
    color: colors.text,
    fontSize: 13,
  },

  mentionRow: {
    minHeight: 50,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  mentionName: {
    marginLeft: 9,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  noMentionText: {
    padding: 14,
    color: colors.textMuted,
    fontSize: 12,
  },

  composerTools: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },

  composerToolsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },

  composerToolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  composerTool: {
    width: '33.333%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerToolIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.backgroundSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  composerToolText: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },

  publishButton: {
    height: 48,
    marginHorizontal: 16,
    marginTop: 15,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  publishButtonDisabled: {
    opacity: 0.55,
  },

  publishButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },

  liveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },

  liveList: {
    gap: 12,
    paddingRight: 12,
  },

  liveCard: {
    width: 220,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: colors.danger,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },

  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },

  liveBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },

  liveCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 40,
  },

  liveHostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  liveHostName: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },

  liveJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 9,
  },

  liveJoinText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },


  /* ==========================================================
     STORY EDITOR
     ========================================================== */

  storyEditorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 200,
  },

  storyEditorSafe: {
    flex: 1,
    backgroundColor: '#000000',
  },

  storyEditorHeader: {
    height: 58,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  storyHeaderButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyEditorTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },

  storyPreviewContainer: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  storyPreview: {
    width: '100%',
    maxWidth: 480,
    aspectRatio: 9 / 16,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111111',
  },

  storyPreviewImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },

  storyTextOverlay: {
    position: 'absolute',
    left: 15,
    right: 15,
    bottom: 70,
    alignItems: 'center',
  },

  storyOverlayText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: {
      width: 1,
      height: 1,
    },
    textShadowRadius: 4,
  },

  storyLocationOverlay: {
    position: 'absolute',
    left: 12,
    top: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  storyLocationText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },

  storyAudioOverlay: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    maxWidth: '70%',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  storyAudioText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },

  storyVideoIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  storyToolsContainer: {
    maxHeight: '48%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },

  storyToolsContent: {
    paddingHorizontal: 15,
    paddingBottom: 20,
  },

  storyToolSection: {
    marginBottom: 15,
  },

  storyToolSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 7,
  },

  storyToolSectionTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },

  storyTextInput: {
    minHeight: 48,
    maxHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 13,
  },

  filterButton: {
    width: 75,
    marginRight: 9,
    alignItems: 'center',
  },

  filterButtonSelected: {
    opacity: 1,
  },

  filterPreview: {
    width: 62,
    height: 62,
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },

  filterVideoSwatch: {
    backgroundColor: '#4B5563',
  },

  filterPreviewImage: {
    width: '100%',
    height: '100%',
  },

  filterButtonText: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 10,
    fontWeight: '600',
  },

  filterButtonTextSelected: {
    color: colors.white,
    fontWeight: '800',
  },

  storyInputRow: {
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },

  storyLocationInput: {
    flex: 1,
    marginLeft: 7,
    color: colors.white,
    fontSize: 13,
  },

  selectedAudio: {
    minHeight: 52,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  selectedAudioIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedAudioInfo: {
    flex: 1,
    marginHorizontal: 9,
  },

  selectedAudioName: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },

  audioPlayButton: {
    marginRight: 6,
  },

  useLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 6,
  },

  useLocationText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  selectedAudioSubtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
  },

  addAudioButton: {
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  addAudioButtonText: {
    flex: 1,
    marginLeft: 9,
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },

  storyInfoBox: {
    marginTop: 2,
    marginBottom: 12,
    padding: 10,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  storyInfoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    lineHeight: 15,
  },

  storyPublishButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  storyPublishButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },


  /* ==========================================================
     PEOPLE
     ========================================================== */

  peopleList: {
    paddingHorizontal: 14,
    gap: 10,
  },

  personCard: {
    width: 145,
    padding: 13,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },

  personName: {
    width: '100%',
    marginTop: 8,
    textAlign: 'center',
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },

  followButton: {
    marginTop: 9,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },

  followButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
});
