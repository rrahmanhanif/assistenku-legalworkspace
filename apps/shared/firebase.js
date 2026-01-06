// apps/shared/firebase.js
import {
  initializeApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdToken,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { apiFetch } from "/assets/apiClient.js";

function getFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) {
    throw new Error(
      "FIREBASE_CONFIG belum dimuat. Pastikan /assets/firebase-config.js di-include sebelum module."
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
      resolve(user || null);
    });
  });
}

export async function getFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser || (await waitForAuthReady());
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

export async function sendEmailOtp(
  email,
  { role, docType, docNumber, template, adminCode, accountType }
) {
...
  await validateRegistry({ email, role, docNumber, docType, template, adminCode, accountType });


  const actionCodeSettings = {
    url: `${baseUrl}/apps/login/?role=${encodeURIComponent(
      role
    )}&doc=${encodeURIComponent(docNumber || "")}`,
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
