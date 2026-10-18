import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle() {
  const redirectTo =
    Linking.createURL('auth/callback');

  const {
    data,
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: 'google',

    options: {
      redirectTo,

      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error(
      'Google authentication URL was not created.'
    );
  }

  const result =
    await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );

  if (result.type !== 'success') {
    if (result.type === 'cancel') {
      throw new Error(
        'Google sign in was cancelled.'
      );
    }

    throw new Error(
      'Google sign in was not completed.'
    );
  }

  return result;
}

export async function signInWithApple() {
  const redirectTo =
    Linking.createURL('auth/callback');

  const {
    data,
    error,
  } = await supabase.auth.signInWithOAuth({
    provider: 'apple',

    options: {
      redirectTo,

      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error(
      'Apple authentication URL was not created.'
    );
  }

  const result =
    await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo
    );

  if (result.type !== 'success') {
    if (result.type === 'cancel') {
      throw new Error(
        'Apple sign in was cancelled.'
      );
    }

    throw new Error(
      'Apple sign in was not completed.'
    );
  }

  return result;
}