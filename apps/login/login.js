import { supabase } from "../shared/supabase.js";

const emailInput = document.getElementById("email");
const otpInput = document.getElementById("otp");
const btnSend = document.getElementById("btnSend");
const btnVerify = document.getElementById("btnVerify");
const roleButtons = Array.from(document.querySelectorAll(".role-btn"));
const iplSelect = document.getElementById("iplSelect");

const templateOptions = {
  CLIENT: [
    { value: "/documents/templates/01-ipl.html", label: "IPL Utama (01-ipl.html)" },
    { value: "/documents/templates/02-addendum-ipl-pt.html", label: "Addendum IPL PT" },
    { value: "/documents/templates/03-spl.html", label: "SPL Turunan" }
  ],
  MITRA: [
    { value: "/documents/templates/04-perjanjian-mitra.html", label: "Perjanjian Mitra" },
    { value: "/documents/templates/06-lembar-kinerja.html", label: "Lembar Kinerja Mitra" }
  ],
  ADMIN: [
    { value: "/documents/templates/01-ipl.html", label: "IPL Master" },
    { value: "/documents/templates/alur-sistem-assistenku.html", label: "Alur Sistem (Kontrol)" }
  ]
};

let selectedRole = "CLIENT";

function renderTemplateOptions(role) {
  if (!iplSelect) return;
  iplSelect.innerHTML = "";
  (templateOptions[role] || []).forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    iplSelect.appendChild(option);
  });
}

function setActiveRole(role) {
  selectedRole = role;
  roleButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });
  renderTemplateOptions(role);
}

roleButtons.forEach((btn) => {
  btn.addEventListener("click", () => setActiveRole(btn.dataset.role));
});

// Default role dari query param (?role=CLIENT|MITRA|ADMIN)
const params = new URLSearchParams(window.location.search);
const defaultRole = params.get("role");
if (defaultRole && templateOptions[defaultRole]) {
  setActiveRole(defaultRole);
} else {
  renderTemplateOptions(selectedRole);
}

async function validateIplTemplate(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("Dokumen IPL tidak dapat diakses");

  const text = await response.text();
  if (!text || text.trim().length < 20) throw new Error("Konten IPL tidak valid");

  return text.substring(0, 120);
}

btnSend?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const templatePath = iplSelect?.value;

  if (!email) return alert("Email wajib diisi");
  if (!templatePath) return alert("Pilih dokumen IPL terlebih dahulu");

  try {
    await validateIplTemplate(templatePath);
  } catch (err) {
    alert(err?.message || "Gagal memvalidasi dokumen IPL");
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { role: selectedRole, ipl_template: templatePath }
    }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("OTP dikirim ke email. Cek inbox/spam. IPL digital direkam untuk verifikasi.");
  }
});

btnVerify?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const token = otpInput?.value.trim();
  const templatePath = iplSelect?.value;

  if (!email || !token) return alert("Email dan OTP wajib diisi");
  if (!templatePath) return alert("Pilih dokumen IPL terlebih dahulu");

  try {
    const preview = await validateIplTemplate(templatePath);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email"
    });
    if (error) throw error;

    const user = data?.user;
    if (!user) throw new Error("User tidak ditemukan");

    // Simpan/selaraskan profil user di tabel profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, role: selectedRole, ipl_template: templatePath },
        { onConflict: "id" }
      )
      .select("role, ipl_template")
      .single();

    if (profileError) throw profileError;

    if (!profile || profile.role !== selectedRole) {
      throw new Error("Role tidak sesuai dengan pilihan portal");
    }

    // Simpan akses lokal agar portal dapat melakukan guard (requirePortalAccess)
    localStorage.setItem(
      "iplAccess",
      JSON.stringify({
        role: selectedRole,
        template: templatePath,
        preview,
        at: new Date().toISOString()
      })
    );

    // Redirect sesuai role
    if (selectedRole === "CLIENT") {
      window.location.href = "/apps/client/";
    } else if (selectedRole === "MITRA") {
      window.location.href = "/apps/mitra/";
    } else if (selectedRole === "ADMIN") {
      window.location.href = "/apps/admin/";
    } else {
      alert("Role tidak dikenali. Hubungi admin.");
    }
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal verifikasi OTP");
  }
});
