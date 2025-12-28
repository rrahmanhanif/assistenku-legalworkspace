// api/client/spl/lock.js
import { json, readJson, getBearerToken, getDocNumber, normalizeEmail, normalizeDocNumber } from "../../_lib/http.js";
import { verifyIdToken } from "../../_lib/firebase-admin.js";
import { sbSelect, sbUpdate, sbInsert } from "../../_lib/supabase-rest.js";

async function requireClientScope(email, docNumber) {
  const rows = await sbSelect("document_registry", {
    select: "role,doc_type,doc_number,email,name,scope,status",
    role: "eq.CLIENT",
    doc_number: `eq.${docNumber}`,
    email: `eq.${email}`,
    status: "eq.ACTIVE",
    limit: 1,
  });
  if (!rows?.length) return null;
  return rows[0];
}

export default async function handler(req, res) {
  try {
    if ((req.method || "").toUpperCase() !== "POST") {
      return json(res, 405, { message: "Method Not Allowed" });
    }

    const token = getBearerToken(req);
    if (!token) return json(res, 401, { message: "Missing Authorization Bearer token" });

    const decoded = await verifyIdToken(token);
    const uid = decoded?.uid || "";
    const email = normalizeEmail(decoded?.email || "");
    if (!email) return json(res, 401, { message: "Email tidak ditemukan pada token" });

    const docNumber = normalizeDocNumber(getDocNumber(req));
    if (!docNumber) return json(res, 400, { message: "Missing X-Doc-Number" });

    const registry = await requireClientScope(email, docNumber);
    if (!registry) return json(res, 403, { message: "Akses ditolak: registry tidak cocok atau tidak aktif" });

    const body = await readJson(req);
    const splId = (body?.splId || "").toString().trim();
    if (!splId) return json(res, 400, { message: "splId wajib diisi" });

    const linkField = process.env.SPL_LINK_FIELD || "ipl_number";

    // Pastikan SPL memang milik scope docNumber
    const found = await sbSelect("spl", {
      select: "id,status,hash",
      id: `eq.${splId}`,
      [linkField]: `eq.${docNumber}`,
      limit: 1,
    });

    if (!found?.length) return json(res, 404, { message: "SPL tidak ditemukan dalam scope dokumen" });

    // Update status -> LOCKED
    await sbUpdate(
      "spl",
      { id: `eq.${splId}`, [linkField]: `eq.${docNumber}` },
      { status: "LOCKED", updated_at: new Date().toISOString() }
    );

    // Append-only audit log
    await sbInsert("audit_logs", [
      {
        at: new Date().toISOString(),
        actor_uid: uid,
        actor_email: email,
        role: "CLIENT",
        action: "SPL_LOCK",
        entity_type: "spl",
        entity_id: splId,
        doc_number: docNumber,
        doc_type: registry.doc_type || "IPL",
        metadata: { prev_status: found[0].status, hash: found[0].hash || null },
        ip: (req.headers["x-forwarded-for"] || "").toString().split(",")[0].trim() || null,
        user_agent: (req.headers["user-agent"] || "").toString() || null,
      },
    ]);

    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, 500, { message: err?.message || "Server error" });
  }
}
