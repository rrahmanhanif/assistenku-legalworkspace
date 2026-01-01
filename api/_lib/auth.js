import { verifyIdToken } from "./firebase-admin.js";
import { getBearerToken, normalizeDocNumber, normalizeEmail } from "./http.js";
import { sbSelect } from "./supabase-rest.js";
import { appendAuditLog } from "./audit.js";

async function findRegistryEntry({ docNumber, expectedRole, email }) {
  const normalized = normalizeDocNumber(docNumber);
  const normalizedEmail = normalizeEmail(email);

  const params = normalized
    ? {
        doc_number: `eq.${normalized}`,
      }
    : {};

  if (expectedRole) params.role = `eq.${expectedRole}`;
  if (normalizedEmail) params.email = `eq.${normalizedEmail}`;

  const data = await sbSelect("registry", params);
  return Array.isArray(data) && data.length ? data[0] : null;
}

export async function requireUser(req, { expectedRole, docNumber, scope }) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Missing bearer token");
    err.statusCode = 401;
    throw err;
  }

  let decoded;
  try {
    decoded = await verifyIdToken(token);
  } catch (e) {
    const err = new Error("Firebase token tidak valid");
    err.statusCode = 401;
    throw err;
  }

  const docNumberNormalized = docNumber ? normalizeDocNumber(docNumber) : null;
  let registryEntry = null;

  // ADMIN path enforcement
  if (expectedRole === "ADMIN") {
    const adminEmail = "kontakassistenku@gmail.com";
    const adminCodeHeader =
      req.headers?.["x-admin-code"] || req.headers?.["X-Admin-Code"] || "";
    const expectedCode = process.env.ADMIN_ACCESS_CODE || "309309";
    const emailOk =
      normalizeEmail(decoded.email) === normalizeEmail(adminEmail);
    const codeOk =
      adminCodeHeader && String(adminCodeHeader).trim() === expectedCode;

    if (!emailOk || !codeOk) {
      await appendAuditLog({
        actorRole: "ADMIN",
        actorEmail: decoded.email,
        action: "auth.admin.requireUser.fail",
        metadata: {
          reason: !emailOk
            ? "bad_email"
            : !adminCodeHeader
            ? "missing_code"
            : "bad_code",
        },
      });
      const err = new Error("Akses admin tidak valid");
      err.statusCode = 403;
      throw err;
    }
  }

  if (expectedRole && expectedRole !== "ADMIN") {
    if (!docNumberNormalized) {
      await appendAuditLog({
        actorRole: expectedRole,
        actorEmail: decoded.email,
        action: "auth.user.requireUser.fail",
        metadata: { reason: "missing_docNumber" },
      });
      const err = new Error("Nomor dokumen wajib disertakan");
      err.statusCode = 403;
      throw err;
    }

    registryEntry = await findRegistryEntry({
      docNumber: docNumberNormalized,
      expectedRole,
      email: decoded.email,
    });

    if (!registryEntry) {
      await appendAuditLog({
        actorRole: expectedRole,
        actorEmail: decoded.email,
        action: "auth.user.requireUser.fail",
        docNumber: docNumberNormalized,
        metadata: { reason: "registry_mismatch" },
      });
      const err = new Error("Nomor dokumen tidak terdaftar");
      err.statusCode = 403;
      throw err;
    }

    if (!registryEntry.is_verified) {
      await appendAuditLog({
        actorRole: expectedRole,
        actorEmail: decoded.email,
        action: "auth.user.requireUser.fail",
        docNumber: docNumberNormalized,
        metadata: { reason: "unverified" },
      });
      const err = new Error("Dokumen belum diverifikasi");
      err.statusCode = 403;
      throw err;
    }

    if (scope && registryEntry.scope && registryEntry.scope !== scope) {
      await appendAuditLog({
        actorRole: expectedRole,
        actorEmail: decoded.email,
        action: "auth.user.requireUser.fail",
        docNumber: docNumberNormalized,
        metadata: { reason: "scope_mismatch" },
      });
      const err = new Error("Scope tidak sesuai");
      err.statusCode = 403;
      throw err;
    }
  }

  const user = {
    uid: decoded.uid,
    email: decoded.email,
    role: registryEntry?.role || expectedRole || decoded.role || null,
    registry: registryEntry,
    claims: decoded,
  };

  await appendAuditLog({
    actorRole: user.role,
    actorEmail: user.email,
    action: "auth.me",
    docNumber: docNumberNormalized,
    docType: registryEntry?.doc_type || registryEntry?.docType,
    scope: registryEntry?.scope,
  });

  return user;
}

export async function requireScopeByDocNumber(req, docNumber, { expectedRole }) {
  return await requireUser(req, { expectedRole, docNumber });
}
