import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailOtp
} from "../shared/firebase.js";

const emailInput = document.getElementById("email");
const docNumberInput = document.getElementById("docNumber");
const btnSend = document.getElementById("btnSend");
const iplSelect = document.getElementById("iplSelect");
const docFields = document.getElementById("docFields");
const adminCodeInput = document.getElementById("adminCode");
const adminCodeField = document.getElementById("adminCodeField");

const roleRadios = Array.from(document.querySelectorAll('input[name="role"]'));

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
  // default pilih item pertama untuk non-admin
  if (role !== "ADMIN" && iplSelect.options.length > 0) {
    iplSelect.selectedIndex = 0;
  }
}

function toggleDocFields(role) {
  const isAdmin = role === "ADMIN";

  if (docFields) docFields.style.display = isAdmin ? "none" : "block";
  if (adminCodeField) adminCodeField.style.display = isAdmin ? "block" : "none";

  if (isAdmin) {
    if (iplSelect) iplSelect.selectedIndex = -1;
    if (docNumberInput) docNumberInput.value = "";
    if (emailInput && !emailInput.value) emailInput.value = ADMIN_EMAIL;
  } else {
    if (adminCodeInput) adminCodeInput.value = "";
  }
}

function setRole(role) {
  selectedRole = role;
  roleRadios.forEach((r) => (r.checked = r.value === role));
  renderTemplateOptions(role);
  toggleDocFields(role);
}

async function validateIplTemplate(templatePath) {
  if (!templatePath) throw new Error("Template dokumen wajib dipilih");
  const res = await fetch(templatePath, { method: "GET", cache: "no-store" });
  if (!res.ok) throw new Error("Template dokumen tidak ditemukan / tidak bisa diakses");
  const text = await res.text();
  return { path: templatePath, bytes: text.length };
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
  const adminCode = adminCodeInput?.value.trim() || "";

  if (!email) return alert("Email wajib diisi");
  localStorage.setItem("lw_last_email", email);

  if (selectedRole === "ADMIN") {
    if (email !== ADMIN_EMAIL) return alert(`Email admin wajib ${ADMIN_EMAIL}`);
    if (!adminCode) return alert("Kode admin wajib diisi");
  } else {
    if (!templatePath) return alert("Pilih dokumen IPL/SPL terlebih dahulu");
    if (!docNumber) return alert("Nomor IPL/SPL wajib diisi");
  }

  try {
    let preview;
    if (selectedRole !== "ADMIN") {
      preview = await validateIplTemplate(templatePath);
    }

    const docType =
      selectedRole === "MITRA" ? "SPL" : selectedRole === "CLIENT" ? "IPL" : null;

    await sendEmailOtp(email, {
      role: selectedRole,
      docType,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      template: selectedRole === "ADMIN" ? null : templatePath,
      adminCode: selectedRole === "ADMIN" ? adminCode : undefined
    });

    savePendingSession({
      role: selectedRole,
      template: selectedRole === "ADMIN" ? null : templatePath,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      preview,
      adminCode: selectedRole === "ADMIN" ? adminCode : undefined
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
    const email = localStorage.getItem("lw_last_email") || emailInput?.value.trim();
    if (!email) return;

    const role = stored?.role || selectedRole;
    if (role === "ADMIN" && email !== ADMIN_EMAIL) return;

    await completeEmailOtpSignIn(email);

    persistAccess({
      role,
      template: stored?.template || iplSelect?.value || null,
      docNumber: stored?.docNumber || docNumberInput?.value || null,
      preview: stored?.preview
    });

    if (role === "ADMIN" && stored?.adminCode) {
      sessionStorage.setItem("lw_admin_code", stored.adminCode);
    }

    if (role === "CLIENT") window.location.href = "/apps/client/";
    else if (role === "MITRA") window.location.href = "/apps/mitra/";
    else if (role === "ADMIN") window.location.href = "/apps/admin/";
  } catch (err) {
    console.error("Auto sign-in gagal", err);
  }
})();

// INIT: ambil role dari querystring (?role=ADMIN/CLIENT/MITRA) atau radio checked
(function init() {
  const params = new URLSearchParams(window.location.search);
  const qsRole = (params.get("role") || "").toUpperCase();
  const valid = ["ADMIN", "CLIENT", "MITRA"];

  const initial =
    valid.includes(qsRole)
      ? qsRole
      : (roleRadios.find((r) => r.checked)?.value || "CLIENT");

  roleRadios.forEach((r) => {
    r.addEventListener("change", () => {
      if (r.checked) setRole(r.value);
    });
  });

  setRole(initial);

  // Simpan tipe akun dari landing page jika ada (opsional)
  const accountType = (params.get("accountType") || "").toUpperCase();
  if (accountType) localStorage.setItem("lw_account_type", accountType);
})();
