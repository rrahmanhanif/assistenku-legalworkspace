import {
  renderBlankTemplateList,
  requirePortalAccess,
  downloadTemplateFile
} from "../shared/access.js";
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
    hash: "bb2...c31",
    canDownload: true
  }
];

const invoices = [
  {
    id: "INV-2024-001",
    owner: "PT Alfa Energi",
    status: "DRAFT",
    total: 12500000,
    document: "invoice-01.html",
    hash: "1ab2...9dd"
  },
  {
    id: "INV-2024-002",
    owner: "PT Alfa Energi",
    status: "FINAL",
    total: 8400000,
    document: "invoice-02.html",
    hash: "2cd3...a01"
  }
];

const evidences = [
  {
    id: "EVD-2024-001",
    spl: "SPL-2024-011",
    submitter: "Mitra Kontraktual",
    status: "SUBMITTED",
    files: ["evidence-01.jpg", "evidence-02.jpg"],
    timestamp: "2024-08-12 18:11 WIB"
  }
];

function renderLegend() {
  if (!docLegend) return;
  docLegend.innerHTML = `
    <div class="legend">
      <span class="chip chip-lock">LOCKED</span>
      <span class="chip chip-final">FINAL</span>
      <span class="chip chip-draft">DRAFT</span>
      <span class="muted">Status legal-grade: LOCKED tidak dapat diubah, FINAL siap diekspor dan ditandatangani.</span>
    </div>
  `;
}

function renderDocuments() {
  if (!docTableBody) return;
  docTableBody.innerHTML = documents
    .map((doc) => {
      const badgeClass =
        doc.status === "FINAL"
          ? "chip chip-final"
          : doc.status === "LOCKED"
            ? "chip chip-lock"
            : "chip chip-draft";

      return `
        <tr>
          <td>${doc.type}</td>
          <td><strong>${doc.number}</strong><br><span class="muted">${doc.owner}</span></td>
          <td><span class="${badgeClass}">${doc.status}</span></td>
          <td><span class="muted">${doc.hash}</span></td>
          <td class="actions">
            ${
              doc.canDownload
                ? `<button class="secondary" data-action="open-template" data-template="${doc.document}">Buka</button>`
                : `<button class="secondary" disabled>Tidak tersedia</button>`
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function renderInvoices() {
  if (!invoiceTableBody) return;
  invoiceTableBody.innerHTML = invoices
    .map((inv) => {
      const badgeClass =
        inv.status === "FINAL"
          ? "chip chip-final"
          : inv.status === "LOCKED"
            ? "chip chip-lock"
            : "chip chip-draft";

      return `
        <tr>
          <td><strong>${inv.id}</strong></td>
          <td>${inv.owner}</td>
          <td><span class="${badgeClass}">${inv.status}</span></td>
          <td>${formatRupiah(inv.total)}</td>
          <td><span class="muted">${inv.hash}</span></td>
          <td class="actions">
            <button class="secondary" data-action="open-template" data-template="${inv.document}">Buka</button>
            <button class="primary" data-action="generate">Generate PDF</button>
          </td>
        </tr>
      `;
    })
    .join("");

  if (invoiceCount) invoiceCount.textContent = String(invoices.length);
}

function renderEvidences() {
  if (!evidenceList) return;

  evidenceList.innerHTML = evidences
    .map((ev) => {
      return `
        <div class="card">
          <div class="row">
            <div>
              <div><strong>${ev.id}</strong> — ${ev.spl}</div>
              <div class="muted">Pengirim: ${ev.submitter} • ${ev.timestamp} • Status: ${ev.status}</div>
            </div>
          </div>
          <div class="files">
            ${ev.files
              .map((f) => `<span class="chip chip-draft">${f}</span>`)
              .join("")}
          </div>
        </div>
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
      downloadTemplateFile(
        btn
          .closest("tr")
          .querySelector("button[data-action='open-template']")
          .dataset.template
      );
    }
  });

  const btnUploadEvidence = document.getElementById("btnUploadEvidence");
  if (btnUploadEvidence) {
    btnUploadEvidence.addEventListener("click", () => {
      alert("Unggah bukti kinerja harian melalui form ini akan menandai data sebagai siap dibayar.");
    });
  }

  const btnAddInvoice = document.getElementById("btnAddInvoice");
  if (btnAddInvoice) {
    btnAddInvoice.addEventListener("click", () => {
      alert("Gunakan IPL/SPL digital yang telah terkunci sebelum membuat invoice baru.");
    });
  }

  const btnRefresh = document.getElementById("btnRefresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      renderDocuments();
      renderInvoices();
      renderEvidences();
    });
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOutFirebase();
      window.location.href = "/";
    });
  }
}

renderLegend();
renderDocuments();
renderInvoices();
renderEvidences();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
