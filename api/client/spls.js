// api/client/spls.js
import { json, getBearerToken, getDocNumber, normalizeEmail, normalizeDocNumber } from "../_lib/http.js";
import { verifyIdToken } from "../_lib/firebase-admin.js";
import { sbSelect } from "../_lib/supabase-rest.js";

async function requireClientScope(email, docNumber) {
  // registry table yang direkomendasikan: document_registry
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

    const registry = await requireClientScope(email, docNumber);
    if (!registry) {
      return json(res, 403, { message: "Akses ditolak: registry tidak cocok atau tidak aktif" });
    }

    // Ambil SPL yang terkait scope docNumber (IPL/Addendum).
    // Default kolom relasi: ipl_number. Bisa Anda ubah dengan env jika schema berbeda.
    const linkField = process.env.SPL_LINK_FIELD || "ipl_number";

    const rows = await sbSelect("spl", {
      select: "id,client,mitra,status,documents,hash,updated_at",
      [linkField]: `eq.${docNumber}`,
      order: "updated_at.desc",
      limit: 200,
    });

    return json(res, 200, { ok: true, rows });
  } catch (err) {
    return json(res, 500, { message: err?.message || "Server error" });
  }
}
