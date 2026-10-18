import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

// Closes the sign-in popup on web when it lands on /auth/callback.
WebBrowser.maybeCompleteAuthSession();

const PROVIDER_NAMES = {
  google: 'Google',
  apple: 'Apple',
};

/*
 * Reads auth parameters from a redirect URL: a PKCE ?code=..., or
 * implicit-flow tokens in the #fragment, or an error.
 */
export function readAuthParams(url) {
  if (!url) {
    return {};
  }

  const [beforeHash, hash = ''] = url.split('#');

  const query = beforeHash.includes('?')
    ? beforeHash.split('?')[1]
    : '';

  const params = {};

  [query, hash].forEach((part) => {
    part
      .split('&')
      .filter(Boolean)
      .forEach((pair) => {
        const [key, value = ''] = pair.split('=');

        params[decodeURIComponent(key)] =
          decodeURIComponent(value.replace(/\+/g, ' '));
      });
  });

  return params;
}

/*
 * The Supabase client is created with detectSessionInUrl: false, so a
 * session returned in a redirect URL has to be stored explicitly.
 */
export async function completeAuthFromUrl(url) {
  const params = readAuthParams(url);

  if (params.error_description || params.error) {
    throw new Error(params.error_description || params.error);
  }

  if (params.code) {
    const { data, error } =
      await supabase.auth.exchangeCodeForSession(params.code);

    if (error) {
      throw error;
    }

    return data.session;
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    if (error) {
      throw error;
    }

    return data.session;
  }

  return null;
}

export async function signInWithProvider(provider) {
  const name = PROVIDER_NAMES[provider] || provider;

  const redirectTo = Linking.createURL('/auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,

    options: {
      redirectTo,

      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error(`${name} authentication URL was not created.`);
  }

  const result = await WebBrowser.openAuthSessionAsync(
    data.url,
    redirectTo
  );

  if (result.type !== 'success') {
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error(`${name} sign in was cancelled.`);
    }

    throw new Error(`${name} sign in was not completed.`);
  }

  const session = await completeAuthFromUrl(result.url);

  if (!session) {
    throw new Error(`${name} sign in did not return a session.`);
  }

  return session;
}

export function signInWithGoogle() {
  return signInWithProvider('google');
}

export function signInWithApple() {
  return signInWithProvider('apple');
}
