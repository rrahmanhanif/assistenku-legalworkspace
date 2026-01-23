// shared/apiClient.js
import { API_BASE_URL } from "/shared/http/baseUrl.js";
import { requestWithSession } from "/shared/http/httpClient.js";

export const API_BASE = API_BASE_URL;

export async function apiFetch(path, { method = "GET", body, headers } = {}) {
  return requestWithSession(path, { method, body, headers });
}
