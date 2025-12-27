<script type="module">
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  "https://vptfubypmfafrnmwweyj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmwc"
);

window.verifyOtp = async function () {
  const email = document.getElementById("email").value;
  const token = document.getElementById("otp").value;

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error) {
    alert(error.message);
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile.role === "CLIENT") {
    window.location.href = "/apps/client/";
  } else if (profile.role === "MITRA") {
    window.location.href = "/apps/mitra/";
  } else {
    alert("Role tidak dikenali");
  }
};
</script>
