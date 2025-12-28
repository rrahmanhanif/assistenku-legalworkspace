import {
  completeEmailOtpSignIn,
  hasEmailOtpLink,
  sendEmailOtp
} from "../shared/firebase.js";

const emailInput = document.getElementById("email");
const otpInput = document.getElementById("otp");
const docNumberInput = document.getElementById("docNumber");
const btnSend = document.getElementById("btnSend");
const btnVerify = document.getElementById("btnVerify");
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
  if (!response.ok) throw new Error("Dokumen IPL tidak dapat diakses");

  const text = await response.text();
  if (!text || text.trim().length < 20) throw new Error("Konten IPL tidak valid");

  return text.substring(0, 120);
}

function savePendingSession(payload) {
  localStorage.setItem("lw_pending_login", JSON.stringify(payload));
}

function loadPendingSession() {
  try {
    return JSON.parse(localStorage.getItem("lw_pending_login"));
  } catch (err) {
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
  const templatePath = iplSelect?.value;
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
    let preview;
    if (selectedRole !== "ADMIN") {
      preview = await validateIplTemplate(templatePath);
    }

    await sendEmailOtp(email, {
      role: selectedRole,
      docType: selectedRole === "MITRA" ? "SPL" : "IPL",
      docNumber,
      template: templatePath
    });

    savePendingSession({ role: selectedRole, template: templatePath, docNumber, preview });
    localStorage.setItem("lw_last_email", email);

    alert("OTP dikirim via Firebase. Cek inbox/spam dan buka tautannya untuk verifikasi.");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal mengirim OTP");
  }
});

btnVerify?.addEventListener("click", async () => {
  const email = emailInput?.value.trim();
  const token = otpInput?.value.trim();
  const templatePath = iplSelect?.value;
  const docNumber = docNumberInput?.value.trim();
  const pending = loadPendingSession();

  if (!email) return alert("Email wajib diisi");
  if (selectedRole === "ADMIN" && email !== ADMIN_EMAIL) {
    return alert(`Email admin wajib ${ADMIN_EMAIL}`);
  }
  if (selectedRole !== "ADMIN") {
    if (!templatePath) return alert("Pilih dokumen IPL/SPL terlebih dahulu");
    if (!docNumber) return alert("Nomor IPL/SPL wajib diisi");
  }

  try {
    const preview = pending?.preview;
    await completeEmailOtpSignIn(email, token);

    persistAccess({ role: selectedRole, template: templatePath, docNumber, preview });

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

(async function autoCompleteFromLink() {
  try {
    if (!hasEmailOtpLink()) return;

    const stored = loadPendingSession();
    const email = localStorage.getItem("lw_last_email") || emailInput?.value.trim();
    if (!email) return;

    const role = stored?.role || selectedRole;
    if (role === "ADMIN" && email !== ADMIN_EMAIL) return;

    await completeEmailOtpSignIn(email);

    persistAccess({
      role,
      template: stored?.template || iplSelect?.value,
      docNumber: stored?.docNumber || docNumberInput?.value,
      preview: stored?.preview
    });

    if (role === "CLIENT") {
      window.location.href = "/apps/client/";
    } else if (role === "MITRA") {
      window.location.href = "/apps/mitra/";
    } else if (role === "ADMIN") {
      window.location.href = "/apps/admin/";
    }
  } catch (err) {
    console.error("Auto sign-in gagal", err);
  }
})();
