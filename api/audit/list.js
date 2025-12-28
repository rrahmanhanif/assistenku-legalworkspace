// api/audit/list.js
import { json, getBearerToken, getDocNumber, normalizeEmail, normalizeDocNumber } from "../_lib/http.js";
import { verifyIdToken } from "../_lib/firebase-admin.js";
import { sbSelect } from "../_lib/supabase-rest.js";

export default async function handler(req, res) {
  try {
    if ((req.method || "").toUpperCase() !== "GET") {
      return json(res, 405, { message: "Method Not Allowed" });
    }

    const token = getBearerToken(req);
    if (!token) return json(res, 401, { message: "Missing Authorization Bearer token" });

    const decoded = await verifyIdToken(token);
    const email = normalizeEmail(decoded?.email || "");
    if (!email) return json(res, 401, { message: "Email tidak ditemukan pada token" });

    const docNumber = normalizeDocNumber(getDocNumber(req));
    if (!docNumber) return json(res, 400, { message: "Missing X-Doc-Number" });

    const limit = Math.min(parseInt(req.query?.limit || "50", 10) || 50, 200);

    // Filter berdasarkan doc_number (scope)
    const rows = await sbSelect("audit_logs", {
      select: "at,role,action,entity_type,entity_id,doc_number,doc_type",
      doc_number: `eq.${docNumber}`,
      order: "at.desc",
      limit,
    });

    return json(res, 200, { ok: true, rows });
  } catch (err) {
    return json(res, 500, { message: err?.message || "Server error" });
  }
}
