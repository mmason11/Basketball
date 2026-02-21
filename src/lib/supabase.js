import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

if (!supabaseConfigured) {
  console.warn(
    'Missing Supabase environment variables. Data will not persist.\n' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.'
  )
}

// Create a mock client if not configured to prevent crashes
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
