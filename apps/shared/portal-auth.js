import {
  bindTemplateOptions,
  downloadTemplateFile,
  fetchProfileRole,
  requiredDocType,
  savePortalSession
} from "./access.js";

import {
  completeEmailOtpSignIn,
  sendEmailOtp,
  hasEmailOtpLink
} from "./firebase.js";

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

export function initPortalAuth({ role, docType, redirect }) {
  const emailInput = document.querySelector("[data-email]");
  const otpInput = document.querySelector("[data-otp]");
  const docSelect = document.querySelector("[data-template]");
  const docIdInput = document.querySelector("[data-doc-id]");
  const sendBtn = document.querySelector("[data-action='send-otp']");
  const verifyBtn = document.querySelector("[data-action='verify']");
  const downloadBtn = document.querySelector("[data-action='download-template']");

  const requiredType = docType || requiredDocType[role];

  // Populate template dropdown
  bindTemplateOptions(docSelect, requiredType);

  downloadBtn?.addEventListener("click", () => {
    if (!docSelect?.value) return;
    downloadTemplateFile(docSelect.value);
  });

  /* =========================
     SEND OTP
  ========================= */

  sendBtn?.addEventListener("click", async () => {
    const email = emailInput?.value.trim();
    const documentId = docIdInput?.value.trim();

    if (!email) {
      alert("Email wajib diisi.");
      return;
    }

    if (role === "ADMIN" && email !== ADMIN_EMAIL) {
      alert(`Email admin wajib ${ADMIN_EMAIL}`);
      return;
    }

    if (role !== "ADMIN" && !documentId) {
      alert("Nomor IPL/SPL wajib diisi.");
      return;
    }

    try {
      await sendEmailOtp(email, {
        role,
        docType: requiredType,
        docNumber: documentId,
        template: docSelect?.value
      });

      savePortalSession({
        role,
        docType: requiredType,
        templateFile: docSelect?.value,
        documentId
      });

      alert("OTP dikirim via Firebase. Cek inbox/spam lalu klik tautan email.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal mengirim OTP.");
    }
  });

  /* =========================
     VERIFY / COMPLETE SIGN-IN
  ========================= */

  async function completeSignIn() {
    const email = emailInput?.value.trim();
    const token = otpInput?.value.trim();
    const documentId = docIdInput?.value.trim();

    if (!email) {
      alert("Email wajib diisi.");
      return;
    }

    if (role === "ADMIN" && email !== ADMIN_EMAIL) {
      alert(`Email admin wajib ${ADMIN_EMAIL}`);
      return;
    }

    if (role !== "ADMIN" && !documentId) {
      alert("Nomor IPL/SPL wajib diisi.");
      return;
    }

    try {
      await completeEmailOtpSignIn(email, token);

      savePortalSession({
        role,
        docType: requiredType,
        templateFile: docSelect?.value,
        documentId
      });

      const profileRole = await fetchProfileRole();
      if (profileRole && profileRole !== role) {
        alert(`Role yang terdaftar adalah ${profileRole}. Portal ini khusus ${role}.`);
        return;
      }

      const target = redirect || "../";
      window.location.href = target;
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal verifikasi OTP.");
    }
  }

  verifyBtn?.addEventListener("click", completeSignIn);

  /* =========================
     AUTO COMPLETE FROM EMAIL LINK
  ========================= */

  (async function autoCompleteFromEmailLink() {
    try {
      if (!(await hasEmailOtpLink())) return;

      const email =
        emailInput?.value.trim() ||
        localStorage.getItem("lw_last_email");

      if (!email) return;

      if (!emailInput.value) {
        emailInput.value = email;
      }

      await completeSignIn();
    } catch (err) {
      console.error("Auto sign-in gagal", err);
    }
  })();
}
