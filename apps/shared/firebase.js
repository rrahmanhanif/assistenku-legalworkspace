import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let firebaseApp;
let firebaseAuth;
let configPromise;

function getContinueBaseUrl() {
  const rawBase = (window?.LEGALWORKSPACE_BASE_URL || window?.APP_BASE_URL || "").trim();
  const fallback = window.location.origin;
  const candidate = rawBase || fallback;

  try {
    const parsed = new URL(candidate);
    // normalize: origin + pathname, trim trailing slashes
    const normalized = (parsed.origin + parsed.pathname).replace(/\/+$/, "");
    return normalized || parsed.origin;
  } catch (_err) {
    return fallback;
  }
}

function normalizeGoogleServiceConfig(raw) {
  const client = raw?.client?.[0];
  const project = raw?.project_info;

  const apiKey = client?.api_key?.[0]?.current_key;
  const projectId = project?.project_id;
  const appId = client?.client_info?.mobilesdk_app_id;

  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    projectId,
    appId,
    databaseURL: project?.firebase_url,
    storageBucket: project?.storage_bucket,
    messagingSenderId: project?.project_number,
    authDomain: `${projectId}.firebaseapp.com`
  };
}

async function loadConfigFromGoogleService() {
  const response = await fetch("/apps/google-service.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("google-service.json tidak dapat diakses");
  }

  const json = await response.json();
  const config = normalizeGoogleServiceConfig(json);
  if (!config?.apiKey) {
    throw new Error("google-service.json tidak lengkap atau tidak valid");
  }

  // expose for other scripts if needed
  window.FIREBASE_CONFIG = config;
  return config;
}

async function resolveConfig() {
  const cfg = window?.FIREBASE_CONFIG || window?.firebaseConfig;
  if (cfg?.apiKey) return cfg;

  if (!configPromise) {
    configPromise = loadConfigFromGoogleService().catch((err) => {
      // reset promise so future calls can retry
      configPromise = null;
      throw err;
    });
  }

  try {
    return await configPromise;
  } catch (err) {
    console.warn("Gagal memuat google-service.json", err);
    throw new Error(
      "Firebase config tidak ditemukan. Pastikan /assets/firebase-config.js terisi (window.FIREBASE_CONFIG) atau /apps/google-service.json tersedia."
    );
  }
}

export async function ensureFirebase() {
  if (firebaseApp && firebaseAuth) return { app: firebaseApp, auth: firebaseAuth };

  const config = await resolveConfig();
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);

  return { app: firebaseApp, auth: firebaseAuth };
}

export async function getFirebaseAuth() {
  const { auth } = await ensureFirebase();
  return auth;
}

export async function hasEmailOtpLink() {
  const { auth } = await ensureFirebase();
  return isSignInWithEmailLink(auth, window.location.href);
}

/**
 * Kirim tautan login (Firebase Email Link).
 * context dipakai untuk membentuk continue URL yang mengembalikan user ke /apps/login/
 * beserta role + data dokumen.
 */
export async function sendEmailOtp(email, context = {}) {
  const { auth } = await ensureFirebase();
  const baseUrl = getContinueBaseUrl();

  const url = new URL(`${baseUrl}/apps/login/`);
  url.searchParams.set("role", context.role || "CLIENT");
  if (context.docType) url.searchParams.set("docType", context.docType);
  if (context.docNumber) url.searchParams.set("doc", context.docNumber);
  if (context.template) url.searchParams.set("tpl", context.template);

  const actionCodeSettings = {
    url: url.toString(),
    handleCodeInApp: true
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);

  // Simpan untuk auto-complete saat link dibuka (device yang sama)
  localStorage.setItem("lw_last_email", email);
}

/**
 * Selesaikan sign-in dari link email.
 * Catatan: Firebase email-link HARUS memakai link asli dari email.
 */
export async function completeEmailOtpSignIn(email) {
  const { auth } = await ensureFirebase();
  const link = window.location.href;

  if (!isSignInWithEmailLink(auth, link)) {
    throw new Error("Link login tidak valid. Silakan buka tautan asli dari email Anda.");
  }

  return signInWithEmailLink(auth, email, link);
}

export async function signOutFirebase() {
  const { auth } = await ensureFirebase();
  await signOut(auth);
}
