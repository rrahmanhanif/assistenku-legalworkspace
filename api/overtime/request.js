import { json, readJson } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";
import { sbInsert } from "../_lib/supabase-rest.js";
import { appendAuditLog } from "../_lib/audit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { message: "Method Not Allowed" });

  try {
    const user = await requireUser(req, { expectedRole: "MITRA" });
    const body = await readJson(req);

    const row = {
      doc_number: body.docNumber,
      requested_by: user.email,
      date: body.date,
      hours: body.hours,
      reason: body.reason,
      status: "PENDING",
      created_at: new Date().toISOString(),
    };

    await sbInsert("overtime_requests", [row], { returning: "minimal" });
    await appendAuditLog({
      actorRole: user.role,
      actorEmail: user.email,
      action: "overtime.request",
      docNumber: body.docNumber,
    });

    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, err.statusCode || 500, { message: err.message });
  }
}
