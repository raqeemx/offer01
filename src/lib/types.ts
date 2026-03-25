import type { SupabaseClient, User } from '@supabase/supabase-js'

export type Bindings = {
  SUPABASE_URL: string
  SUPABASE_ANON_KEY: string
}

export type Variables = {
  user: User
  supabase: SupabaseClient
  token: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: Variables
}
