import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailLink
} from "../shared/firebase.js";
import { apiFetch } from "/shared/apiClient.js";
import { savePortalSession } from "/shared/session.js";

const emailInput = document.getElementById("email");
const docNumberInput = document.getElementById("docNumber");
const docTypeSelect = document.getElementById("docType");
const accountTypeSelect = document.getElementById("accountType");
const btnSend = document.getElementById("btnSend");

const docFields = document.getElementById("docFields");
const docNumberLabel = document.getElementById("docNumberLabel");
const docHint = document.getElementById("docHint");

const adminCodeInput = document.getElementById("adminCode");
const adminCodeField = document.getElementById("adminCodeField");

const roleRadios = Array.from(document.querySelectorAll("input[name='role']"));

let selectedRole = "ADMIN";
let selectedAccountType = "PERSONAL";
let docTypeTouched = false;

const ROLE_OPTIONS = ["ADMIN", "CLIENT", "MITRA"];

function normalizeAccountType(value) {
  const upper = String(value || "").toUpperCase();
  return upper === "PT" ? "PT" : "PERSONAL";
}

function getDefaultDocType(role, accountType) {
  if (role === "CLIENT" && accountType === "PERSONAL") return "IPL";
  if (role === "CLIENT" && accountType === "PT") return "ADDENDUM";
  if (role === "MITRA" && accountType === "PERSONAL") return "SPL";
  if (role === "MITRA" && accountType === "PT") return "QUOTATION";
  return "IPL";
}

function updateDocUi() {
  if (selectedRole === "ADMIN") return;

  const docType = docTypeSelect?.value || getDefaultDocType(selectedRole, selectedAccountType);
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
  } else {
    updateDocUi();
  }
}

function syncDocTypeDefault() {
  if (!docTypeSelect) return;
  const defaultType = getDefaultDocType(selectedRole, selectedAccountType);
  if (!docTypeTouched || !docTypeSelect.value) {
    docTypeSelect.value = defaultType;
  }
}

function setActiveRole(role) {
  selectedRole = role;
  docTypeTouched = false;

  roleRadios.forEach((radio) => {
    radio.checked = String(radio.value).toUpperCase() === role;
  });

  toggleFields();
  syncDocTypeDefault();
}

function setAccountType(accountType) {
  selectedAccountType = normalizeAccountType(accountType);
  if (accountTypeSelect) accountTypeSelect.value = selectedAccountType;
  if (!docTypeTouched) syncDocTypeDefault();
  updateDocUi();
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

function initFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const role = (params.get("role") || "").toUpperCase();
  const accountType = normalizeAccountType(params.get("accountType"));
  const docType = (params.get("docType") || "").toUpperCase();
  const docNumber = params.get("docNumber") || "";

  if (ROLE_OPTIONS.includes(role)) {
    setActiveRole(role);
  } else {
    setActiveRole(selectedRole);
  }

  if (accountTypeSelect && accountType) {
    setAccountType(accountType);
  } else {
    setAccountType(selectedAccountType);
  }

  if (docTypeSelect && docType) {
    docTypeSelect.value = docType;
    docTypeTouched = true;
  }

  if (docNumberInput && docNumber) {
    docNumberInput.value = docNumber;
  }

  updateDocUi();
}

roleRadios.forEach((radio) => {
  radio.addEventListener("change", () => setActiveRole(String(radio.value).toUpperCase()));
});

accountTypeSelect?.addEventListener("change", (event) => {
  setAccountType(event.target.value);
});

docTypeSelect?.addEventListener("change", () => {
  docTypeTouched = true;
  updateDocUi();
});

initFromUrl();

btnSend?.addEventListener("click", async () => {
  const email = emailInput?.value.trim() || "";
  const docNumber = docNumberInput?.value.trim() || "";
  const adminCode = adminCodeInput?.value.trim() || "";
  const accountType = normalizeAccountType(accountTypeSelect?.value || selectedAccountType);
  const docType = docTypeSelect?.value || getDefaultDocType(selectedRole, accountType);

  if (!email) return alert("Email wajib diisi");

  if (selectedRole === "ADMIN") {
    if (!adminCode) return alert("Kode admin wajib diisi");
  } else {
    if (!docType) return alert("Jenis dokumen wajib dipilih");
    if (!docNumber) return alert("Nomor dokumen wajib diisi");
  }

  const payload = {
    role: selectedRole,
    email,
    accountType: selectedRole === "ADMIN" ? undefined : accountType,
    docType: selectedRole === "ADMIN" ? undefined : docType,
    docNumber: selectedRole === "ADMIN" ? undefined : docNumber,
    adminCode: selectedRole === "ADMIN" ? adminCode : undefined
  };

  try {
    const gate = await apiFetch("/api/auth/request-link", {
      method: "POST",
      body: payload,
      headers: selectedRole === "ADMIN" ? { "x-admin-code": adminCode } : undefined
    });

    if (!gate?.allowed) {
      return alert(gate?.message || "Registry tidak cocok untuk login ini.");
    }

    await sendEmailLink(email, {
      role: selectedRole,
      accountType: selectedRole === "ADMIN" ? undefined : accountType,
      docType: selectedRole === "ADMIN" ? undefined : docType,
      docNumber: selectedRole === "ADMIN" ? undefined : docNumber
    });

    savePendingSession({
      role: selectedRole,
      email,
      accountType,
      docType,
      docNumber: selectedRole === "ADMIN" ? null : docNumber,
      adminCode: selectedRole === "ADMIN" ? adminCode : null
    });

    localStorage.setItem("lw_last_email", email);

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

    const stored = loadPendingSession() || {};
    let email = stored.email || localStorage.getItem("lw_last_email") || emailInput?.value.trim();

    if (!email) {
      email = window.prompt("Masukkan email untuk menyelesaikan login:") || "";
    }

    if (!email) return;

    const role = (stored.role || selectedRole || "CLIENT").toUpperCase();
    const accountType = normalizeAccountType(stored.accountType || accountTypeSelect?.value);
    const docType = stored.docType || docTypeSelect?.value || getDefaultDocType(role, accountType);
    const docNumber = stored.docNumber || docNumberInput?.value || null;

    const idToken = await completeEmailOtpSignIn(email);

    savePortalSession({
      role,
      email,
      idToken,
      docType: role === "ADMIN" ? null : docType,
      docNumber: role === "ADMIN" ? null : docNumber,
      accountType: role === "ADMIN" ? null : accountType,
      adminCode: role === "ADMIN" ? stored.adminCode || adminCodeInput?.value || null : null
    });

    if (role === "CLIENT") window.location.href = "/apps/client/";
    if (role === "MITRA") window.location.href = "/apps/mitra/";
    if (role === "ADMIN") window.location.href = "/apps/admin/";
  } catch (err) {
    console.error("Auto sign-in gagal", err);
  }
})();
