import { getFirebaseIdToken } from "/apps/shared/firebase.js";

/**
 * Resolve API base URL dari berbagai environment.
 */
function resolveEnvBase() {
  if (typeof window !== "undefined" && window.ASSISTENKU_API_BASE) {
    return window.ASSISTENKU_API_BASE;
  }
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE) {
    return process.env.NEXT_PUBLIC_API_BASE;
  }
  return "https://api.assistenku.com";
}

export function getApiBase() {
  const base = resolveEnvBase();
  return base?.replace(/\/$/, "") || "https://api.assistenku.com";
}

function getTimeoutMs(customTimeout) {
  if (typeof customTimeout === "number") return customTimeout;
  if (typeof window !== "undefined" && window.ASSISTENKU_API_TIMEOUT_MS) {
    return window.ASSISTENKU_API_TIMEOUT_MS;
  }
  return 20000;
}

/**
 * Wrapper fetch terpusat untuk seluruh aplikasi Assistenku.
 */
export async function apiFetch(
  path,
  {
    method = "GET",
    headers = {},
    body = null,
    admin = false,
    formData = false,
    timeoutMs,
  } = {}
) {
  if (!path.startsWith("/api/")) {
    throw new Error("Path harus diawali dengan /api/");
  }

  const base = getApiBase();
  const url = `${base}${path}`;

  const token = await getFirebaseIdToken().catch(() => null);
  const finalHeaders = new Headers(headers || {});

  finalHeaders.set("Accept", "application/json");

  if (!formData && body !== null && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (token) {
    finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  if (admin) {
    const adminCode =
      sessionStorage.getItem("lw_admin_code") ||
      localStorage.getItem("lw_admin_code");
    if (adminCode) finalHeaders.set("x-admin-code", adminCode);
  }

  const docNumber = localStorage.getItem("lw_doc_number");
  if (docNumber) finalHeaders.set("x-doc-number", docNumber);

  let deviceId = localStorage.getItem("lw_device_id");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("lw_device_id", deviceId);
  }
  finalHeaders.set("x-device-id", deviceId);

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    getTimeoutMs(timeoutMs)
  );

  const init = {
    method,
    headers: finalHeaders,
    signal: controller.signal,
  };

  if (body !== null) {
    init.body = formData ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    clearTimeout(timer);
    throw {
      code: "NETWORK_ERROR",
      message: err?.message || "Network error",
      status: 0,
    };
  }

  clearTimeout(timer);

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw {
      code: "NON_JSON_RESPONSE",
      message: "Respon bukan JSON",
      status: res.status,
      details: text,
    };
  }

  if (!res.ok) {
    throw {
      code: data?.code || "API_ERROR",
      message: data?.message || "Request gagal",
      status: res.status,
      details: data,
    };
  }

  return data;
}

/**
 * Health check API (tanpa auth).
 */
export async function apiHealth() {
  const url = `${getApiBase()}/api/health`;
  const res = await fetch(url);
  const text = await res.text();

  try {
    return JSON.parse(text);
  } catch {
    return { ok: res.ok, status: res.status, raw: text };
  }
}

/**
 * Identitas user berdasarkan Firebase ID token.
 */
export async function apiWhoAmI() {
  return apiFetch("/api/auth/whoami", { method: "POST" });
}

/**
 * Expose helper ke window (opsional, untuk debugging / smoke test).
 */
if (typeof window !== "undefined") {
  window.apiClient = {
    apiFetch,
    apiHealth,
    apiWhoAmI,
    getApiBase,
  };
}
