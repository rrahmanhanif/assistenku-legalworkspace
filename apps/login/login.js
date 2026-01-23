import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailLink
} from "../shared/firebase.js";
import { endpoints } from "/shared/http/endpoints.js";
import { request } from "/shared/http/httpClient.js";
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
  if (upper === "PERSONAL" || upper === "BUSINESS" || upper === "LEGAL") return upper;
  return "PERSONAL";
}

function getDefaultDocType(role, accountType) {
  if (role === "MITRA") return "SPL";
  if (role === "CLIENT") return accountType === "LEGAL" ? "IPL" : "IPL";
  return "";
}

function setSelectedRole(role) {
  selectedRole = ROLE_OPTIONS.includes(role) ? role : "ADMIN";

  // Toggle field admin vs doc
  if (selectedRole === "ADMIN") {
    if (adminCodeField) adminCodeField.style.display = "";
    if (docFields) docFields.style.display = "none";
  } else {
    if (adminCodeField) adminCodeField.style.display = "none";
    if (docFields) docFields.style.display = "";
  }

  // Update doc label/hint
  const accountType = normalizeAccountType(accountTypeSelect?.value || selectedAccountType);
  const defaultDocType = getDefaultDocType(selectedRole, accountType);

  if (!docTypeTouched && docTypeSelect && defaultDocType) {
    docTypeSelect.value = defaultDocType;
  }

  if (docNumberLabel) {
    docNumberLabel.textContent =
      selectedRole === "MITRA" ? "Nomor SPL" : selectedRole === "CLIENT" ? "Nomor IPL" : "Nomor Dokumen";
  }

  if (docHint) {
    docHint.textContent =
      selectedRole === "MITRA"
        ? "Masukkan nomor SPL yang terdaftar."
        : selectedRole === "CLIENT"
        ? "Masukkan nomor IPL yang terdaftar."
        : "";
  }
}

function savePendingSession(session) {
  // Simpan “pending” agar callback email-link tahu konteks login.
  // Memakai savePortalSession agar konsisten dengan sistem portal session Anda.
  savePortalSession({
    ...session,
    status: "PENDING_EMAIL_LINK",
    createdAt: new Date().toISOString()
  });
}

async function handleCompleteFromEmailLink() {
  if (!hasEmailOtpLink()) return;

  try {
    // Firebase will validate the link and sign-in.
    const result = await completeEmailOtpSignIn();

    // Setelah sign-in, biasanya token disimpan oleh modul session Anda (atau modul lain).
    // Di sini minimal redirect ke portal (sesuaikan jika Anda punya routing berbeda).
    const role = result?.role || selectedRole || "ADMIN";

    if (role === "ADMIN") window.location.href = "/apps/admin/";
    else if (role === "CLIENT") window.location.href = "/apps/client/";
    else if (role === "MITRA") window.location.href = "/apps/mitra/";
    else window.location.href = "/apps/login/";
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal menyelesaikan login dari link email.");
  }
}

// Bind role radios
roleRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    setSelectedRole(radio.value);
  });
});

// Track docType touched
docTypeSelect?.addEventListener("change", () => {
  docTypeTouched = true;
});

// Track accountType change
accountTypeSelect?.addEventListener("change", () => {
  selectedAccountType = normalizeAccountType(accountTypeSelect.value);
  if (!docTypeTouched && docTypeSelect) {
    docTypeSelect.value = getDefaultDocType(selectedRole, selectedAccountType) || docTypeSelect.value;
  }
});

// Initial UI
setSelectedRole(selectedRole);

// Main action
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
    const gate = await request(endpoints.auth.requestLink, {
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

    alert("Link login dikirim ke email. Silakan cek inbox/spam.");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal meminta link login.");
  }
});

// Auto-complete if opened from email link
handleCompleteFromEmailLink();
