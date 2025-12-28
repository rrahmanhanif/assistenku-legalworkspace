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

  if (!configPromise) {
    configPromise = loadConfigFromGoogleService();
  }

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

  const actionCodeSettings = {
    url:
      `${window.location.origin}/apps/login/` +
      `?role=${encodeURIComponent(context.role || "CLIENT")}` +
      `${context.docType ? `&docType=${encodeURIComponent(context.docType)}` : ""}` +
      `${context.docNumber ? `&doc=${encodeURIComponent(context.docNumber)}` : ""}` +
      `${context.template ? `&tpl=${encodeURIComponent(context.template)}` : ""}`,
    handleCodeInApp: true
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem("lw_last_email", email);
}

export async function completeEmailOtpSignIn(email, otpCode) {
  const { auth } = await ensureFirebase();
  const currentLink = window.location.href;

  let linkToUse = currentLink;

  if (!isSignInWithEmailLink(auth, currentLink) && otpCode) {
    const url = new URL(window.location.origin + "/apps/login/");
    url.searchParams.set("oobCode", otpCode);
    url.searchParams.set("mode", "signIn");
    url.searchParams.set("apiKey", auth.config.apiKey);
    linkToUse = url.toString();
  }

  if (!isSignInWithEmailLink(auth, linkToUse)) {
    throw new Error("Link OTP tidak valid. Gunakan tautan dari email atau tempel kode OTP yang benar.");
  }

  return signInWithEmailLink(auth, email, linkToUse);
}

export async function signOutFirebase() {
  const { auth } = await ensureFirebase();
  await signOut(auth);
}

export function getFirebaseAuth() {
  // SENGAJA sync agar kompatibel dengan guard (auth.currentUser)
  // Firebase Auth akan ter-initialize oleh import firebase-app/auth di index.html
  if (!firebaseAuth) {
    const cfg = window?.FIREBASE_CONFIG || window?.firebaseConfig;
    if (!cfg?.apiKey) {
      // fallback: init async via ensureFirebase bila config belum siap
      // tetapi tetap kembalikan auth setelah init selesai melalui ensureFirebase() di caller lain
      throw new Error("Firebase belum siap. Pastikan firebase-config.js sudah termuat.");
    }
    firebaseApp = getApps().length ? getApps()[0] : initializeApp(cfg);
    firebaseAuth = getAuth(firebaseApp);
  }
  return firebaseAuth;
}

export function hasEmailOtpLink() {
  // sync check; login page sudah load firebase libs + config
  const auth = getFirebaseAuth();
  return isSignInWithEmailLink(auth, window.location.href);
}
