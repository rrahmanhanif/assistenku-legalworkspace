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

  if (docFields) {
    docFields.style.display = isAdmin ? "none" : "block";
  }

  if (isAdmin) {
    // Bersihkan doc/template jika admin
    if (iplSelect) iplSelect.selectedIndex = -1;
    if (docNumberInput) docNumberInput.value = "";

    // Auto isi email admin jika kosong
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

const params = new URLSearchParams(window.location.search);
const defaultRole = params.get("role");
const docFromLink = params.get("doc") || "";
const templateFromLink = params.get("tpl") || "";

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

async function validateIplTemplate(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error("Dokumen IPL/SPL tidak dapat diakses");

  const text = await response.text();
  if (!text || text.trim().length < 20) throw new Error("Konten dokumen tidak valid");

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

function persistAccess({ role, template, docNumber, preview }) {
  localStorage.setItem(
    "iplAccess",
    JSON.stringify({
      role,
      template: template || null,
      documentId: docNumber || null,
      preview: preview || null,
      at: new Date().toISOString()
    })
  );
}

btnSend?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const templatePath = iplSelect?.value || "";
  const docNumber = docNumberInput?.value.trim() || "";

  if (!email) return alert("Email wajib diisi");

  // Simpan untuk auto-complete saat email-link dibuka (penting untuk device yang sama)
  localStorage.setItem("lw_last_email", email);

  if (selectedRole === "ADMIN") {
    if (email !== ADMIN_EMAIL) return alert(`Email admin wajib ${ADMIN_EMAIL}`);
  } else {
    if (!templatePath) return alert("Pilih dokumen IPL/SPL terlebih dahulu");
    if (!docNumber) return alert("Nomor IPL/SPL wajib diisi");
  }

  try {
    let preview;
    if (selectedRole !== "ADMIN") {
      preview = await validateIplTemplate(templatePath);
    }

    // ADMIN: docType/docNumber/template tidak wajib
    const docType =
      selectedRole === "MITRA" ? "SPL" : selectedRole === "CLIENT" ? "IPL" : null;

    await sendEmailOtp(email, {
      role: selectedRole,
      docType,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      template: selectedRole === "ADMIN" ? null : templatePath
    });

    savePendingSession({
      role: selectedRole,
      template: selectedRole === "ADMIN" ? null : templatePath,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      preview
    });

    alert("Tautan login dikirim via email. Buka email untuk menyelesaikan login.");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal mengirim tautan masuk");
  }
});

(async function autoCompleteFromLink() {
  try {
    const isLink = await hasEmailOtpLink();
    if (!isLink) return;

    const stored = loadPendingSession();
    const email =
      localStorage.getItem("lw_last_email") ||
      emailInput?.value.trim();

    if (!email) {
      // Tidak bisa menyelesaikan sign-in tanpa email (Firebase email-link butuh email yang sama)
      // Di UX yang lebih matang: Anda akan minta user mengetik email lagi.
      return;
    }

    const role = stored?.role || selectedRole;
    if (role === "ADMIN" && email !== ADMIN_EMAIL) return;

    await completeEmailOtpSignIn(email);

    persistAccess({
      role,
      template: stored?.template || iplSelect?.value || null,
      docNumber: stored?.docNumber || docNumberInput?.value || null,
      preview: stored?.preview
    });

    if (role === "CLIENT") window.location.href = "/apps/client/";
    else if (role === "MITRA") window.location.href = "/apps/mitra/";
    else if (role === "ADMIN") window.location.href = "/apps/admin/";
  } catch (err) {
    console.error("Auto sign-in gagal", err);
  }
})();
