// apps/shared/firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdToken,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { apiFetch } from "/shared/apiClient.js";

function getFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) {
    throw new Error(
      "FIREBASE_CONFIG belum dimuat. Pastikan /config.js di-include sebelum module."
    );
  }
  return cfg;
}

export function getFirebaseApp() {
  if (!getApps().length) {
    initializeApp(getFirebaseConfig());
  }
  return getApps()[0];
}

export function getFirebaseAuth() {
  getFirebaseApp();
  return getAuth();
}

export function waitForAuthReady(timeoutMs = 15000) {
  const auth = getFirebaseAuth();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout menunggu Firebase Auth"));
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

export async function getFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await getIdToken(user, forceRefresh);
  } catch {
    return null;
  }
}

export async function signOutFirebase() {
  const auth = getFirebaseAuth();
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
}

async function validateRegistry(payload) {
  const json = await apiFetch("/api/auth/request-link", {
    method: "POST",
    body: payload
  });

  if (!json?.allowed) {
    const msg = json?.message || "Registry tidak valid";
    throw new Error(msg);
  }

  return json;
}

function buildActionCodeSettings({ role, accountType, docType, docNumber }) {
  const baseUrl =
    window.LEGALWORKSPACE_BASE_URL ||
    window.location.origin ||
    "https://legalworkspace.assistenku.com";

  const params = new URLSearchParams();
  if (role) params.set("role", role);
  if (accountType) params.set("accountType", accountType);
  if (docType) params.set("docType", docType);
  if (docNumber) params.set("docNumber", docNumber);

  return {
    url: `${baseUrl}/apps/login/?${params.toString()}`,
    handleCodeInApp: true
  };
}

export async function sendEmailLink(email, { role, accountType, docType, docNumber }) {
  const auth = getFirebaseAuth();

  if (!email) throw new Error("Email wajib diisi");
  if (!role) throw new Error("Role wajib diisi");

  const actionCodeSettings = buildActionCodeSettings({
    role,
    accountType,
    docType,
    docNumber
  });

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem("lw_last_email", email);
}

export async function sendEmailOtp(
  email,
  { role, docType, docNumber, template, adminCode, accountType }
) {
  await validateRegistry({ email, role, docNumber, docType, template, adminCode, accountType });
  await sendEmailLink(email, { role, accountType, docType, docNumber });
}

export async function hasEmailOtpLink() {
  const auth = getFirebaseAuth();
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeEmailOtpSignIn(email) {
  const auth = getFirebaseAuth();

  if (!(await hasEmailOtpLink())) return null;

  await signInWithEmailLink(auth, email, window.location.href);
  localStorage.removeItem("lw_pending_login");

  return await getFirebaseIdToken(true);
}
