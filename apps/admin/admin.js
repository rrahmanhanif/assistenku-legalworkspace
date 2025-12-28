import { renderBlankTemplateList, requirePortalAccess, downloadTemplateFile } from "../shared/access.js";
import { signOutFirebase } from "../shared/firebase.js";

requirePortalAccess("ADMIN", "IPL");

const docLegend = document.getElementById("docLegend");
const docTableBody = document.querySelector("#docTable tbody");
const invoiceTableBody = document.querySelector("#invoiceTable tbody");
const invoiceCount = document.getElementById("invoiceCount");
const evidenceList = document.getElementById("evidenceList");

const documents = [
  {
    type: "IPL",
    number: "IPL-2024-009",
    owner: "PT Alfa Energi (Client)",
    status: "LOCKED",
    document: "01-ipl.html",
    hash: "f3c9...aa1",
    canDownload: true
  },
  {
    type: "SPL",
    number: "SPL-2024-011",
    owner: "CV Mitra Kontraktual",
    status: "FINAL",
    document: "03-spl.html",
    hash: "a82b...19c",
    canDownload: true
  },
  {
    type: "SPL",
    number: "SPL-2024-014",
    owner: "PT Alfa Energi (Client)",
    status: "ACTIVE",
    document: "03-spl.html",
    hash: "9d2e...8b1",
    canDownload: true
  }
];

const invoices = [
  {
    number: "INV-2024-001",
    ref: "SPL-2024-011",
    amount: "Rp 4.500.000",
    status: "READY",
    template: "07-quotation.html"
  },
  {
    number: "INV-2024-002",
    ref: "SPL-2024-014",
    amount: "Rp 2.750.000",
    status: "DRAFT",
    template: "07-quotation.html"
  }
];

const evidences = [
  {
    name: "Bukti Kinerja 2024-12-01",
    status: "UPLOADED",
    note: "Foto timemark + lembar kinerja (LOCKED_BY_SYSTEM)"
  },
  {
    name: "Bukti Kinerja 2024-12-03",
    status: "VERIFIED",
    note: "Disetujui client, siap invoice"
  }
];

function statusClass(status) {
  const map = {
    DRAFT: "draft",
    ACTIVE: "active",
    FINAL: "final",
    LOCKED: "locked",
    READY: "signed",
    VERIFIED: "signed",
    UPLOADED: "sent"
  };
  return map[status] || "neutral";
}

function renderLegend() {
  if (!docLegend) return;

  docLegend.innerHTML = `
    <span class="pill draft">DRAFT</span>
    <span class="pill active">ACTIVE</span>
    <span class="pill final">FINAL</span>
    <span class="pill locked">LOCKED</span>
    <span class="pill sent">UPLOADED</span>
    <span class="pill signed">VERIFIED / READY</span>
  `;
}

function renderDocuments() {
  if (!docTableBody) return;

  docTableBody.innerHTML = documents
    .map((doc) => {
      const pill = `<span class="pill ${statusClass(doc.status)}">${doc.status}</span>`;
      const dlBtn = doc.canDownload
        ? `<button data-action="open-template" data-template="${doc.document}" class="secondary">Template</button>`
        : `<button class="secondary" disabled>Template</button>`;

      return `
        <tr>
          <td>${doc.type}</td>
          <td>${doc.number}</td>
          <td>${doc.owner}</td>
          <td>${pill}</td>
          <td class="hash">${doc.hash}</td>
          <td class="actions">${dlBtn}</td>
        </tr>
      `;
    })
    .join("");
}

function renderInvoices() {
  if (!invoiceTableBody) return;

  invoiceCount.textContent = String(invoices.length);

  invoiceTableBody.innerHTML = invoices
    .map((inv) => {
      const pill = `<span class="pill ${statusClass(inv.status)}">${inv.status}</span>`;
      return `
        <tr>
          <td>${inv.number}</td>
          <td>${inv.ref}</td>
          <td>${inv.amount}</td>
          <td>${pill}</td>
          <td class="actions">
            <button data-action="open-template" data-template="${inv.template}" class="secondary">Template</button>
            <button data-action="generate">Generate PDF</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderEvidences() {
  if (!evidenceList) return;

  evidenceList.innerHTML = evidences
    .map((ev) => {
      const pill = `<span class="pill ${statusClass(ev.status)}">${ev.status}</span>`;
      return `
        <li>
          <div style="display:flex; justify-content: space-between; gap: 10px; align-items: flex-start; flex-wrap: wrap;">
            <div>
              <strong>${ev.name}</strong>
              <p class="muted" style="margin-top:6px;">${ev.note}</p>
            </div>
            <div>${pill}</div>
          </div>
        </li>
      `;
    })
    .join("");
}

function attachEvents() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "open-template") {
      downloadTemplateFile(btn.dataset.template);
    }

    if (action === "generate") {
      alert("Invoice siap diunduh sebagai PDF legal-grade dengan data digital yang telah diisi.");
      const templateBtn = btn
        .closest("tr")
        ?.querySelector("button[data-action='open-template']");
      if (templateBtn) downloadTemplateFile(templateBtn.dataset.template);
    }
  });

  document.getElementById("btnUploadEvidence")?.addEventListener("click", () => {
    alert("Unggah bukti kinerja harian melalui form ini akan menandai data sebagai siap dibayar.");
  });

  document.getElementById("btnAddInvoice")?.addEventListener("click", () => {
    alert("Gunakan IPL/SPL digital yang telah terkunci sebelum membuat invoice baru.");
  });

  document.getElementById("btnRefresh")?.addEventListener("click", () => {
    renderDocuments();
    renderInvoices();
    renderEvidences();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/";
  });
}

renderLegend();
renderDocuments();
renderInvoices();
renderEvidences();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
