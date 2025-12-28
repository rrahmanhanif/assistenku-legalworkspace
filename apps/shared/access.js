import { getFirebaseAuth } from "./firebase.js";

const templateMap = {
  IPL: [
    { file: "01-ipl.html", label: "Perjanjian Induk Layanan (IPL)" },
    { file: "02-addendum-ipl-pt.html", label: "Addendum IPL" }
  ],
  SPL: [
    { file: "03-spl.html", label: "Surat Perintah Layanan (SPL)" },
    { file: "04-perjanjian-mitra.html", label: "Perjanjian Mitra" }
  ],
  OTHER: [
    { file: "05-nda-tata-tertib.html", label: "NDA & Tata Tertib" },
    { file: "06-lembar-kinerja.html", label: "Lembar Kinerja Harian" },
    { file: "07-quotation.html", label: "Quotation" },
    { file: "alur-sistem-assistenku.html", label: "Alur Sistem" }
  ]
};

const requiredDocType = {
  CLIENT: "IPL",
  ADMIN: "IPL",
  MITRA: "SPL"
};

export function getTemplatesByType(type) {
  return templateMap[type] || [];
}

export function bindTemplateOptions(selectEl, type) {
  const items = getTemplatesByType(type);
  selectEl.innerHTML = items
    .map((item) => `<option value="${item.file}">${item.label}</option>`)
    .join("");
}

export function downloadTemplateFile(templateFile, suggestedName = templateFile) {
  const link = document.createElement("a");
  link.href = `/documents/templates/${templateFile}`;
  link.download = suggestedName;
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function savePortalSession({ role, docType, templateFile, documentId }) {
  const payload = { role, docType, templateFile, documentId, timestamp: Date.now() };
  localStorage.setItem("lw_portal_session", JSON.stringify(payload));
}

export async function fetchProfileRole() {
  const session = getPortalSession();
  return session?.role || null;
}

export function getPortalSession() {
  try {
    return JSON.parse(localStorage.getItem("lw_portal_session"));
  } catch {
    return null;
  }
}

function getIplAccessFallback() {
  try {
    return JSON.parse(localStorage.getItem("iplAccess"));
  } catch {
    return null;
  }
}

export function clearPortalSession() {
  localStorage.removeItem("lw_portal_session");
  localStorage.removeItem("iplAccess");
  localStorage.removeItem("lw_pending_login");
  localStorage.removeItem("lw_last_email");
}

/**
 * Guard portal:
 * 1) Pastikan Firebase Auth sudah siap (menunggu sampai 5 detik)
 * 2) Validasi role/docType dari session localStorage
 */
export function requirePortalAccess(role, docType) {
  const auth = getFirebaseAuth();

  const requiredType = docType || requiredDocType[role];

  const redirectToLogin = (msg) => {
    if (msg) console.warn(msg);
    alert("Akses tidak valid. Silakan login sesuai dokumen digital yang dipersyaratkan.");
    const url = new URL(window.location.origin + "/apps/login/");
    url.searchParams.set("role", role);
    window.location.replace(url.toString());
  };

  const checkSession = () => {
    const session = getPortalSession();
    const fallback = getIplAccessFallback();

    // Ambil role/docType dari session utama atau fallback
    const sessionRole = session?.role || fallback?.role || null;
    const sessionDocType = session?.docType || null; // fallback iplAccess tidak menyimpan docType
    const hasRole = sessionRole === role;

    // ADMIN tidak wajib docType match
    const matchedDoc =
      role === "ADMIN" ||
      sessionDocType === requiredType ||
      // fallback: jika sessionDocType tidak ada, minimal pastikan dokumen ada untuk non-admin
      (!!fallback?.documentId && !!fallback?.template);

    if (!hasRole || !matchedDoc) {
      return redirectToLogin("Role/docType tidak match atau sesi tidak ditemukan.");
    }

    // ✅ Lolos
    return true;
  };

  const timeoutMs = 5000;
  const start = Date.now();

  const tick = () => {
    const user = auth.currentUser;

    // tunggu auth siap
    if (!user) {
      if (Date.now() - start > timeoutMs) {
        return redirectToLogin("Firebase auth tidak siap / belum login.");
      }
      return setTimeout(tick, 120);
    }

    // auth siap → cek session localStorage
    checkSession();
  };

  tick();
}

export function renderBlankTemplateList(container) {
  const allTemplates = [...templateMap.IPL, ...templateMap.SPL, ...templateMap.OTHER];
  container.innerHTML = "";

  allTemplates.forEach((tpl) => {
    const item = document.createElement("div");
    item.className = "doc-card";
    item.innerHTML = `
      <div class="doc-title">${tpl.label}</div>
      <p class="muted">Unduh kosong untuk diisi digital.</p>
      <button class="secondary" data-template="${tpl.file}">Unduh Template</button>
    `;
    container.appendChild(item);
  });

  container.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-template]");
    if (!btn) return;
    downloadTemplateFile(btn.dataset.template);
  });
}
