// api/_lib/firebase-admin.js
import admin from "firebase-admin";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function init() {
  if (admin.apps.length) return admin;

  const projectId = requireEnv("FIREBASE_PROJECT_ID");
  const clientEmail = requireEnv("FIREBASE_CLIENT_EMAIL");
  let privateKey = requireEnv("FIREBASE_PRIVATE_KEY");

  // Vercel env sering menyimpan \n literal
  privateKey = privateKey.replace(/\\n/g, "\n");

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  return admin;
}

export async function verifyIdToken(idToken) {
  const a = init();
  return await a.auth().verifyIdToken(idToken);
}
