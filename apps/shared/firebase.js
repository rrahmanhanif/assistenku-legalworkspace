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

import { endpoints } from "/shared/http/endpoints.js";
import { request } from "/shared/http/httpClient.js";

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
    let done = false;

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("Auth init timeout"));
    }, timeoutMs);

    const unsub = onAuthStateChanged(
      auth,
      () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          unsub();
        } catch {
          // ignore
        }
        resolve(true);
      },
      (err) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        try {
          unsub();
        } catch {
          // ignore
        }
        reject(err);
      }
    );
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
  const json = await request(endpoints.auth.requestLink, {
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
    url: `${baseUrl}/auth/finish?${params.toString()}`,
    handleCodeInApp: true
  };
}

export function isEmailLinkSignIn() {
  return isSignInWithEmailLink(getFirebaseAuth(), window.location.href);
}

export async function requestEmailLink({
  email,
  role,
  accountType,
  docType,
  docNumber
}) {
  if (!email) throw new Error("Email wajib diisi");

  // 1) cek registry dulu (ke API)
  await validateRegistry({
    email,
    role,
    accountType,
    docType,
    docNumber
  });

  // 2) kirim magic link
  const auth = getFirebaseAuth();
  const actionCodeSettings = buildActionCodeSettings({
    role,
    accountType,
    docType,
    docNumber
  });

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);

  // simpan email untuk penyelesaian sign-in
  try {
    window.localStorage.setItem("emailForSignIn", email);
  } catch {
    // ignore
  }

  return { ok: true };
}

export async function completeEmailLinkSignIn() {
  const auth = getFirebaseAuth();
  const href = window.location.href;

  if (!isSignInWithEmailLink(auth, href)) {
    return { ok: false, reason: "not_email_link" };
  }

  let email = "";
  try {
    email = window.localStorage.getItem("emailForSignIn") || "";
  } catch {
    // ignore
  }

  if (!email) {
    throw new Error("Email tidak ditemukan. Ulangi proses login.");
  }

  await signInWithEmailLink(auth, email, href);

  try {
    window.localStorage.removeItem("emailForSignIn");
  } catch {
    // ignore
  }

  return { ok: true };
}
