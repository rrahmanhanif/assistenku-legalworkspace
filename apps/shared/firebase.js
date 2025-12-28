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

function resolveConfig() {
  const cfg = window?.FIREBASE_CONFIG || window?.firebaseConfig;
  if (!cfg || !cfg.apiKey) {
    throw new Error("Firebase config tidak ditemukan. Pastikan assets/firebase-config.js sudah diisi.");
  }
  return cfg;
}

export function ensureFirebase() {
  if (firebaseApp && firebaseAuth) return { app: firebaseApp, auth: firebaseAuth };

  const config = resolveConfig();
  firebaseApp = getApps().length ? getApps()[0] : initializeApp(config);
  firebaseAuth = getAuth(firebaseApp);
  return { app: firebaseApp, auth: firebaseAuth };
}

export async function sendEmailOtp(email, context = {}) {
  const { auth } = ensureFirebase();

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
  const { auth } = ensureFirebase();
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
    throw new Error("Link OTP tidak valid. Gunakan tautan dari email atau kode OTP yang benar.");
  }

  return signInWithEmailLink(auth, email, linkToUse);
}

export async function signOutFirebase() {
  const { auth } = ensureFirebase();
  await signOut(auth);
}

export function getFirebaseAuth() {
  const { auth } = ensureFirebase();
  return auth;
}

export function hasEmailOtpLink() {
  const { auth } = ensureFirebase();
  return isSignInWithEmailLink(auth, window.location.href);
}
