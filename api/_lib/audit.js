import { sbInsert } from "./supabase-rest.js";
import { normalizeDocNumber, normalizeEmail } from "./http.js";

export async function appendAuditLog(entry) {
  const payload = {
    actor_role: entry.actorRole || null,
    actor_email: entry.actorEmail ? normalizeEmail(entry.actorEmail) : null,
    action: entry.action,
    doc_number: entry.docNumber ? normalizeDocNumber(entry.docNumber) : null,
    doc_type: entry.docType || null,
    scope: entry.scope || null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    created_at: new Date().toISOString(),
  };

  try {
    await sbInsert("audit_logs", [payload], { returning: "minimal" });
  } catch (err) {
    console.error("Failed to write audit log", err);
  }
}
