 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/api/overtime/decision.js b/api/overtime/decision.js
new file mode 100644
index 0000000000000000000000000000000000000000..bad895d18b0291ae5ad9b527d9165e527937b183
--- /dev/null
+++ b/api/overtime/decision.js
@@ -0,0 +1,37 @@
+import { json, readJson } from "../_lib/http.js";
+import { requireUser } from "../_lib/auth.js";
+import { sbUpdate } from "../_lib/supabase-rest.js";
+import { appendAuditLog } from "../_lib/audit.js";
+
+export default async function handler(req, res) {
+  if (req.method !== "POST") return json(res, 405, { message: "Method Not Allowed" });
+
+  try {
+    const user = await requireUser(req, { expectedRole: "CLIENT" });
+    const body = await readJson(req);
+
+    const status = body.status === "APPROVED" ? "APPROVED" : "REJECTED";
+    await sbUpdate(
+      "overtime_requests",
+      { id: `eq.${body.id}` },
+      {
+        status,
+        decided_by: user.email,
+        decided_at: new Date().toISOString(),
+      },
+      { returning: "minimal" }
+    );
+
+    await appendAuditLog({
+      actorRole: user.role,
+      actorEmail: user.email,
+      action: "overtime.decision",
+      docNumber: body.docNumber,
+      metadata: { status },
+    });
+
+    return json(res, 200, { ok: true });
+  } catch (err) {
+    return json(res, err.statusCode || 500, { message: err.message });
+  }
+}
 
EOF
)
