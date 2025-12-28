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
    // FIX: regex harus /\/+$/ (bukan /\/+$,)
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

  window.FIREBASE_CONFIG = config;
  return config;
}

async function resolveConfig() {
  const cfg = window?.FIREBASE_CONFIG || window?.firebaseConfig;
  if (cfg?.apiKey) return cfg;

  if (!configPromise) configPromise = loadConfigFromGoogleService();

  try {
    return await configPromise;
  } catch (err) {
    console.warn("Gagal memuat google-service.json", err);
    throw new Error(
      "Firebase config tidak ditemukan. Pastikan assets/firebase-config.js terisi atau google-service.json tersedia."
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

  const isLocalhost = window?.location?.hostname === "localhost";
  if (isLocalhost) {
    console.debug("[Firebase] continue URL", actionCodeSettings.url);
  }

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem("lw_last_email", email);
}

export async function completeEmailOtpSignIn(email, otpCode) {
  const { auth } = await ensureFirebase();
  const currentLink = window.location.href;

  // Primary path: user opens email link
  if (isSignInWithEmailLink(auth, currentLink)) {
    return signInWithEmailLink(auth, email, currentLink);
  }

  // Optional fallback path: allow user to paste oobCode manually (advanced/debug)
  // Note: Firebase Email Link biasanya tidak memberi OTP 6 digit; ini hanya fallback teknis.
  if (otpCode) {
    const url = new URL(`${getContinueBaseUrl()}/apps/login/`);
    url.searchParams.set("oobCode", otpCode);
    url.searchParams.set("mode", "signIn");
    url.searchParams.set("apiKey", auth.app.options.apiKey);

    const linkToUse = url.toString();
    if (!isSignInWithEmailLink(auth, linkToUse)) {
      throw new Error("Kode OTP tidak valid. Gunakan tautan dari email untuk verifikasi.");
    }
    return signInWithEmailLink(auth, email, linkToUse);
  }

  throw new Error("Link OTP tidak ditemukan. Buka tautan dari email untuk verifikasi.");
}

export async function signOutFirebase() {
  const { auth } = await ensureFirebase();
  await signOut(auth);
}

export async function getFirebaseAuth() {
  const { auth } = await ensureFirebase();
  return auth;
}

export async function hasEmailOtpLink() {
  const { auth } = await ensureFirebase();
  return isSignInWithEmailLink(auth, window.location.href);
}
