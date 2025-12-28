// apps/shared/firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  getIdToken
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

function getFirebaseConfig() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) {
    throw new Error("FIREBASE_CONFIG belum dimuat. Pastikan /assets/firebase-config.js di-include sebelum module.");
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
      unsub?.();
      reject(new Error("Timeout menunggu Firebase Auth state"));
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
