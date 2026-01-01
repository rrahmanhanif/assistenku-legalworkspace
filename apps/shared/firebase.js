// apps/shared/firebase.js
// Firebase client helper (ESM, tanpa bundler)
// Catatan: Pastikan /assets/firebase-config.js mem-define window.FIREBASE_CONFIG

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  getIdToken
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let _app = null;
let _auth = null;

export function getFirebaseApp() {
  if (_app) return _app;

  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey || !cfg.authDomain || !cfg.projectId) {
    throw new Error(
      "Firebase config tidak ditemukan. Pastikan /assets/firebase-config.js tersedia dan mengisi window.FIREBASE_CONFIG."
    );
  }

  // Hindari double-init jika hot reload / multi-entry
  _app = getApps().length ? getApps()[0] : initializeApp(cfg);
  return _app;
}

export function getFirebaseAuth() {
  if (_auth) return _auth;
  const app = getFirebaseApp();
  _auth = getAuth(app);
  return _auth;
}

function waitForUser() {
  const auth = getFirebaseAuth();
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}

export async function getFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser || (await waitForUser());
  if (!user) return null;
  return await getIdToken(user, forceRefresh);
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
  const res = await fetch("/api/auth/request-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // ignore parse error
  }

  if (!res.ok || !json?.allowed) {
    const msg = json?.message || "Registry tidak valid";
    throw new Error(msg);
  }
  return json;
}

export async function sendEmailOtp(
  email,
  { role, docType, docNumber, template, adminCode }
) {
  const auth = getFirebaseAuth();
  const baseUrl = window.LEGALWORKSPACE_BASE_URL || window.location.origin;

  await validateRegistry({ email, role, docNumber, docType, template, adminCode });

  const actionCodeSettings = {
    url: `${baseUrl}/apps/login/?role=${encodeURIComponent(role)}&doc=${encodeURIComponent(
      docNumber || ""
    )}`,
    handleCodeInApp: true
  };

  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem("lw_last_email", email);
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
