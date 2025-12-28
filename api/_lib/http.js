// api/_lib/http.js
export function json(res, status, data) {
  return res
    .status(status)
    .setHeader("Content-Type", "application/json")
    .send(JSON.stringify(data));
}

export async function readJson(req) {
  if (req?.body && typeof req.body === "object") return req.body;

  // fallback: raw body
  const chunks = [];
  await new Promise((resolve) => {
    req.on("data", (c) => chunks.push(c));
    req.on("end", resolve);
  });

  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function getBearerToken(req) {
  const h = req.headers?.authorization || "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export function getDocNumber(req) {
  return (req.headers?.["x-doc-number"] || req.headers?.["X-Doc-Number"] || "").toString().trim();
}

export function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

export function normalizeDocNumber(value = "") {
  return String(value).trim().toUpperCase();
}
