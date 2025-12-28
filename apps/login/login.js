import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailOtp
} from "../shared/firebase.js";

const emailInput = document.getElementById("email");
const docNumberInput = document.getElementById("docNumber");
const btnSend = document.getElementById("btnSend");
const roleButtons = Array.from(document.querySelectorAll(".role-btn"));
const iplSelect = document.getElementById("iplSelect");
const docFields = document.getElementById("docFields");

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

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
  ADMIN: []
};

let selectedRole = "CLIENT";

/* =========================
   UI & ROLE HANDLING
========================= */

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

function toggleDocFields(role) {
  const isAdmin = role === "ADMIN";
  if (docFields) docFields.style.display = isAdmin ? "none" : "block";

  if (isAdmin) {
    if (iplSelect) iplSelect.value = "";
    if (docNumberInput) docNumberInput.value = "";
    if (emailInput && !emailInput.value) {
      emailInput.value = ADMIN_EMAIL;
    }
  }
}

function setActiveRole(role) {
  selectedRole = role;
  roleButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.role === role);
  });
  renderTemplateOptions(role);
  toggleDocFields(role);
}

roleButtons.forEach((btn) => {
  btn.addEventListener("click", () => setActiveRole(btn.dataset.role));
});

/* =========================
   INIT FROM URL PARAM
========================= */

const params = new URLSearchParams(window.location.search);
const defaultRole = params.get("role");
const templateFromLink = params.get("tpl") || "";
const docFromLink = params.get("doc") || "";

if (defaultRole && templateOptions[defaultRole]) {
  setActiveRole(defaultRole);
} else {
  renderTemplateOptions(selectedRole);
  toggleDocFields(selectedRole);
}

if (templateFromLink && iplSelect) {
  iplSelect.value = decodeURIComponent(templateFromLink);
}
if (docFromLink && docNumberInput) {
  docNumberInput.value = decodeURIComponent(docFromLink);
}

/* =========================
   VALIDATION & STORAGE
========================= */

async function validateIplTemplate(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("Dokumen IPL tidak dapat diakses");

  const text = await response.text();
  if (!text || text.trim().length < 20) {
    throw new Error("Konten IPL tidak valid");
  }
  return text.substring(0, 120);
}

function savePendingSession(payload) {
  localStorage.setItem("lw_pending_login", JSON.stringify(payload));
}

function loadPendingSession() {
  try {
    return JSON.parse(localStorage.getItem("lw_pending_login"));
  } catch {
    return null;
  }
}

/**
 * Simpan sesi portal yang dipakai access.js (lw_portal_session).
 * Ini yang akan dibaca requirePortalAccess().
 */
function savePortalSession({ role, docType, templateFile, documentId, preview }) {
  const payload = {
    role,
    docType,
    templateFile: templateFile || null,
    documentId: documentId || null,
    preview: preview || null,
    timestamp: Date.now()
  };
  localStorage.setItem("lw_portal_session", JSON.stringify(payload));

  // Backward-compatibility: kalau ada modul lain yang masih baca iplAccess
  localStorage.setItem(
    "iplAccess",
    JSON.stringify({
      role,
      template: templateFile || null,
      documentId: documentId || null,
      preview: preview || null,
      at: new Date().toISOString()
    })
  );
}

function redirectByRole(role) {
  if (role === "CLIENT") {
    window.location.href = "/apps/client/";
  } else if (role === "MITRA") {
    window.location.href = "/apps/mitra/";
  } else if (role === "ADMIN") {
    window.location.href = "/apps/admin/";
  } else {
    alert("Role tidak dikenali. Hubungi admin.");
  }
}

/* =========================
   SEND MAGIC LINK (EMAIL ONLY)
========================= */

btnSend?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const templatePath = iplSelect?.value; // path penuh
  const docNumber = docNumberInput?.value.trim();

  if (!email) return alert("Email wajib diisi");

  if (selectedRole === "ADMIN" && email !== ADMIN_EMAIL) {
    return alert(`Email admin wajib ${ADMIN_EMAIL}`);
  }

  if (selectedRole !== "ADMIN") {
    if (!templatePath) return alert("Pilih dokumen IPL/SPL terlebih dahulu");
    if (!docNumber) return alert("Nomor IPL/SPL wajib diisi");
  }

  try {
    let preview = null;
    if (selectedRole !== "ADMIN") {
      preview = await validateIplTemplate(templatePath);
    }

    // docType yang Anda pakai sebelumnya
    const docType = selectedRole === "MITRA" ? "SPL" : "IPL";

    await sendEmailOtp(email, {
      role: selectedRole,
      docType,
      docNumber,
      template: templatePath
    });

    // Simpan pending agar saat balik dari email link bisa auto-complete
    savePendingSession({
      role: selectedRole,
      docType,
      template: templatePath,
      docNumber,
      preview
    });

    localStorage.setItem("lw_last_email", email);

    alert("Link login dikirim via Firebase. Cek inbox/spam dan buka tautannya.");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal mengirim link login");
  }
});

/* =========================
   AUTO SIGN-IN VIA EMAIL LINK
========================= */

(async function autoCompleteFromLink() {
  try {
    const isLink = await hasEmailOtpLink();
    if (!isLink) return;

    const stored = loadPendingSession();
    const email = localStorage.getItem("lw_last_email") || emailInput?.value.trim();

    if (!email) {
      alert("Email tidak ditemukan. Isi email yang sama seperti saat meminta link login.");
      return;
    }

    const role = stored?.role || selectedRole;
    if (role === "ADMIN" && email !== ADMIN_EMAIL) {
      alert(`Email admin wajib ${ADMIN_EMAIL}`);
      return;
    }

    // Ini yang menetapkan session Firebase
    await completeEmailOtpSignIn(email);

    const docType = stored?.docType || (role === "MITRA" ? "SPL" : "IPL");
    const templateFile = stored?.template || iplSelect?.value || null;
    const documentId = stored?.docNumber || docNumberInput?.value || null;

    // Simpan sesi agar portal guard tidak menendang balik
    savePortalSession({
      role,
      docType,
      templateFile,
      documentId,
      preview: stored?.preview || null
    });

    redirectByRole(role);
  } catch (err) {
    console.error("Auto sign-in gagal", err);
    alert(err?.message || "Auto sign-in gagal. Silakan kirim link login lagi.");
  }
})();
