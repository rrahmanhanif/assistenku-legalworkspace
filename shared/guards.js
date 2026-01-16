import { loadPortalSession, clearPortalSession } from "/shared/session.js";

function redirectToLogin(role) {
  const params = role ? `?role=${encodeURIComponent(role)}` : "";
  window.location.href = `/apps/login/${params}`;
}

export function requireToken() {
  const session = loadPortalSession();
  if (!session?.idToken) {
    clearPortalSession();
    redirectToLogin();
    return null;
  }
  return session;
}

export function requireRole(role) {
  const session = requireToken();
  if (!session) return null;

  if (session.role !== role) {
    clearPortalSession();
    redirectToLogin(role);
    return null;
  }

  return session;
}
