 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/login/login.js b/apps/login/login.js
index 86811da65878744180994e841c42f0ba53ac846c..07cd4b52036fc9ba766f965e2802edbb40fdfbe2 100644
--- a/apps/login/login.js
+++ b/apps/login/login.js
@@ -1,48 +1,50 @@
-import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
+import { supabase } from "../shared/supabase.js";
 
-const supabase = createClient(
-  "https://vptfubypmfafrnmwweyj.supabase.co",
-  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw"
-);
+const emailInput = document.getElementById("email");
+const otpInput = document.getElementById("otp");
+const btnSend = document.getElementById("btnSend");
+const btnVerify = document.getElementById("btnVerify");
 
-import { supabase } from "../../supabase.js";
-
-document.getElementById("loginBtn").onclick = async () => {
-  const email = document.getElementById("email").value;
-
-  await supabase.auth.signInWithOtp({ email });
-  alert("OTP dikirim ke email");
-};
-
-document.getElementById("sendOtp").onclick = async () => {
-  const email = document.getElementById("email").value.trim();
+btnSend.addEventListener("click", async () => {
+  const email = emailInput.value.trim();
   if (!email) return alert("Email wajib diisi");
 
   const { error } = await supabase.auth.signInWithOtp({
     email,
     options: { shouldCreateUser: false }
   });
 
   if (error) {
     alert(error.message);
   } else {
-    alert("OTP dikirim ke email");
+    alert("OTP dikirim ke email. Cek inbox/spam.");
   }
-};
+});
 
-document.getElementById("verifyOtp").onclick = async () => {
-  const email = document.getElementById("email").value.trim();
-  const token = document.getElementById("otp").value.trim();
-
-  const { error } = await supabase.auth.verifyOtp({
-    email,
-    token,
-    type: "email"
-  });
+btnVerify.addEventListener("click", async () => {
+  const email = emailInput.value.trim();
+  const token = otpInput.value.trim();
+  if (!email || !token) return alert("Email dan OTP wajib diisi");
 
+  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
   if (error) {
     alert(error.message);
-  } else {
+    return;
+  }
+
+  const user = data?.user;
+  const { data: profile } = await supabase
+    .from("profiles")
+    .select("role")
+    .eq("id", user.id)
+    .single();
+
+  const role = profile?.role;
+  if (role === "CLIENT") {
     window.location.href = "/apps/client/";
+  } else if (role === "MITRA") {
+    window.location.href = "/apps/mitra/";
+  } else {
+    alert("Role tidak dikenali. Hubungi admin.");
   }
-};
+});
 
EOF
)
