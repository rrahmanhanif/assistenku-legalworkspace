import { json } from "../_lib/http.js";
import { requireUser } from "../_lib/auth.js";
import { sbInsert, sbSelect } from "../_lib/supabase-rest.js";
import { appendAuditLog } from "../_lib/audit.js";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function fetchHolidays() {
  const calendarId = requireEnv("GOOGLE_CALENDAR_ID");
  const apiKey = requireEnv("GOOGLE_API_KEY");

  const now = new Date();
  const end = new Date(now.getFullYear() + 1, 11, 31);
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`
  );
  url.searchParams.set("key", apiKey);
  url.searchParams.set("timeMin", new Date(now.getFullYear(), 0, 1).toISOString());
  url.searchParams.set("timeMax", end.toISOString());
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Google Calendar error ${res.status}`);
  const resJson = await res.json();
  return (resJson.items || [])
    .map((item) => ({
      date: item.start?.date,
      summary: item.summary,
      source_id: item.id,
    }))
    .filter((item) => item.date);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return json(res, 405, { message: "Method Not Allowed" });

  try {
    const user = await requireUser(req, { expectedRole: "ADMIN" });
    const holidays = await fetchHolidays();

    if (!holidays.length) {
      return json(res, 200, { imported: 0 });
    }

    // Clean duplicates by source_id
    const existing = await sbSelect("holidays_cache", {});
    const existingIds = new Set(existing.map((r) => r.source_id));
    const newRows = holidays.filter((h) => !existingIds.has(h.source_id));

    if (newRows.length) {
      await sbInsert(
        "holidays_cache",
        newRows.map((row) => ({ ...row, created_at: new Date().toISOString() })),
        { returning: "minimal" }
      );
    }

    await appendAuditLog({
      actorRole: user.role,
      actorEmail: user.email,
      action: "holidays.sync",
      metadata: { imported: newRows.length },
    });

    return json(res, 200, { imported: newRows.length, total: holidays.length });
  } catch (err) {
    return json(res, err.statusCode || 500, { message: err.message });
  }
}
