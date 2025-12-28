import {
  bindTemplateOptions,
  downloadTemplateFile,
  fetchProfileRole,
  savePortalSession
} from "./access.js";
import { completeEmailOtpSignIn, sendEmailOtp, hasEmailOtpLink } from "./firebase.js";

const ADMIN_EMAIL = "kontakassistenku@gmail.com";

// Fallback jika access.js belum export requiredDocType.
// Idealnya: export requiredDocType di access.js dan hapus fallback ini.
const REQUIRED_DOC_TYPE_FALLBACK = {
  CLIENT: "IPL",
  ADMIN: "IPL",
  MITRA: "SPL"
};

export function initPortalAuth({ role, docType, redirect }) {
  const emailInput = document.querySelector("[data-email]");
  const docSelect = document.querySelector("[data-template]");
  const docIdInput = document.querySelector("[data-doc-id]");
  const sendBtn = document.querySelector("[data-action='send-otp']");
  const downloadBtn = document.querySelector("[data-action='download-template']");

  const requiredType = docType || REQUIRED_DOC_TYPE_FALLBACK[role];

  // Bind template options hanya jika non-admin (admin tidak butuh template)
  if (docSelect && role !== "ADMIN") {
    bindTemplateOptions(docSelect, requiredType);
  }

  // Prefill dari sesi sebelumnya
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem("lw_portal_session"));
    } catch {
      return null;
    }
  })();

  if (saved?.documentId && docIdInput && !docIdInput.value) docIdInput.value = saved.documentId;
  if (saved?.templateFile && docSelect && !docSelect.value) docSelect.value = saved.templateFile;

  downloadBtn?.addEventListener("click", () => {
    // Admin tidak wajib template; jika kosong, jangan lanjut.
    const file = docSelect?.value;
    if (!file) {
      alert("Template tidak tersedia untuk diunduh pada portal ini.");
      return;
    }
    downloadTemplateFile(file);
  });

  sendBtn?.addEventListener("click", async () => {
    const email = (emailInput?.value || "").trim();
    const documentId = (docIdInput?.value || "").trim();
    const templateFile = (docSelect?.value || "").trim();

    if (!email) {
      alert("Email wajib diisi.");
      return;
    }

    if (role === "ADMIN") {
      if (email !== ADMIN_EMAIL) {
        alert(`Email admin wajib ${ADMIN_EMAIL}`);
        return;
      }
    } else {
      if (!documentId) {
        alert("Nomor IPL/SPL wajib diisi.");
        return;
      }
      if (!templateFile) {
        alert("Pilih dokumen digital terlebih dahulu.");
        return;
      }
    }

    try {
      await sendEmailOtp(email, {
        role,
        docType: role === "ADMIN" ? null : requiredType,
        docNumber: role === "ADMIN" ? null : documentId,
        template: role === "ADMIN" ? null : templateFile
      });

      // Simpan sesi portal agar guard konsisten
      savePortalSession({
        role,
        docType: role === "ADMIN" ? requiredType : requiredType,
        templateFile: role === "ADMIN" ? null : templateFile,
        documentId: role === "ADMIN" ? null : documentId
      });

      alert("Tautan masuk dikirim via email. Buka email untuk menyelesaikan login.");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Gagal mengirim tautan masuk");
    }
  });

  async function completeSignIn() {
    const email = (emailInput?.value || "").trim();
    const documentId = (docIdInput?.value || "").trim();
    const templateFile = (docSelect?.value || "").trim();

    if (!email) {
      alert("Email wajib diisi.");
      return;
    }
    if (role === "ADMIN" && email !== ADMIN_EMAIL) {
      alert(`Email admin wajib ${ADMIN_EMAIL}`);
      return;
    }
    if (role !== "ADMIN") {
      if (!documentId) {
        alert("Nomor IPL/SPL wajib diisi.");
        return;
      }
      if (!templateFile) {
        alert("Pilih dokumen digital terlebih dahulu.");
        return;
      }
    }

    await completeEmailOtpSignIn(email);

    savePortalSession({
      role,
      docType: requiredType,
      templateFile: role === "ADMIN" ? null : templateFile,
      documentId: role === "ADMIN" ? null : documentId
    });

    const profileRole = await fetchProfileRole();
    if (profileRole && profileRole !== role) {
      alert(`Role yang terdaftar adalah ${profileRole}. Portal ini khusus ${role}.`);
      return;
    }

    window.location.href = redirect || "../";
  }

  (async function autoComplete() {
    try {
      if (!(await hasEmailOtpLink())) return;

      const email = (emailInput?.value || "").trim() || localStorage.getItem("lw_last_email");
      if (!email) return;

      if (emailInput && !emailInput.value) emailInput.value = email;

      await completeSignIn();
    } catch (err) {
      console.error("Auto complete sign-in gagal", err);
      // Jangan alert agresif agar tidak ganggu UX; user bisa klik ulang dari email.
    }
  })();
}
