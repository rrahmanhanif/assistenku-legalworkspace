import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(
  'https://vptfubypmfafrnmwweyj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw'
)
