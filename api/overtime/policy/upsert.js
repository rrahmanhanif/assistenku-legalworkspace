import { json, readJson } from "../../_lib/http.js";
import { requireUser } from "../../_lib/auth.js";
import { sbInsert } from "../../_lib/supabase-rest.js";
import { appendAuditLog } from "../../_lib/audit.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { message: "Method Not Allowed" });

  try {
    const user = await requireUser(req, { expectedRole: "ADMIN" });
    const body = await readJson(req);

    const row = {
      scope: body.scope,
      weekend_allowed: !!body.weekendAllowed,
      holiday_allowed: !!body.holidayAllowed,
      max_hours_per_day: body.maxHoursPerDay ?? null,
      updated_at: new Date().toISOString(),
    };

    await sbInsert("overtime_policy", [row], { returning: "minimal" });

    await appendAuditLog({
      actorRole: user.role,
      actorEmail: user.email,
      action: "overtime.policy.upsert",
      scope: body.scope,
    });

    return json(res, 200, { ok: true });
  } catch (err) {
    return json(res, err.statusCode || 500, { message: err.message });
  }
}
