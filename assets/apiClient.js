// assets/apiClient.js
import { getFirebaseIdToken } from "/apps/shared/firebase.js";
import { API_BASE_URL } from "/shared/http/baseUrl.js";
import { endpoints } from "/shared/http/endpoints.js";
import { buildSessionHeaders, request } from "/shared/http/httpClient.js";

export function getApiBase() {
  return API_BASE_URL;
}

export async function apiFetch(
  path,
  { method = "GET", headers = {}, body = null, token, formData = false } = {}
) {
  if (!path.startsWith("/api/")) {
    throw new Error("Path harus diawali dengan /api/");
  }

  // Ambil session headers (admin code, doc number, device id, dll) dari httpClient
  const sessionAuth = buildSessionHeaders?.() || { headers: {}, token: null };

  // Prioritas token:
  // 1) token explicit param
  // 2) Firebase ID token
  // 3) token dari sessionAuth (jika ada)
  const finalToken =
    token || (await getFirebaseIdToken().catch(() => null)) || sessionAuth.token;

  // Merge headers: session headers dulu, lalu override dari param headers
  const finalHeaders = { ...sessionAuth.headers, ...headers };

  // Delegasikan semua ke request() agar konsisten (timeout, json, error shape)
  return request(path, {
    method,
    headers: finalHeaders,
    token: finalToken,
    // Jika formData true, body dikirim apa adanya (FormData)
    // Jika bukan, body juga dikirim apa adanya; httpClient yang bertanggung jawab stringify
    body: body
  });
}

export async function apiHealth() {
  return request("/api/health", { method: "GET" });
}

export async function apiWhoAmI() {
  const token = await getFirebaseIdToken().catch(() => null);
  return request(endpoints.auth.whoami, { token, method: "POST" });
}

// Expose helper ke window (opsional, untuk debugging / smoke test)
if (typeof window !== "undefined") {
  window.apiClient = {
    apiFetch,
    apiHealth,
    apiWhoAmI,
    getApiBase
  };
}
