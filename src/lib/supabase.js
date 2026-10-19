import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// This key is the "publishable" / anon key — it is safe to keep in client code.
// Never put the secret/service_role key here or anywhere in the app.
export const supabaseUrl = 'https://xrgyqsfnaquypahiyqzb.supabase.co';
export const supabaseAnonKey = 'sb_publishable_fswYVlX0w5nnnOLdvKT6pA_NUdIPMzh';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
