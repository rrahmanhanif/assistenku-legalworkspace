<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://vptfubypmfafrnmwweyj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw"
);

export async function requireRole(expectedRole) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = "/apps/login/";
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !data || data.role !== expectedRole) {
    alert("Akses ditolak: role tidak sesuai");
    await supabase.auth.signOut();
    window.location.href = "/apps/login/";
  }
}
</script>
