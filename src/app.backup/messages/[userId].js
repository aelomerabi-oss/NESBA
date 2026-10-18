import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Stack,
  useLocalSearchParams,
} from 'expo-router';

import EmojiPicker from 'emoji-picker-react';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../../constants/theme';

import { useAuth } from '../../context/AuthContext';

import {
  getDirectMessages,
  getPublicProfile,
  markDirectMessagesRead,
  sendDirectMessage,
} from '../../lib/nesba';

import { supabase } from '../../lib/supabase';


export default function ConversationScreen() {
  const { userId } =
    useLocalSearchParams();

  const { session } =
    useAuth();

  const [messages, setMessages] =
    useState([]);

  const [person, setPerson] =
    useState(null);

  const [draft, setDraft] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [
    showEmojiPicker,
    setShowEmojiPicker,
  ] = useState(false);

  const [
    showAttachmentMenu,
    setShowAttachmentMenu,
  ] = useState(false);

  const [
    selectedFiles,
    setSelectedFiles,
  ] = useState([]);

  const [
    uploadingFiles,
    setUploadingFiles,
  ] = useState(false);


  /*
   * ============================================
   * LOAD ATTACHMENTS
   * ============================================
   */

  const loadAttachments =
    async (messageIds) => {
      if (
        !messageIds ||
        !messageIds.length
      ) {
        return [];
      }

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'message_attachments'
          )
          .select(
            'id,message_id,file_name,file_path,mime_type,file_size,relative_path,created_at'
          )
          .in(
            'message_id',
            messageIds
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

      if (error) {
        console.error(
          'Could not load attachments:',
          error
        );

        return [];
      }

      return data || [];
    };


  /*
   * ============================================
   * ADD ATTACHMENTS TO MESSAGES
   * ============================================
   */

  const attachFilesToMessages =
    async (rows) => {
      if (
        !rows ||
        !rows.length
      ) {
        return rows || [];
      }

      const messageIds =
        rows.map(
          (message) =>
            message.id
        );

      const attachments =
        await loadAttachments(
          messageIds
        );

      const grouped = {};

      attachments.forEach(
        (attachment) => {
          if (
            !grouped[
              attachment.message_id
            ]
          ) {
            grouped[
              attachment.message_id
            ] = [];
          }

          grouped[
            attachment.message_id
          ].push(
            attachment
          );
        }
      );

      return rows.map(
        (message) => ({
          ...message,
          attachments:
            grouped[
              message.id
            ] || [],
        })
      );
    };


  /*
   * ============================================
   * LOAD CONVERSATION
   * ============================================
   */

  const load =
    useCallback(
      async () => {
        if (
          !session?.user?.id ||
          !userId
        ) {
          setLoading(false);
          return;
        }

        try {
          const [
            rows,
            profile,
          ] =
            await Promise.all([
              getDirectMessages(
                session.user.id,
                userId
              ),

              getPublicProfile(
                userId,
                session.user.id
              ),
            ]);

          const rowsWithAttachments =
            await attachFilesToMessages(
              rows || []
            );

          setMessages(
            rowsWithAttachments
          );

          setPerson(
            profile
          );

          await markDirectMessagesRead(
            session.user.id,
            userId
          );
        } catch (
          error
        ) {
          console.error(
            'Could not load conversation:',
            error
          );

          Alert.alert(
            'Could not load conversation',
            error?.message ||
              String(error)
          );
        } finally {
          setLoading(false);
        }
      },
      [
        session?.user?.id,
        userId,
      ]
    );


  useEffect(() => {
    load();
  }, [load]);


  /*
   * ============================================
   * REALTIME
   * ============================================
   */

  useEffect(() => {
    if (
      !session?.user?.id ||
      !userId
    ) {
      return;
    }

    const currentUserId =
      session.user.id;

    console.log(
      'Starting conversation realtime listener:',
      currentUserId,
      '<->',
      userId
    );

    const channel =
      supabase
        .channel(
          `conversation-${currentUserId}-${userId}`
        )

        /*
         * Incoming messages
         */
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter:
              `recipient_id=eq.${currentUserId}`,
          },
          async (
            payload
          ) => {
            const newMessage =
              payload.new;

            if (
              newMessage.sender_id !==
              userId
            ) {
              return;
            }

            console.log(
              'NEW INCOMING MESSAGE:',
              newMessage
            );

            let message = {
              ...newMessage,
              attachments: [],
            };

            if (
              newMessage.message_type ===
              'file'
            ) {
              for (
                let attempt = 0;
                attempt < 5;
                attempt++
              ) {
                await new Promise(
                  (resolve) =>
                    setTimeout(
                      resolve,
                      300
                    )
                );

                const attachments =
                  await loadAttachments(
                    [
                      newMessage.id,
                    ]
                  );

                if (
                  attachments.length
                ) {
                  message = {
                    ...newMessage,
                    attachments,
                  };

                  break;
                }
              }
            }

            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      item.id ===
                      newMessage.id
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  message,
                ];
              }
            );

            try {
              await markDirectMessagesRead(
                currentUserId,
                userId
              );
            } catch (
              error
            ) {
              console.error(
                'Could not mark message as read:',
                error
              );
            }
          }
        )

        /*
         * Outgoing messages
         */
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'direct_messages',
            filter:
              `sender_id=eq.${currentUserId}`,
          },
          async (
            payload
          ) => {
            const newMessage =
              payload.new;

            if (
              newMessage.recipient_id !==
              userId
            ) {
              return;
            }

            console.log(
              'NEW OUTGOING MESSAGE:',
              newMessage
            );

            let message = {
              ...newMessage,
              attachments: [],
            };

            if (
              newMessage.message_type ===
              'file'
            ) {
              for (
                let attempt = 0;
                attempt < 5;
                attempt++
              ) {
                await new Promise(
                  (resolve) =>
                    setTimeout(
                      resolve,
                      300
                    )
                );

                const attachments =
                  await loadAttachments(
                    [
                      newMessage.id,
                    ]
                  );

                if (
                  attachments.length
                ) {
                  message = {
                    ...newMessage,
                    attachments,
                  };

                  break;
                }
              }
            }

            setMessages(
              (current) => {
                const exists =
                  current.some(
                    (item) =>
                      item.id ===
                      newMessage.id
                  );

                if (exists) {
                  return current;
                }

                return [
                  ...current,
                  message,
                ];
              }
            );
          }
        )

        .subscribe(
          (status) => {
            console.log(
              'Conversation realtime status:',
              status
            );
          }
        );

    return () => {
      console.log(
        'Stopping conversation realtime listener:',
        currentUserId,
        '<->',
        userId
      );

      supabase.removeChannel(
        channel
      );
    };
  }, [
    session?.user?.id,
    userId,
  ]);


  /*
   * ============================================
   * SEND TEXT MESSAGE
   * ============================================
   */

  const send =
    async () => {
      const text =
        draft.trim();

      if (
        !text ||
        sending
      ) {
        return;
      }

      try {
        setSending(true);

        const message =
          await sendDirectMessage(
            userId,
            text
          );

        setMessages(
          (current) => {
            const exists =
              current.some(
                (item) =>
                  item.id ===
                  message.id
              );

            if (exists) {
              return current;
            }

            return [
              ...current,
              {
                ...message,
                attachments: [],
              },
            ];
          }
        );

        setDraft('');

        setShowEmojiPicker(
          false
        );
      } catch (
        error
      ) {
        console.error(
          'Could not send message:',
          error
        );

        Alert.alert(
          'Could not send message',
          error?.message ||
            String(error)
        );
      } finally {
        setSending(false);
      }
    };


  /*
   * ============================================
   * ENTER TO SEND
   * ============================================
   */

  const handleKeyPress =
    (event) => {
      if (
        Platform.OS !==
        'web'
      ) {
        return;
      }

      const nativeEvent =
        event?.nativeEvent;

      if (
        nativeEvent?.key ===
          'Enter' &&
        !nativeEvent?.shiftKey
      ) {
        event.preventDefault();

        if (
          draft.trim() &&
          !sending
        ) {
          send();
        }
      }
    };


  /*
   * ============================================
   * EMOJI
   * ============================================
   */

  const handleEmojiClick =
    (emojiData) => {
      setDraft(
        (current) =>
          current +
          emojiData.emoji
      );
    };


  /*
   * ============================================
   * FILE PICKER
   * ============================================
   */

  const openFilePicker =
    () => {
      if (
        Platform.OS !==
        'web'
      ) {
        Alert.alert(
          'Attachments',
          'File attachments are currently available on the web version.'
        );

        return;
      }

      const input =
        document.createElement(
          'input'
        );

      input.type =
        'file';

      input.multiple =
        true;

      input.onchange =
        (event) => {
          const files =
            Array.from(
              event.target.files ||
                []
            );

          if (
            files.length
          ) {
            setSelectedFiles(
              files
            );
          }

          setShowAttachmentMenu(
            false
          );
        };

      input.click();
    };


  /*
   * ============================================
   * REMOVE SELECTED FILE
   * ============================================
   */

  const removeSelectedFile =
    (index) => {
      setSelectedFiles(
        (current) =>
          current.filter(
            (_, i) =>
              i !== index
          )
      );
    };


  /*
   * ============================================
   * CLEAR SELECTED FILES
   * ============================================
   */

  const clearSelectedFiles =
    () => {
      setSelectedFiles(
        []
      );
    };


  /*
   * ============================================
   * FILE SIZE
   * ============================================
   */

  const formatFileSize =
    (bytes) => {
      if (
        !bytes ||
        bytes <= 0
      ) {
        return '0 B';
      }

      const units = [
        'B',
        'KB',
        'MB',
        'GB',
      ];

      const index =
        Math.min(
          Math.floor(
            Math.log(bytes) /
              Math.log(1024)
          ),
          units.length - 1
        );

      const value =
        bytes /
        Math.pow(
          1024,
          index
        );

      return `${value.toFixed(
        index === 0
          ? 0
          : 1
      )} ${units[index]}`;
    };


  /*
   * ============================================
   * FILE ICON
   * ============================================
   */

  const getFileIcon =
    (
      mimeType,
      fileName
    ) => {
      const name =
        (
          fileName ||
          ''
        ).toLowerCase();

      if (
        mimeType?.startsWith(
          'image/'
        )
      ) {
        return '🖼️';
      }

      if (
        mimeType?.startsWith(
          'video/'
        )
      ) {
        return '🎬';
      }

      if (
        mimeType ===
          'application/pdf' ||
        name.endsWith(
          '.pdf'
        )
      ) {
        return '📕';
      }

      if (
        name.endsWith(
          '.doc'
        ) ||
        name.endsWith(
          '.docx'
        )
      ) {
        return '📘';
      }

      if (
        name.endsWith(
          '.xls'
        ) ||
        name.endsWith(
          '.xlsx'
        ) ||
        name.endsWith(
          '.csv'
        )
      ) {
        return '📊';
      }

      if (
        name.endsWith(
          '.zip'
        ) ||
        name.endsWith(
          '.rar'
        ) ||
        name.endsWith(
          '.7z'
        )
      ) {
        return '🗜️';
      }

      return '📄';
    };


  /*
   * ============================================
   * SEND ATTACHMENTS
   * ============================================
   */

  const sendAttachments =
    async () => {
      if (
        !selectedFiles.length ||
        uploadingFiles
      ) {
        return;
      }

      if (
        !session?.user?.id
      ) {
        Alert.alert(
          'Not logged in',
          'Please log in first.'
        );

        return;
      }

      try {
        setUploadingFiles(
          true
        );

        const {
          data: message,
          error:
            messageError,
        } =
          await supabase
            .from(
              'direct_messages'
            )
            .insert({
              sender_id:
                session.user.id,

              recipient_id:
                userId,

              content:
                selectedFiles.length ===
                1
                  ? `📎 ${selectedFiles[0].name}`
                  : `📎 ${selectedFiles.length} attachments`,

              message_type:
                'file',
            })
            .select()
            .single();

        if (
          messageError
        ) {
          throw messageError;
        }

        const attachmentRows =
          [];

        try {
          for (
            let index = 0;
            index <
            selectedFiles.length;
            index++
          ) {
            const file =
              selectedFiles[index];

            const cleanPath =
              file.name
                .replace(
                  /\\/g,
                  '/'
                )
                .replace(
                  /^\/+/,
                  ''
                );

            const storagePath =
              `${session.user.id}/${message.id}/${cleanPath}`;

            console.log(
              'Uploading:',
              storagePath
            );

            const {
              error:
                uploadError,
            } =
              await supabase.storage
                .from(
                  'message-media'
                )
                .upload(
                  storagePath,
                  file,
                  {
                    contentType:
                      file.type ||
                      'application/octet-stream',

                    upsert:
                      false,
                  }
                );

            if (
              uploadError
            ) {
              throw uploadError;
            }

            attachmentRows.push({
              message_id:
                message.id,

              file_name:
                file.name,

              file_path:
                storagePath,

              mime_type:
                file.type ||
                'application/octet-stream',

              file_size:
                file.size || 0,

              relative_path:
                file.name,
            });
          }

          const {
            data:
              savedAttachments,
            error:
              attachmentError,
          } =
            await supabase
              .from(
                'message_attachments'
              )
              .insert(
                attachmentRows
              )
              .select();

          if (
            attachmentError
          ) {
            throw attachmentError;
          }

          setMessages(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    message.id
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                {
                  ...message,
                  attachments:
                    savedAttachments ||
                    attachmentRows,
                },
              ];
            }
          );

          setSelectedFiles(
            []
          );
        } catch (
          uploadError
        ) {
          await supabase
            .from(
              'direct_messages'
            )
            .delete()
            .eq(
              'id',
              message.id
            );

          throw uploadError;
        }
      } catch (
        error
      ) {
        console.error(
          'ATTACHMENT ERROR:',
          error
        );

        Alert.alert(
          'Could not send attachment',
          error?.message ||
            String(error)
        );
      } finally {
        setUploadingFiles(
          false
        );
      }
    };


  /*
   * ============================================
   * OPEN ATTACHMENT
   * ============================================
   */

  const openAttachment =
    async (attachment) => {
      try {
        const {
          data,
          error,
        } =
          await supabase.storage
            .from(
              'message-media'
            )
            .createSignedUrl(
              attachment.file_path,
              3600
            );

        if (error) {
          throw error;
        }

        if (
          !data?.signedUrl
        ) {
          throw new Error(
            'Could not create file link.'
          );
        }

        if (
          Platform.OS ===
          'web'
        ) {
          window.open(
            data.signedUrl,
            '_blank'
          );
        } else {
          await Linking.openURL(
            data.signedUrl
          );
        }
      } catch (
        error
      ) {
        console.error(
          'OPEN ATTACHMENT ERROR:',
          error
        );

        Alert.alert(
          'Could not open attachment',
          error?.message ||
            String(error)
        );
      }
    };


  /*
   * ============================================
   * SELECTED FILES
   * ============================================
   */

  const renderSelectedFiles =
    () => {
      if (
        !selectedFiles.length
      ) {
        return null;
      }

      return (
        <View
          style={
            styles.selectedFiles
          }
        >
          <View
            style={
              styles.selectedHeader
            }
          >
            <Text
              style={
                styles.selectedTitle
              }
            >
              {selectedFiles.length ===
              1
                ? '1 attachment'
                : `${selectedFiles.length} attachments`}
            </Text>

            <Pressable
              onPress={
                clearSelectedFiles
              }
            >
              <Text
                style={
                  styles.clearText
                }
              >
                Clear
              </Text>
            </Pressable>
          </View>

          {selectedFiles.map(
            (
              file,
              index
            ) => (
              <View
                key={`${file.name}-${index}`}
                style={
                  styles.selectedFile
                }
              >
                <Text
                  style={
                    styles.fileIcon
                  }
                >
                  {getFileIcon(
                    file.type,
                    file.name
                  )}
                </Text>

                <View
                  style={
                    styles.selectedFileInfo
                  }
                >
                  <Text
                    style={
                      styles.selectedFileName
                    }
                    numberOfLines={
                      1
                    }
                  >
                    {file.name}
                  </Text>

                  <Text
                    style={
                      styles.selectedFileSize
                    }
                  >
                    {formatFileSize(
                      file.size
                    )}
                  </Text>
                </View>

                <Pressable
                  onPress={() =>
                    removeSelectedFile(
                      index
                    )
                  }
                >
                  <Text
                    style={
                      styles.removeFile
                    }
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
            )
          )}

          <Pressable
            style={
              styles.sendAttachments
            }
            onPress={
              sendAttachments
            }
            disabled={
              uploadingFiles
            }
          >
            <Text
              style={
                styles.sendAttachmentsText
              }
            >
              {uploadingFiles
                ? 'Uploading...'
                : 'Send attachments'}
            </Text>
          </Pressable>
        </View>
      );
    };


  /*
   * ============================================
   * RENDER ATTACHMENTS
   * ============================================
   */

  const renderAttachments =
    (
      attachments
    ) => {
      if (
        !attachments ||
        !attachments.length
      ) {
        return null;
      }

      return (
        <View
          style={
            styles.attachments
          }
        >
          {attachments.map(
            (attachment) => (
              <Pressable
                key={
                  attachment.id ||
                  attachment.file_path
                }
                style={
                  styles.attachmentCard
                }
                onPress={() =>
                  openAttachment(
                    attachment
                  )
                }
              >
                <Text
                  style={
                    styles.fileIcon
                  }
                >
                  {getFileIcon(
                    attachment.mime_type,
                    attachment.file_name
                  )}
                </Text>

                <View
                  style={
                    styles.attachmentInfo
                  }
                >
                  <Text
                    style={
                      styles.fileName
                    }
                    numberOfLines={
                      2
                    }
                  >
                    {
                      attachment.file_name
                    }
                  </Text>

                  <Text
                    style={
                      styles.fileSize
                    }
                  >
                    {formatFileSize(
                      attachment.file_size
                    )}
                  </Text>
                </View>

                <Text
                  style={
                    styles.openIcon
                  }
                >
                  ↗
                </Text>
              </Pressable>
            )
          )}
        </View>
      );
    };


  /*
   * ============================================
   * LOADING
   * ============================================
   */

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
        ]}
      >
        <ActivityIndicator
          color={
            colors.primary
          }
        />
      </View>
    );
  }


  /*
   * ============================================
   * CONVERSATION
   * ============================================
   */

  return (
    <>
      <Stack.Screen
        options={{
          title:
            person?.full_name ||
            'Messages',

          headerBackTitle:
            'Back',
        }}
      />

      <KeyboardAvoidingView
        style={
          styles.container
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >

        <FlatList
          data={messages}
          keyExtractor={(item) =>
            item.id
          }
          contentContainerStyle={
            styles.messages
          }
          renderItem={({
            item,
          }) => {
            const isMine =
              item.sender_id ===
              session?.user?.id;

            return (
              <View
                style={[
                  styles.bubble,

                  isMine
                    ? styles.mine
                    : styles.theirs,
                ]}
              >

                {item.message_type ===
                  'file' &&
                  renderAttachments(
                    item.attachments
                  )}

                {item.message_type !==
                  'file' &&
                  item.content && (
                    <Text
                      style={
                        styles.messageText
                      }
                    >
                      {
                        item.content
                      }
                    </Text>
                  )}

                {item.message_type ===
                  'file' &&
                  (!item.attachments ||
                    !item.attachments.length) && (
                    <Text
                      style={
                        styles.messageText
                      }
                    >
                      {
                        item.content
                      }
                    </Text>
                  )}

                <Text
                  style={
                    styles.time
                  }
                >
                  {new Date(
                    item.created_at
                  ).toLocaleTimeString(
                    [],
                    {
                      hour:
                        '2-digit',
                      minute:
                        '2-digit',
                    }
                  )}
                </Text>

              </View>
            );
          }}
        />


        {renderSelectedFiles()}


        {showEmojiPicker && (
          <View
            style={
              styles.emojiPickerWrapper
            }
          >
            <EmojiPicker
              onEmojiClick={
                handleEmojiClick
              }
              width="100%"
              height={350}
            />
          </View>
        )}


        {showAttachmentMenu && (
          <View
            style={
              styles.attachmentMenu
            }
          >

            <Pressable
              style={
                styles.attachmentOption
              }
              onPress={
                openFilePicker
              }
            >
              <Text
                style={
                  styles.attachmentOptionIcon
                }
              >
                📎
              </Text>

              <Text
                style={
                  styles.attachmentOptionText
                }
              >
                Attach files
              </Text>
            </Pressable>

          </View>
        )}


        <View
          style={
            styles.composer
          }
        >

          <Pressable
            style={
              styles.attachButton
            }
            onPress={() =>
              setShowAttachmentMenu(
                (current) =>
                  !current
              )
            }
            disabled={
              uploadingFiles
            }
          >
            <Text
              style={
                styles.attachButtonText
              }
            >
              +
            </Text>
          </Pressable>


          <Pressable
            style={
              styles.emojiButton
            }
            onPress={() =>
              setShowEmojiPicker(
                (current) =>
                  !current
              )
            }
          >
            <Text
              style={
                styles.emojiButtonText
              }
            >
              🙂
            </Text>
          </Pressable>


          <TextInput
            value={draft}
            onChangeText={
              setDraft
            }
            onKeyPress={
              handleKeyPress
            }
            style={
              styles.input
            }
            placeholder="Write a message"
            placeholderTextColor={
              colors.textMuted
            }
            multiline
          />


          <Pressable
            style={[
              styles.send,

              (!draft.trim() ||
                sending) &&
                styles.sendDisabled,
            ]}
            onPress={
              send
            }
            disabled={
              !draft.trim() ||
              sending
            }
          >
            <Text
              style={
                styles.sendText
              }
            >
              {sending
                ? '...'
                : 'Send'}
            </Text>
          </Pressable>

        </View>

      </KeyboardAvoidingView>
    </>
  );
}


