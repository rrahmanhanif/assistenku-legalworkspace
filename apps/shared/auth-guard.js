import { getFirebaseAuth, signOutFirebase } from "./firebase.js";

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

function redirectToLogin(role) {
  const params = role ? `?role=${encodeURIComponent(role)}` : "";
  window.location.href = `/apps/login/${params}`;
}

function getIplAccess() {
  try {
    return JSON.parse(localStorage.getItem("iplAccess") || "{}");
  } catch (err) {
    console.error("Tidak dapat membaca IPL access", err);
    return {};
  }
}

export async function requireRole(expectedRole) {
  // 1) Pastikan user sudah login via Firebase
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    redirectToLogin(expectedRole);
    return;
  }

  // 2) Validasi khusus ADMIN
  if (expectedRole === "ADMIN" && user.email !== ADMIN_EMAIL) {
    alert("Akun admin wajib menggunakan email resmi.");
    await signOutFirebase();
    redirectToLogin("ADMIN");
    return;
  }

  // 3) Validasi akses dokumen dari localStorage
  const iplAccess = getIplAccess();
  const sameRole = iplAccess?.role === expectedRole;

  const hasTemplate =
    expectedRole === "ADMIN" ||
    (typeof iplAccess?.template === "string" && iplAccess.template.length > 0);

  const hasDocNumber =
    expectedRole === "ADMIN" ||
    (typeof iplAccess?.documentId === "string" && iplAccess.documentId.length > 0);

  if (!sameRole || !hasTemplate || !hasDocNumber) {
    alert("Verifikasi IPL / SPL digital diperlukan ulang.");
    await signOutFirebase();
    redirectToLogin(expectedRole);
  }
}
