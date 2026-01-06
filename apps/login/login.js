import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailOtp
} from "../shared/firebase.js";

const emailInput = document.getElementById("email");
const docNumberInput = document.getElementById("docNumber");
const btnSend = document.getElementById("btnSend");

const docFields = document.getElementById("docFields");
const docNumberLabel = document.getElementById("docNumberLabel");
const docHint = document.getElementById("docHint");

const adminCodeInput = document.getElementById("adminCode");
const adminCodeField = document.getElementById("adminCodeField");

const roleRadios = Array.from(document.querySelectorAll("input[name='role']"));

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

let selectedRole = "CLIENT";
let selectedAccountType = "PERSONAL"; // PERSONAL | PT

function normalizeAccountType(v) {
  const x = String(v || "").toUpperCase();
  return x === "PT" ? "PT" : "PERSONAL";
}

function getDocType(role, accountType) {
  if (role === "CLIENT" && accountType === "PERSONAL") return "IPL";
  if (role === "CLIENT" && accountType === "PT") return "ADDENDUM";
  if (role === "MITRA" && accountType === "PERSONAL") return "SPL";
  if (role === "MITRA" && accountType === "PT") return "QUOTATION";
  return null;
}

function updateDocUi() {
  if (selectedRole === "ADMIN") return;

  const docType = getDocType(selectedRole, selectedAccountType) || "DOKUMEN";
  if (docNumberLabel) docNumberLabel.textContent = `Nomor ${docType}`;

  const placeholderMap = {
    IPL: "Contoh: IPL-2024-001",
    SPL: "Contoh: SPL-2024-001",
    ADDENDUM: "Contoh: ADD-2024-001",
    QUOTATION: "Contoh: QUO-2024-001"
  };

  if (docNumberInput) {
    docNumberInput.placeholder = placeholderMap[docType] || "Masukkan nomor dokumen";
  }

  if (docHint) {
    docHint.textContent = `Masukkan nomor ${docType}. Nomor ini harus sudah diregister oleh Admin.`;
  }
}

function toggleFields() {
  const isAdmin = selectedRole === "ADMIN";

  if (docFields) docFields.style.display = isAdmin ? "none" : "block";
  if (adminCodeField) adminCodeField.style.display = isAdmin ? "block" : "none";

  if (isAdmin) {
    if (docNumberInput) docNumberInput.value = "";
    if (emailInput && !emailInput.value) emailInput.value = ADMIN_EMAIL;
  } else {
    updateDocUi();
  }
}

function setActiveRole(role) {
  selectedRole = role;

  // Sinkronkan radio
  roleRadios.forEach((r) => {
    r.checked = String(r.value).toUpperCase() === role;
  });

  toggleFields();
}

function setAccountType(accountType) {
  selectedAccountType = normalizeAccountType(accountType);
  if (selectedRole !== "ADMIN") updateDocUi();
}

// Event: radio role berubah
roleRadios.forEach((r) => {
  r.addEventListener("change", () => setActiveRole(String(r.value).toUpperCase()));
});

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

function persistAccess({ role, docType, docNumber, accountType }) {
  localStorage.setItem(
    "iplAccess",
    JSON.stringify({
      role,
      documentType: docType || null,
      documentId: docNumber || null,
      accountType: accountType || null,
      at: new Date().toISOString()
    })
  );
}

// INIT dari URL (HARUS jalan selalu, bukan di dalam email-link flow)
function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const role = (params.get("role") || "").toUpperCase();
  const accountType = normalizeAccountType(params.get("accountType"));

  if (role === "ADMIN" || role === "CLIENT" || role === "MITRA") {
    setActiveRole(role);
  } else {
    setActiveRole(selectedRole);
  }

  setAccountType(accountType);

  // Simpan agar konsisten dipakai request API berikutnya
  localStorage.setItem("lw_account_type", selectedAccountType);
  localStorage.setItem("lw_role", selectedRole);
}

initFromUrl();

btnSend?.addEventListener("click", async () => {
  const email = emailInput?.value.trim() || "";
  const docNumber = docNumberInput?.value.trim() || "";
  const adminCode = adminCodeInput?.value.trim() || "";

  if (!email) return alert("Email wajib diisi");

  localStorage.setItem("lw_last_email", email);

  if (selectedRole === "ADMIN") {
    if (email !== ADMIN_EMAIL) return alert(`Email admin wajib ${ADMIN_EMAIL}`);
    if (!adminCode) return alert("Kode admin wajib diisi");
  } else {
    const docType = getDocType(selectedRole, selectedAccountType);
    if (!docType) return alert("Konfigurasi role/accountType tidak valid");
    if (!docNumber) return alert(`Nomor ${docType} wajib diisi`);
  }

  try {
    const docType = selectedRole === "ADMIN" ? null : getDocType(selectedRole, selectedAccountType);

    await sendEmailOtp(email, {
      role: selectedRole,
      docType,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      template: null, // DISABLE template selection sepenuhnya
      adminCode: selectedRole === "ADMIN" ? adminCode : undefined,
      accountType: selectedAccountType
    });

    savePendingSession({
      role: selectedRole,
      docType,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      accountType: selectedAccountType,
      adminCode: selectedRole === "ADMIN" ? adminCode : undefined
    });

    alert("Tautan login dikirim via email. Buka email untuk menyelesaikan login.");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal mengirim tautan masuk");
  }
});

// Email-link completion
(async function autoCompleteFromLink() {
  try {
    const isLink = await hasEmailOtpLink();
    if (!isLink) return;

    const stored = loadPendingSession() || {};
    const email = localStorage.getItem("lw_last_email") || emailInput?.value.trim();
    if (!email) return;

    const role = (stored.role || selectedRole || "CLIENT").toUpperCase();
    const accountType = normalizeAccountType(stored.accountType || localStorage.getItem("lw_account_type"));

    if (role === "ADMIN" && email !== ADMIN_EMAIL) return;

    await completeEmailOtpSignIn(email);

    // Persist access for app guards & api headers
    persistAccess({
      role,
      docType: stored.docType || (role === "ADMIN" ? null : getDocType(role, accountType)),
      docNumber: stored.docNumber || null,
      accountType
    });

    localStorage.setItem("lw_role", role);
    localStorage.setItem("lw_account_type", accountType);

    if (role !== "ADMIN" && stored.docNumber) {
      localStorage.setItem("lw_doc_number", stored.docNumber);
      if (stored.docType) localStorage.setItem("lw_doc_type", stored.docType);
    }

    if (role === "ADMIN" && stored.adminCode) {
      sessionStorage.setItem("lw_admin_code", stored.adminCode);
    }

    if (role === "CLIENT") window.location.href = "/apps/client/";
    else if (role === "MITRA") window.location.href = "/apps/mitra/";
    else if (role === "ADMIN") window.location.href = "/apps/admin/";
  } catch (err) {
    console.error("Auto sign-in gagal", err);
  }

  // ... semua function setActiveRole, toggleDocFields, dll

function initRoleFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const role = (params.get("role") || "").toUpperCase();
  if (role === "ADMIN" || role === "CLIENT" || role === "MITRA") {
    setActiveRole(role);
  } else {
    setActiveRole(selectedRole);
  }
}

initRoleFromUrl(); // PASTI jalan saat page load

btnSend?.addEventListener("click", async () => {
  ...
});

(async function autoCompleteFromLink() {
  ...
})();
