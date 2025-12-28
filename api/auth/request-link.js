import registry from "../../documents/seed/registry.json" assert { type: "json" };

function normalizeDocNumber(value = "") {
  return String(value).trim().toUpperCase();
}

async function getPayload(req) {
  // Support: Node/Vercel pages-style (req.body) and Web Request (req.json()).
  if (req && typeof req.body === "object" && req.body !== null) return req.body;
  if (req && typeof req.json === "function") return await req.json();
  return null;
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

function findRegistryEntry({ role, docNumber }) {
  const normalized = normalizeDocNumber(docNumber);

  if (role === "CLIENT") {
    return (registry.clients || []).find(
      (entry) => normalizeDocNumber(entry.docNumber) === normalized
    );
  }

  if (role === "MITRA") {
    return (registry.mitra || []).find(
      (entry) => normalizeDocNumber(entry.docNumber) === normalized
    );
  }

  return null;
}

export default async function handler(req, res) {
  const method =
    (req && req.method) || (req instanceof Request ? req.method : "");

  if (method !== "POST") {
    return send(res, 405, { message: "Method Not Allowed" });
  }

  const body = (await getPayload(req)) || {};
  const role = body.role ? String(body.role).trim().toUpperCase() : "";
  const email = body.email ? String(body.email).trim() : "";
  const docNumber = body.docNumber ? String(body.docNumber).trim() : "";

  if (!email || !role) {
    return send(res, 400, {
      message: "Email dan role wajib diisi",
      allowed: false,
    });
  }

  if (role === "ADMIN") {
    const allowed = email.toLowerCase() === "kontakassistenku@gmail.com";
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

  const registryEntry = findRegistryEntry({ role, docNumber });
  if (!registryEntry) {
    return send(res, 404, {
      message: "Nomor dokumen tidak ditemukan",
      allowed: false,
    });
  }

  const emailMatches =
    String(registryEntry.email || "").trim().toLowerCase() === email.toLowerCase();

  if (!emailMatches) {
    return send(res, 401, {
      message: "Email tidak cocok dengan registry",
      allowed: false,
    });
  }

  return send(res, 200, {
    allowed: true,
    docType: registryEntry.docType,
    name: registryEntry.name,
    scope: registryEntry.scope,
  });
}
