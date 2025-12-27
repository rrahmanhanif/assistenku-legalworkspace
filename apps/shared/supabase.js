 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/shared/supabase.js b/apps/shared/supabase.js
index f9857a1d14fdff6b4155f21dd452879abc7d8496..365e0d62f5da2f7c256e4dd798eddd07a82e0d13 100644
--- a/apps/shared/supabase.js
+++ b/apps/shared/supabase.js
@@ -1,6 +1,6 @@
 import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
 
 export const supabase = createClient(
   'https://vptfubypmfafrnmwweyj.supabase.co',
-  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw'
+  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw'
 )
 
EOF
)
