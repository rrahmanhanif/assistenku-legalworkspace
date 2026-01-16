import { loadPortalSession } from "/shared/session.js";

export const API_BASE = (window.__API_BASE__ || "https://api.assistenku.com")
  .replace(/\/$/, "");

export async function apiFetch(
  path,
  { method = "GET", body, headers } = {}
) {
  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const session = loadPortalSession();
  const finalHeaders = new Headers(headers || {});
  finalHeaders.set("Content-Type", "application/json");

  if (session?.idToken) {
    finalHeaders.set("Authorization", `Bearer ${session.idToken}`);
  }

  if (session?.role === "ADMIN" && session?.adminCode) {
    finalHeaders.set("x-admin-code", session.adminCode);
  }

  const fetchOptions = {
    method,
    headers: finalHeaders
  };

  if (body !== undefined) {
    fetchOptions.body =
      typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();

  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    if (!response.ok) {
      throw new Error(`Request gagal (${response.status})`);
    }
    throw error;
  }

  if (!response.ok) {
    const message =
      data?.message || `Request gagal (${response.status})`;
    throw new Error(message);
  }

  return data;
}
