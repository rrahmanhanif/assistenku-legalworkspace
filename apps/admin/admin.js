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
    hash: "bb2...cd3",
    canDownload: true
  },
  {
    type: "ADDENDUM",
    number: "ADD-2024-005",
    owner: "PT Alfa Energi (Client)",
    status: "LOCKED",
    document: "02-addendum-ipl-pt.html",
    hash: "19ab...ff8",
    canDownload: true
  },
  {
    type: "NDA",
    number: "NDA-2024-003",
    owner: "CV Mitra Kontraktual",
    status: "FINAL",
    document: "05-nda-tata-tertib.html",
    hash: "ad11...0f2",
    canDownload: true
  }
];

const invoices = [
  {
    number: "INV-2024-001",
    owner: "PT Alfa Energi",
    period: "Nov 2024",
    status: "DRAFT",
    amount: "Rp 12.500.000",
    document: "invoice-sample.pdf"
  },
  {
    number: "INV-2024-002",
    owner: "PT Alfa Energi",
    period: "Des 2024",
    status: "FINAL",
    amount: "Rp 9.750.000",
    document: "invoice-sample.pdf"
  }
];

const evidences = [
  {
    date: "2024-12-01",
    mitra: "CV Mitra Kontraktual",
    client: "PT Alfa Energi",
    status: "SUBMITTED",
    note: "Laporan kinerja harian + bukti foto"
  },
  {
    date: "2024-12-02",
    mitra: "CV Mitra Kontraktual",
    client: "PT Alfa Energi",
    status: "APPROVED",
    note: "Disetujui client, siap invoice"
  }
];

function renderLegend() {
  if (!docLegend) return;

  docLegend.innerHTML = `
    <span class="badge badge-primary">FINAL</span>
    <span class="badge badge-warning">LOCKED</span>
    <span class="badge badge-muted">DRAFT</span>
  `;
}

function renderDocuments() {
  if (!docTableBody) return;

  docTableBody.innerHTML = "";
  documents.forEach((doc) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${doc.type}</strong></td>
      <td>${doc.number}</td>
      <td>${doc.owner}</td>
      <td><span class="status">${doc.status}</span></td>
      <td class="mono">${doc.hash}</td>
      <td>
        ${
          doc.canDownload
            ? `<button class="btn btn-small" data-action="open-template" data-template="${doc.document}">Buka</button>`
            : `<span class="muted">-</span>`
        }
      </td>
    `;
    docTableBody.appendChild(row);
  });
}

function renderInvoices() {
  if (!invoiceTableBody) return;

  invoiceTableBody.innerHTML = "";
  invoices.forEach((inv) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${inv.number}</strong></td>
      <td>${inv.owner}</td>
      <td>${inv.period}</td>
      <td><span class="status">${inv.status}</span></td>
      <td>${inv.amount}</td>
      <td>
        <button class="btn btn-small" data-action="open-template" data-template="${inv.document}">Buka</button>
        <button class="btn btn-small btn-primary" data-action="generate">Generate PDF</button>
      </td>
    `;
    invoiceTableBody.appendChild(row);
  });

  if (invoiceCount) invoiceCount.textContent = String(invoices.length);
}

function renderEvidences() {
  if (!evidenceList) return;

  evidenceList.innerHTML = "";
  evidences.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <div class="list-title">${item.date} — ${item.mitra}</div>
      <div class="list-subtitle">${item.client} • ${item.status}</div>
      <div class="list-note">${item.note}</div>
    `;
    evidenceList.appendChild(li);
  });
}

function attachEvents() {
  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      if (action === "open-template") {
        downloadTemplateFile(btn.dataset.template);
      }

      if (action === "generate") {
        alert("Invoice siap diunduh sebagai PDF legal-grade dengan data digital yang telah diisi.");
        const openBtn = btn
          .closest("tr")
          ?.querySelector("button[data-action='open-template']");
        if (openBtn?.dataset?.template) {
          downloadTemplateFile(openBtn.dataset.template);
        }
      }
    });
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
