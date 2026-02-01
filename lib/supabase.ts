import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

// Support both Expo-prefixed and standard environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || // Priority for server-side/admin tasks
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ''

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseKey) {
  // We only throw if we are in a browser/app context and missing keys.
  // For node scripts, let the caller handle errors or check process.env.
  if (typeof window !== 'undefined') {
    throw new Error(
      'Missing Supabase environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
    )
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: typeof window !== 'undefined',
    persistSession: typeof window !== 'undefined',
  },
})

export type { Database }