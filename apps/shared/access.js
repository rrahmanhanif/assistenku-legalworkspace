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

export const requiredDocType = {
  CLIENT: "IPL",
  ADMIN: "IPL",
  MITRA: "SPL"
};

export function getTemplatesByType(type) {
  return templateMap[type] || [];
}

export function bindTemplateOptions(selectEl, type) {
  if (!selectEl) return;
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

export function getPortalSession() {
  try {
    return JSON.parse(localStorage.getItem("lw_portal_session"));
  } catch (err) {
    return null;
  }
}

export function clearPortalSession() {
  localStorage.removeItem("lw_portal_session");
}

export async function fetchProfileRole() {
  // Dengan OTP Firebase, role disimpan di localStorage melalui sesi portal.
  const session = getPortalSession();
  return session?.role || null;
}

export function requirePortalAccess(role, docType) {
  const session = getPortalSession();
  const requiredType = docType || requiredDocType[role];
  const matchedRole = session?.role === role;
  const matchedDoc = role === "ADMIN" || session?.docType === requiredType;

  if (!matchedRole || !matchedDoc) {
    alert("Akses tidak valid. Silakan login sesuai dokumen digital yang dipersyaratkan.");
    window.location.href = "/";
  }
}

export function renderBlankTemplateList(container) {
  if (!container) return;

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
