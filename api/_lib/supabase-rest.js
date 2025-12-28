// api/_lib/supabase-rest.js
function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function baseHeaders() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return {
    url,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      accept: "application/json",
    },
  };
}

function qs(params = {}) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    u.set(k, String(v));
  }
  return u.toString();
}

export async function sbSelect(table, queryParams = {}) {
  const { url, headers } = baseHeaders();
  const endpoint = `${url}/rest/v1/${table}?${qs(queryParams)}`;
  const res = await fetch(endpoint, { headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.message || `Supabase select error: ${res.status}`);
  return json;
}

export async function sbInsert(table, rows, { returning = "representation" } = {}) {
  const { url, headers } = baseHeaders();
  const endpoint = `${url}/rest/v1/${table}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: `return=${returning}`,
    },
    body: JSON.stringify(rows),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.message || `Supabase insert error: ${res.status}`);
  return json;
}

export async function sbUpdate(table, matchParams, patch, { returning = "representation" } = {}) {
  const { url, headers } = baseHeaders();
  const endpoint = `${url}/rest/v1/${table}?${qs(matchParams)}`;
  const res = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: `return=${returning}`,
    },
    body: JSON.stringify(patch),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(json?.message || `Supabase update error: ${res.status}`);
  return json;
}
