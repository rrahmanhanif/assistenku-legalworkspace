import { supabase } from "./supabase.js";

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
  // 1) Pastikan user sudah login (Supabase session ada)
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) {
    redirectToLogin(expectedRole);
    return;
  }

  // 2) Pastikan role sesuai (server-side source of truth: tabel profiles)
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, ipl_template")
    .eq("id", userData.user.id)
    .single();

  if (profileErr || !profile || profile.role !== expectedRole) {
    alert("Akses ditolak: role tidak sesuai");
    await supabase.auth.signOut();
    redirectToLogin(expectedRole);
    return;
  }

  // 3) Pastikan local IPL access ada (verifikasi pilihan dokumen IPL)
  const iplAccess = getIplAccess();
  const sameRole = iplAccess?.role === expectedRole;
  const hasTemplate = typeof iplAccess?.template === "string" && iplAccess.template.length > 0;

  if (!sameRole || !hasTemplate) {
    alert("Verifikasi IPL digital diperlukan ulang.");
    await supabase.auth.signOut();
    redirectToLogin(expectedRole);
  }
}
