import {
  bindTemplateOptions,
  downloadTemplateFile,
  fetchProfileRole,
  requiredDocType,
  savePortalSession
} from "./access.js";
import { supabase } from "./supabase.js";

export function initPortalAuth({ role, docType, redirect }) {
  const emailInput = document.querySelector("[data-email]");
  const otpInput = document.querySelector("[data-otp]");
  const docSelect = document.querySelector("[data-template]");
  const docIdInput = document.querySelector("[data-doc-id]");
  const sendBtn = document.querySelector("[data-action='send-otp']");
  const verifyBtn = document.querySelector("[data-action='verify']");
  const downloadBtn = document.querySelector("[data-action='download-template']");
  const requiredType = docType || requiredDocType[role];

  bindTemplateOptions(docSelect, requiredType);

  downloadBtn?.addEventListener("click", () => {
    downloadTemplateFile(docSelect.value);
  });

  sendBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const documentId = docIdInput.value.trim();
    if (!email || !documentId) {
      alert("Email dan nomor dokumen wajib diisi.");
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true }
    });

    if (error) {
      alert(error.message);
    } else {
      alert("OTP dikirim ke email. Cek inbox/spam.");
    }
  });

  verifyBtn?.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const token = otpInput.value.trim();
    const documentId = docIdInput.value.trim();
    if (!email || !token || !documentId) {
      alert("Lengkapi email, OTP, dan nomor dokumen.");
      return;
    }

    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      alert(error.message);
      return;
    }

    const profileRole = await fetchProfileRole();
    if (profileRole !== role) {
      alert(`Role yang terdaftar adalah ${profileRole || "tidak dikenal"}. Portal ini khusus ${role}.`);
      return;
    }

    savePortalSession({
      role,
      docType: requiredType,
      templateFile: docSelect.value,
      documentId
    });

    const target = redirect || "../";
    window.location.href = target;
  });
}
