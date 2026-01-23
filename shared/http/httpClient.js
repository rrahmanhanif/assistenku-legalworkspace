// shared/http/httpClient.js
import { API_BASE_URL } from "./baseUrl.js";
import { loadPortalSession } from "/shared/session.js";

function buildUrl(path) {
  if (!path) throw new Error("Path kosong");
  if (typeof path !== "string") throw new Error("Path harus string");

  // Jika sudah full URL, pakai langsung
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Pastikan path diawali "/"
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${p}`;
}

export async function request(
  path,
  { method = "GET", body, headers = {}, token } = {}
) {
  const url = buildUrl(path);

  // headers plain object (bukan Headers) agar mudah merge
  const h = { Accept: "application/json", ...(headers || {}) };

  // Token (Bearer)
  if (token) h.Authorization = `Bearer ${token}`;

  // Body handling
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;

  // Set JSON content-type hanya jika body ada dan bukan FormData
  if (body !== undefined && body !== null && !isForm) {
    if (!h["Content-Type"] && !h["content-type"]) {
      h["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method,
    headers: h,
    body:
      body === undefined || body === null
        ? undefined
        : isForm
        ? body
        : typeof body === "string"
        ? body
        : JSON.stringify(body)
  });

  // Parse response (JSON jika memungkinkan)
  let data = null;
  const ct = res.headers.get("content-type") || "";

  if (ct.includes("application/json")) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await res.text();
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const err = new Error("HTTP_ERROR");
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function ensureDeviceId() {
  try {
    if (typeof localStorage === "undefined") return null;
    let deviceId = localStorage.getItem("lw_device_id");
    if (!deviceId && typeof crypto !== "undefined" && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
      localStorage.setItem("lw_device_id", deviceId);
    }
    return deviceId;
  } catch {
    return null;
  }
}

export function buildSessionHeaders() {
  const session = loadPortalSession?.() || null;
  const headers = {};

  // Admin code (jika ada)
  if (session?.adminCode) {
    headers["x-admin-code"] = session.adminCode;
  }

  // Doc number (session dulu, lalu localStorage)
  let docNumber = session?.docNumber || null;
  if (!docNumber) {
    try {
      if (typeof localStorage !== "undefined") {
        docNumber = localStorage.getItem("lw_doc_number");
      }
    } catch {
      // ignore
    }
  }
  if (docNumber) headers["x-doc-number"] = docNumber;

  // Device id (persist)
  const deviceId = ensureDeviceId();
  if (deviceId) headers["x-device-id"] = deviceId;

  return {
    headers,
    token: session?.idToken || null
  };
}

export async function requestWithSession(path, options = {}) {
  const session = loadPortalSession?.() || null;

  const sessionPack = buildSessionHeaders();
  const mergedHeaders = { ...sessionPack.headers, ...(options.headers || {}) };

  const token = options.token || sessionPack.token || session?.idToken || null;

  return request(path, {
    ...options,
    headers: mergedHeaders,
    token
  });
}

// Untuk request ke URL eksternal (tidak pakai API_BASE_URL)
export async function requestExternal(
  url,
  { method = "GET", body, headers = {} } = {}
) {
  const res = await fetch(url, { method, headers, body });
  if (!res.ok) {
    const err = new Error("HTTP_ERROR");
    err.status = res.status;
    try {
      err.data = await res.text();
    } catch {
      err.data = null;
    }
    throw err;
  }
  return res;
}
