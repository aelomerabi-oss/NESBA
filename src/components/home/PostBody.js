import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, colors } from './styles';

// The text, photo, video or link inside a post on Home.
export const PostBody = ({
    post,
  }) => {

    return (
      <View
        style={
          styles.postBody
        }
      >

        {!!post.content && (

          <Text
            style={
              styles.postText
            }
          >
            {
              post.content
            }
          </Text>

        )}


        {!!post.link_url && (

          <Pressable
            style={
              styles.postLinkCard
            }

            onPress={() =>
              Linking.openURL(
                post.link_url
              )
            }
          >

            <View
              style={
                styles.postLinkIcon
              }
            >

              <Ionicons
                name="link"
                size={22}
                color={
                  colors.primary
                }
              />

            </View>

            <View
              style={
                styles.postLinkContent
              }
            >

              <Text
                style={
                  styles.postLinkTitle
                }
              >
                Shared link
              </Text>

              <Text
                style={
                  styles.postLinkUrl
                }

                numberOfLines={2}
              >
                {
                  post.link_url
                }
              </Text>

            </View>

            <Ionicons
              name="open-outline"
              size={19}
              color={
                colors.textMuted
              }
            />

          </Pressable>

        )}


        {!!post.image_url && (

          <Image accessibilityLabel="Photo in post"
            source={{
              uri:
                post.image_url,
            }}

            style={
              styles.postImage
            }

            resizeMode="cover"
          />

        )}


        {!!post.video_url && (

          <View
            style={
              styles.postVideoContainer
            }
          >

            <View
              style={
                styles.postVideoPlaceholder
              }
            >

              <Ionicons
                name="play-circle"
                size={58}
                color={
                  colors.white
                }
              />

              <Text
                style={
                  styles.postVideoText
                }
              >
                Video
              </Text>

            </View>

          </View>

        )}

      </View>
    );
  };
