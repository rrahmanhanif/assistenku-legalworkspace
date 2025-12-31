import { sbSelect } from "../_lib/supabase-rest.js";
import { appendAuditLog } from "../_lib/audit.js";
import { normalizeDocNumber, normalizeEmail } from "../_lib/http.js";

async function getPayload(req) {
  // Support: Node/Vercel pages-style (req.body) and Web Request (req.json()).
  if (req && typeof req.body === "object" && req.body !== null) return req.body;
  if (req && typeof req.json === "function") return await req.json();
  return {};
}

function send(res, status, data) {
  // Support for edge-like usage (Response exists) and node-like usage (res exists).
  if (typeof Response !== "undefined" && (!res || typeof res.end !== "function")) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function normalizeRole(role = "") {
  return String(role).trim().toUpperCase();
}

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

  if (!email || !role) {
    return send(res, 400, {
      message: "Email dan role wajib diisi",
      allowed: false,
    });
  }

  if (role === "ADMIN") {
    const allowed = email === "kontakassistenku@gmail.com";
    await appendAuditLog({
      actorRole: role,
      actorEmail: email,
      action: "auth.request-link",
      docNumber,
      scope: "ADMIN",
      metadata: { allowed },
    });
    return send(res, allowed ? 200 : 401, {
      allowed,
      docType: "ADMIN",
      message: allowed ? "Admin tervalidasi" : "Email admin tidak sesuai",
    });
  }

  if (!docNumber) {
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
      });
      return send(res, 404, {
        message: "Nomor dokumen atau email tidak cocok dengan registry",
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
