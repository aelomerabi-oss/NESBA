import {
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  router,
} from 'expo-router';

import {
  colors,
  radius,
  spacing,
  typography,
} from '../constants/theme';

import {
  supabase,
} from '../lib/supabase';


export default function SearchScreen() {

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');


  /*
  |--------------------------------------------------------------------------
  | SEARCH USERS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    const search =
      async () => {

        const value =
          query.trim();


        /*
        |--------------------------------------------------------------------------
        | EMPTY SEARCH
        |--------------------------------------------------------------------------
        */

        if (!value) {
          setUsers([]);
          setError('');
          setLoading(false);
          return;
        }


        try {

          setLoading(true);
          setError('');


          /*
          |--------------------------------------------------------------------------
          | SEARCH PROFILES DIRECTLY
          |--------------------------------------------------------------------------
          */

          const {
            data,
            error:
              searchError,
          } = await supabase
            .from('profiles')
            .select(
              'id,full_name,avatar_url,role,bio'
            )
            .ilike(
              'full_name',
              `%${value}%`
            )
            .order(
              'full_name',
              {
                ascending:
                  true,
              }
            )
            .limit(30);


          if (searchError) {
            throw searchError;
          }


          setUsers(
            data || []
          );

        } catch (e) {

          console.error(
            'Search users error:',
            e
          );

          setError(
            e?.message ||
              'Could not search users.'
          );

          setUsers([]);

        } finally {

          setLoading(false);

        }
      };


    /*
    |--------------------------------------------------------------------------
    | DEBOUNCE
    |--------------------------------------------------------------------------
    */

    const timer =
      setTimeout(
        search,
        350
      );


    return () =>
      clearTimeout(
        timer
      );

  }, [query]);


  /*
  |--------------------------------------------------------------------------
  | OPEN USER PROFILE
  |--------------------------------------------------------------------------
  */

  const openUser =
    (user) => {

      if (!user?.id) {
        return;
      }

      router.push(
        `/user/${user.id}`
      );
    };


  /*
  |--------------------------------------------------------------------------
  | INITIALS
  |--------------------------------------------------------------------------
  */

  const getInitials =
    (name) => {

      const value =
        name ||
        'NESBA Member';

      const parts =
        value
          .trim()
          .split(/\s+/);


      if (
        parts.length >= 2
      ) {

        return (
          parts[0].charAt(0) +
          parts[
            parts.length - 1
          ].charAt(0)
        ).toUpperCase();

      }


      return value
        .charAt(0)
        .toUpperCase();
    };


  /*
  |--------------------------------------------------------------------------
  | USER RESULT
  |--------------------------------------------------------------------------
  */

  const renderUser =
    ({
      item,
    }) => {

      const initial =
        getInitials(
          item.full_name
        );


      return (

        <Pressable
          style={
            styles.userRow
          }

          onPress={() =>
            openUser(
              item
            )
          }
        >

          {/* ============================================================
              AVATAR
              ============================================================ */}

          {item.avatar_url ? (

            <Image accessibilityLabel="Profile photo"
              source={{
                uri:
                  item.avatar_url,
              }}

              style={
                styles.avatar
              }

              resizeMode="cover"
            />

          ) : (

            <View
              style={
                styles.avatarPlaceholder
              }
            >

              <Text
                style={
                  styles.avatarText
                }
              >
                {initial}
              </Text>

            </View>

          )}


          {/* ============================================================
              USER INFORMATION
              ============================================================ */}

          <View
            style={
              styles.userInfo
            }
          >

            <Text
              style={
                styles.userName
              }
            >
              {item.full_name ||
                'NESBA Member'}
            </Text>


            {!!item.role && (

              <Text
                style={
                  styles.role
                }
              >
                {item.role}
              </Text>

            )}


            {!!item.bio && (

              <Text
                style={
                  styles.bio
                }

                numberOfLines={
                  1
                }
              >
                {item.bio}
              </Text>

            )}

          </View>


          {/* ============================================================
              ARROW
              ============================================================ */}

          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              colors.textMuted
            }
          />

        </Pressable>

      );
    };


  /*
  |--------------------------------------------------------------------------
  | SCREEN
  |--------------------------------------------------------------------------
  */

  return (

    <View
      style={
        styles.container
      }
    >

      {/* ================================================================
          SEARCH BAR
          ================================================================ */}

      <View
        style={
          styles.searchRow
        }
      >

        {/* BACK */}

        <Pressable accessibilityRole="button" accessibilityLabel="Go back"
          style={
            styles.backButton
          }

          onPress={() =>
            router.back()
          }
        >

          <Ionicons
            name="arrow-back"
            size={22}
            color={
              colors.text
            }
          />

        </Pressable>


        {/* SEARCH INPUT */}

        <View
          style={
            styles.inputContainer
          }
        >

          <Ionicons
            name="search"
            size={19}
            color={
              colors.textMuted
            }
          />


          <TextInput
            value={
              query
            }

            onChangeText={
              setQuery
            }

            placeholder="Search people..."

            placeholderTextColor={
              colors.textMuted
            }

            autoFocus

            autoCapitalize="none"

            autoCorrect={
              false
            }

            style={
              styles.input
            }
          />


          {/* CLEAR */}

          {query.length >
            0 && (

            <Pressable accessibilityRole="button" accessibilityLabel="Clear"
              onPress={() =>
                setQuery('')
              }
            >

              <Ionicons
                name="close-circle"
                size={19}
                color={
                  colors.textMuted
                }
              />

            </Pressable>

          )}

        </View>

      </View>


      {/* ================================================================
          LOADING
          ================================================================ */}

      {loading && (

        <ActivityIndicator
          color={
            colors.primary
          }

          style={
            styles.loader
          }
        />

      )}


      {/* ================================================================
          ERROR
          ================================================================ */}

      {!!error && (

        <View
          style={
            styles.errorContainer
          }
        >

          <Ionicons
            name="alert-circle-outline"
            size={22}
            color={
              colors.danger
            }
          />

          <Text
            style={
              styles.error
            }
          >
            {error}
          </Text>

        </View>

      )}


      {/* ================================================================
          NO RESULTS
          ================================================================ */}

      {!loading &&
        !error &&
        !!query.trim() &&
        users.length ===
          0 && (

          <View
            style={
              styles.empty
            }
          >

            <Ionicons
              name="people-outline"
              size={42}
              color={
                colors.textMuted
              }
            />

            <Text
              style={
                styles.emptyTitle
              }
            >
              No people found
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              Try another name.
            </Text>

          </View>

        )}


      {/* ================================================================
          RESULTS
          ================================================================ */}

      <FlatList
        data={
          users
        }

        keyExtractor={(
          item
        ) =>
          item.id
        }

        renderItem={
          renderUser
        }

        contentContainerStyle={
          styles.list
        }

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={
          false
        }
      />

    </View>

  );
}


