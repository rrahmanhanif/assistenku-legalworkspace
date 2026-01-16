const SESSION_KEY = "lw_portal_session";

export function savePortalSession({
  role,
  email,
  idToken,
  docType,
  docNumber,
  accountType,
  adminCode
}) {
  const payload = {
    role,
    email,
    idToken,
    docType: docType || null,
    docNumber: docNumber || null,
    accountType: accountType || null,
    adminCode: adminCode || null,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  return payload;
}

export function loadPortalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPortalSession() {
  localStorage.removeItem(SESSION_KEY);
}
