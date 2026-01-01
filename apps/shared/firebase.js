import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  isSignInWithEmailLink,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

function getFirebaseConfig() {
  if (typeof window === "undefined" || !window.FIREBASE_CONFIG) {
    throw new Error("FIREBASE_CONFIG belum tersedia. Pastikan /assets/firebase-config.js ter-load.");
  }
  return window.FIREBASE_CONFIG;
}

export function getFirebaseApp() {
  if (!getApps().length) {
    return initializeApp(getFirebaseConfig());
  }
  return getApp();
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export async function getFirebaseIdToken(forceRefresh = false) {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(forceRefresh);
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
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || !json.allowed) {
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
    handleCodeInApp: true,
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