/*
|--------------------------------------------------------------------------
| STYLES
|--------------------------------------------------------------------------
*/

const styles =
  StyleSheet.create({

    container: {
      flex: 1,

      backgroundColor:
        colors.background,

      paddingHorizontal:
        spacing.md,
    },


    /*
    |--------------------------------------------------------------------------
    | SEARCH ROW
    |--------------------------------------------------------------------------
    */

    searchRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.sm,

      paddingTop:
        spacing.md,

      paddingBottom:
        spacing.sm,
    },


    backButton: {
      width: 38,

      height: 38,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    /*
    |--------------------------------------------------------------------------
    | SEARCH INPUT
    |--------------------------------------------------------------------------
    */

    inputContainer: {
      flex: 1,

      height: 44,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        spacing.xs,

      backgroundColor:
        colors.surface,

      borderWidth: 1,

      borderColor:
        colors.border,

      borderRadius:
        radius.pill,

      paddingHorizontal:
        spacing.sm,
    },


    input: {
      flex: 1,

      color:
        colors.text,

      fontSize: 15,
    },


    /*
    |--------------------------------------------------------------------------
    | LOADING
    |--------------------------------------------------------------------------
    */

    loader: {
      marginTop:
        spacing.md,
    },


    /*
    |--------------------------------------------------------------------------
    | RESULTS
    |--------------------------------------------------------------------------
    */

    list: {
      paddingTop:
        spacing.sm,

      paddingBottom:
        spacing.xl,
    },


    userRow: {
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
        radius.md,

      padding:
        spacing.sm,

      marginBottom:
        spacing.sm,
    },


    /*
    |--------------------------------------------------------------------------
    | AVATAR
    |--------------------------------------------------------------------------
    */

    avatar: {
      width: 48,

      height: 48,

      borderRadius: 24,

      backgroundColor:
        colors.surface,

      marginRight:
        spacing.sm,
    },


    avatarPlaceholder: {
      width: 48,

      height: 48,

      borderRadius: 24,

      backgroundColor:
        colors.primary,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        spacing.sm,
    },


    avatarText: {
      color:
        '#fff',

      fontSize: 18,

      fontWeight:
        '800',
    },


    /*
    |--------------------------------------------------------------------------
    | USER INFO
    |--------------------------------------------------------------------------
    */

    userInfo: {
      flex: 1,
    },


    userName: {
      ...typography.body,

      fontWeight:
        '700',
    },


    role: {
      color:
        colors.primaryLight,

      fontSize: 12,

      marginTop: 2,

      textTransform:
        'capitalize',
    },


    bio: {
      color:
        colors.textMuted,

      fontSize: 12,

      marginTop: 3,
    },


    /*
    |--------------------------------------------------------------------------
    | EMPTY
    |--------------------------------------------------------------------------
    */

    empty: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        spacing.xl,

      paddingBottom:
        spacing.xl,
    },


    emptyTitle: {
      ...typography.h2,

      marginTop:
        spacing.sm,

      textAlign:
        'center',
    },


    emptyText: {
      ...typography.body,

      color:
        colors.textMuted,

      textAlign:
        'center',

      marginTop:
        spacing.xs,
    },


    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    errorContainer: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: spacing.xs,

      marginTop:
        spacing.sm,

      paddingHorizontal:
        spacing.sm,
    },


    error: {
      color:
        colors.danger,

      textAlign:
        'center',

      flexShrink: 1,
    },

  });