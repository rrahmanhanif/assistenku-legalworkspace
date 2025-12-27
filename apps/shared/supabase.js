import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(
  'https://vptfubypmfafrnmwweyj.supabase.co',
  'ANON_PUBLIC_KEY'
)
