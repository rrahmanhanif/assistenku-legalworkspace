import { verifyIdToken } from "./firebase-admin.js";
import { getBearerToken, normalizeDocNumber } from "./http.js";
import { sbSelect } from "./supabase-rest.js";
import { appendAuditLog } from "./audit.js";

async function findRegistryEntry({ docNumber }) {
  const normalized = normalizeDocNumber(docNumber);
  const data = await sbSelect(
    "registry",
    normalized
      ? {
          doc_number: `eq.${normalized}`,
        }
      : {}
  );
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

  if (expectedRole && decoded.role && decoded.role !== expectedRole) {
    const err = new Error("Role tidak sesuai scope portal");
    err.statusCode = 403;
    throw err;
  }

  const docNumberNormalized = docNumber ? normalizeDocNumber(docNumber) : null;
  let registryEntry = null;
  if (docNumberNormalized) {
    registryEntry = await findRegistryEntry({ docNumber: docNumberNormalized });
    if (!registryEntry) {
      const err = new Error("Nomor dokumen tidak terdaftar");
      err.statusCode = 403;
      throw err;
    }

    if (expectedRole && registryEntry.role && registryEntry.role !== expectedRole) {
      const err = new Error("Dokumen tidak sesuai role portal");
      err.statusCode = 403;
      throw err;
    }

    if (scope && registryEntry.scope && registryEntry.scope !== scope) {
      const err = new Error("Scope tidak sesuai");
      err.statusCode = 403;
      throw err;
    }
  }

  const user = {
    uid: decoded.uid,
    email: decoded.email,
    role: decoded.role || expectedRole || null,
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
