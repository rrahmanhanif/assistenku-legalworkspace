// api/auth/request-link.js

import { send } from "../_lib/send.js";
import { getPayload } from "../_lib/http.js";
import { sbSelect } from "../_lib/supabase-rest.js";
import { appendAuditLog } from "../_lib/audit.js";
import {
  normalizeEmail,
  normalizeDocNumber,
  normalizeRole,
} from "../_lib/http.js";

async function findRegistryEntry({ role, docNumber, email }) {
  const normalizedRole = normalizeRole(role);
  const normalizedDoc = normalizeDocNumber(docNumber);
  const normalizedEmail = normalizeEmail(email);

  const rows = await sbSelect("registry", {
    role: `eq.${normalizedRole}`,
    doc_number: `eq.${normalizedDoc}`,
  });

  const entry = Array.isArray(rows) && rows.length ? rows[0] : null;
  if (!entry) return null;
  if (normalizedEmail && normalizeEmail(entry.email) !== normalizedEmail) return null;
  return entry;
}

export default async function handler(req, res) {
  const method = (req && req.method) || (req instanceof Request ? req.method : "");
  if (method !== "POST") {
    return send(res, 405, { message: "Method Not Allowed" });
  }

  const body = (await getPayload(req)) || {};
  const role = normalizeRole(body.role);
  const email = normalizeEmail(body.email);
  const docNumber = body.docNumber ? normalizeDocNumber(body.docNumber) : null;
  const adminCode = body.adminCode ? String(body.adminCode).trim() : "";

  if (!email || !role) {
    return send(res, 400, {
      message: "Email dan role wajib diisi",
      allowed: false,
    });
  }

  if (role === "ADMIN") {
    const adminEmail = "kontakassistenku@gmail.com";
    const expectedCode = process.env.ADMIN_ACCESS_CODE || "309309";
    const emailOk = email === adminEmail;
    const codeOk = adminCode && adminCode === expectedCode;
    const allowed = emailOk && codeOk;

    await appendAuditLog({
      actorRole: role,
      actorEmail: email,
      action: allowed ? "auth.request-link.success" : "auth.request-link.fail",
      docNumber,
      scope: "ADMIN",
      metadata: { role, reason: allowed ? "ok" : emailOk ? "bad_code" : "bad_email" },
    });

    return send(res, allowed ? 200 : 401, {
      allowed,
      docType: "ADMIN",
      message: allowed ? "Admin tervalidasi" : "Kode admin tidak valid",
    });
  }

  if (!docNumber) {
    await appendAuditLog({
      actorRole: role,
      actorEmail: email,
      action: "auth.request-link.fail",
      docNumber,
      metadata: { reason: "missing_docNumber" },
    });

    return send(res, 400, {
      message: "Nomor dokumen wajib diisi",
      allowed: false,
    });
  }

  try {
    const registryEntry = await findRegistryEntry({ role, docNumber, email });
    if (!registryEntry) {
      await appendAuditLog({
        actorRole: role,
        actorEmail: email,
        action: "auth.request-link.fail",
        docNumber,
        metadata: { reason: "mismatch" },
      });

      return send(res, 404, {
        message: "Nomor dokumen atau email tidak cocok dengan registry",
        allowed: false,
      });
    }

    if (!registryEntry.is_verified) {
      await appendAuditLog({
        actorRole: role,
        actorEmail: email,
        action: "auth.request-link.fail",
        docNumber,
        metadata: { reason: "unverified" },
      });

      return send(res, 403, {
        message: "Dokumen belum diverifikasi admin",
        allowed: false,
      });
    }

    await appendAuditLog({
      actorRole: role,
      actorEmail: email,
      action: "auth.request-link.success",
      docNumber,
      docType: registryEntry.doc_type,
      scope: registryEntry.scope,
    });

    return send(res, 200, {
      allowed: true,
      docType: registryEntry.doc_type,
      name: registryEntry.name,
      scope: registryEntry.scope,
    });
  } catch (err) {
    console.error("request-link error", err);
    return send(res, 500, { message: "Internal error", allowed: false });
  }
}
