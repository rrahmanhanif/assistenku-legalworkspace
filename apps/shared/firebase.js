 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/shared/firebase.js b/apps/shared/firebase.js
index 150eb5f2473c934e7334f5c9f0c94482e8dfe3d6..1ca100766bb0a40f0a1cbf40b8f9d605cfff2418 100644
--- a/apps/shared/firebase.js
+++ b/apps/shared/firebase.js
@@ -56,54 +56,57 @@ export async function getFirebaseIdToken(forceRefresh = false) {
 }
 
 export async function signOutFirebase() {
   const auth = getFirebaseAuth();
   try {
     await signOut(auth);
   } catch {
     // ignore
   }
 }
 
 async function validateRegistry(payload) {
   const res = await fetch("/api/auth/request-link", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(payload),
   });
   const json = await res.json();
   if (!res.ok || !json.allowed) {
     const msg = json?.message || "Registry tidak valid";
     throw new Error(msg);
   }
   return json;
 }
 
-export async function sendEmailOtp(email, { role, docType, docNumber, template }) {
+export async function sendEmailOtp(
+  email,
+  { role, docType, docNumber, template, adminCode }
+) {
   const auth = getFirebaseAuth();
   const baseUrl = window.LEGALWORKSPACE_BASE_URL || window.location.origin;
 
-  await validateRegistry({ email, role, docNumber, docType, template });
+  await validateRegistry({ email, role, docNumber, docType, template, adminCode });
 
   const actionCodeSettings = {
     url: `${baseUrl}/apps/login/?role=${encodeURIComponent(role)}&doc=${encodeURIComponent(
       docNumber || ""
     )}`,
     handleCodeInApp: true,
   };
 
   await sendSignInLinkToEmail(auth, email, actionCodeSettings);
   localStorage.setItem("lw_last_email", email);
 }
 
 export async function hasEmailOtpLink() {
   const auth = getFirebaseAuth();
   return isSignInWithEmailLink(auth, window.location.href);
 }
 
 export async function completeEmailOtpSignIn(email) {
   const auth = getFirebaseAuth();
   if (!(await hasEmailOtpLink())) return null;
   await signInWithEmailLink(auth, email, window.location.href);
   localStorage.removeItem("lw_pending_login");
   return await getFirebaseIdToken(true);
 }
 
EOF
)
