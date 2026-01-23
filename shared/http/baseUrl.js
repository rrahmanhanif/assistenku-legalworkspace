const envBaseUrl =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL
    : null;

const windowBaseUrl =
  typeof window !== "undefined"
    ? window.__API_BASE_URL__ || window.__API_BASE__ || window.ASSISTENKU_API_BASE
    : null;

export const API_BASE_URL = (windowBaseUrl || envBaseUrl || "https://api.assistenku.com").replace(
  /\/$/,
  ""
);