/*
 * ============================================
 * STYLES
 * ============================================
 */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    center: {
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    messages: {
      padding:
        spacing.md,
      gap:
        spacing.sm,
      paddingBottom:
        spacing.lg,
    },

    bubble: {
      maxWidth:
        '88%',
      borderRadius:
        radius.md,
      padding:
        spacing.sm,
    },

    mine: {
      alignSelf:
        'flex-end',
      backgroundColor:
        colors.primary,
    },

    theirs: {
      alignSelf:
        'flex-start',
      backgroundColor:
        colors.surfaceAlt,
    },

    messageText: {
      ...typography.body,
      color:
        '#fff',
    },

    time: {
      fontSize: 10,
      color:
        '#D9D6FF',
      marginTop: 4,
      alignSelf:
        'flex-end',
    },

    composer: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      gap:
        spacing.xs,
      padding:
        spacing.sm,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      backgroundColor:
        colors.background,
    },

    attachButton: {
      width: 42,
      height: 46,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
    },

    attachButtonText: {
      fontSize: 28,
      fontWeight:
        '300',
      color:
        colors.text,
    },

    emojiButton: {
      width: 42,
      height: 46,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
    },

    emojiButtonText: {
      fontSize: 21,
    },

    input: {
      flex: 1,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      padding:
        spacing.sm,
      color:
        colors.text,
      minHeight: 46,
      maxHeight: 120,
    },

    send: {
      backgroundColor:
        colors.primary,
      borderRadius:
        radius.md,
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        14,
    },

    sendDisabled: {
      opacity:
        0.5,
    },

    sendText: {
      color:
        '#fff',
      fontWeight:
        '700',
    },

    attachmentMenu: {
      position:
        'absolute',
      left:
        spacing.sm,
      bottom:
        70,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      padding:
        spacing.xs,
      zIndex:
        2000,
      elevation:
        2000,
      minWidth:
        190,
    },

    attachmentOption: {
      flexDirection:
        'row',
      alignItems:
        'center',
      paddingVertical:
        spacing.sm,
      paddingHorizontal:
        spacing.md,
      minWidth:
        180,
    },

    attachmentOptionIcon: {
      fontSize: 20,
      marginRight:
        spacing.sm,
    },

    attachmentOptionText: {
      color:
        colors.text,
      fontWeight:
        '600',
    },

    selectedFiles: {
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      backgroundColor:
        colors.background,
      padding:
        spacing.sm,
      maxHeight:
        260,
    },

    selectedHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom:
        spacing.xs,
    },

    selectedTitle: {
      color:
        colors.text,
      fontWeight:
        '700',
    },

    clearText: {
      color:
        colors.primary,
      fontWeight:
        '600',
    },

    selectedFile: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.sm,
      padding:
        spacing.xs,
      marginBottom:
        spacing.xs,
    },

    selectedFileInfo: {
      flex: 1,
    },

    selectedFileName: {
      color:
        colors.text,
      fontWeight:
        '600',
    },

    selectedFileSize: {
      color:
        colors.textMuted,
      fontSize: 11,
      marginTop: 2,
    },

    removeFile: {
      color:
        colors.textMuted,
      fontSize: 24,
      paddingHorizontal:
        8,
    },

    sendAttachments: {
      backgroundColor:
        colors.primary,
      borderRadius:
        radius.md,
      alignItems:
        'center',
      paddingVertical:
        12,
      marginTop:
        spacing.xs,
    },

    sendAttachmentsText: {
      color:
        '#fff',
      fontWeight:
        '700',
    },

    attachments: {
      gap:
        spacing.xs,
      marginBottom:
        spacing.xs,
    },

    attachmentCard: {
      flexDirection:
        'row',
      alignItems:
        'center',
      minWidth:
        260,
      maxWidth:
        420,
      backgroundColor:
        'rgba(0,0,0,0.10)',
      borderRadius:
        radius.sm,
      padding:
        spacing.sm,
    },

    attachmentInfo: {
      flex: 1,
      minWidth:
        0,
    },

    fileIcon: {
      fontSize: 26,
      marginRight:
        spacing.sm,
    },

    fileName: {
      color:
        '#fff',
      fontWeight:
        '700',
      fontSize: 13,
    },

    fileSize: {
      color:
        '#D9D6FF',
      fontSize: 10,
      marginTop: 3,
    },

    openIcon: {
      color:
        '#fff',
      fontSize: 20,
      marginLeft:
        spacing.xs,
    },

    emojiPickerWrapper: {
      position:
        'absolute',
      left: 8,
      right: 8,
      bottom: 75,
      zIndex:
        1000,
      elevation:
        1000,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      borderRadius:
        radius.md,
      overflow:
        'hidden',
    },
  });