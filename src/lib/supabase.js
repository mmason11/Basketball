import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sajzgqtuqlskrjxlleya.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhanpncXR1cWxza3JqeGxsZXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzA3MjQsImV4cCI6MjA4NzIwNjcyNH0.P4BCsLgPVoWO7Ux0BPq-2a0N78qzg13XJrtP3DAauC4'

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey)

// Create client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
