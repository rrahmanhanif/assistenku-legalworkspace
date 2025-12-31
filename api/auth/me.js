import { json, getDocNumber } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req, res) {
  const method = req.method || "";
  if (method !== "GET") return json(res, 405, { message: "Method Not Allowed" });

  try {
    const docNumber = getDocNumber(req);
    const user = await requireUser(req, { docNumber });

    return json(res, 200, {
      email: user.email,
      role: user.role,
      docNumber: docNumber || user.registry?.doc_number || null,
      docType: user.registry?.doc_type || null,
      scope: user.registry?.scope || null,
    });
  } catch (err) {
    return json(res, err.statusCode || 500, { message: err.message });
  }
}
