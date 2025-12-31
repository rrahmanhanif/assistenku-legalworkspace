import { json } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";
import { sbSelect } from "../_lib/supabase-rest.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { message: "Method Not Allowed" });

  try {
    const user = await requireUser(req, {});
    const role = user.role;
    let filter = {};
    if (role === "MITRA") filter = { requested_by: `eq.${user.email}` };
    const data = await sbSelect("overtime_requests", filter);
    return json(res, 200, { requests: data });
  } catch (err) {
    return json(res, err.statusCode || 500, { message: err.message });
  }
}
