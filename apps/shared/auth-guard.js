import { getFirebaseAuth, signOutFirebase } from "./firebase.js";
import { getPortalSession, clearPortalSession } from "./access.js";

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

function redirectToLogin(role) {
  const params = role ? `?role=${encodeURIComponent(role)}` : "";
  window.location.href = `/apps/login/${params}`;
}

export async function requireRole(expectedRole) {
  // 1) Pastikan user sudah login via Firebase
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    redirectToLogin(expectedRole);
    return;
  }

  // 2) Gate khusus ADMIN (email harus sesuai)
  if (expectedRole === "ADMIN" && user.email !== ADMIN_EMAIL) {
    alert("Akun admin wajib menggunakan email resmi.");
    clearPortalSession();
    await signOutFirebase();
    redirectToLogin("ADMIN");
    return;
  }

  // 3) Pastikan sesi portal ada dan sesuai role + verifikasi dokumen
  const session = getPortalSession();
  const sameRole = session?.role === expectedRole;

  // ADMIN tidak wajib dokumen
  const hasDocType = expectedRole === "ADMIN" || !!session?.docType;
  const hasTemplate = expectedRole === "ADMIN" || (typeof session?.templateFile === "string" && session.templateFile.length > 0);
  const hasDocNumber = expectedRole === "ADMIN" || (typeof session?.documentId === "string" && session.documentId.length > 0);

  if (!sameRole || !hasDocType || !hasTemplate || !hasDocNumber) {
    alert("Verifikasi IPL/SPL digital diperlukan ulang.");
    clearPortalSession();
    await signOutFirebase();
    redirectToLogin(expectedRole);
    return;
  }
}
