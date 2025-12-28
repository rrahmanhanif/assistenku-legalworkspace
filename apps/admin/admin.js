import {
  renderBlankTemplateList,
  requirePortalAccess,
  downloadTemplateFile
} from "../shared/access.js";

import { signOutFirebase } from "../shared/firebase.js";

/**
 * Guard: hanya ADMIN dengan IPL
 */
requirePortalAccess("ADMIN", "IPL");

/* ===============================
   ELEMENT REFERENCES
================================= */
const docLegend = document.getElementById("docLegend");
const docTableBody = document.querySelector("#docTable tbody");
const invoiceTableBody = document.querySelector("#invoiceTable tbody");
const invoiceCount = document.getElementById("invoiceCount");
const evidenceList = document.getElementById("evidenceList");

/* ===============================
   MOCK / SAMPLE DATA
   (nanti diganti DB / API)
================================= */
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
    hash: "9bd2...c44",
    canDownload: true
  }
];

const invoices = [
  {
    number: "INV-2024-003",
    spl: "SPL-2024-011",
    amount: "Rp 12.500.000",
    status: "READY"
  }
];

const evidences = [
  {
    spl: "SPL-2024-011",
    date: "2024-12-21",
    description: "Foto timemark & laporan harian"
  }
];

/* ===============================
   RENDER FUNCTIONS
================================= */
function renderLegend() {
  docLegend.innerHTML = `
    <span class="pill locked">LOCKED</span>
    <span class="pill final">FINAL</span>
    <span class="pill active">ACTIVE</span>
  `;
}

function renderDocuments() {
  docTableBody.innerHTML = "";

  documents.forEach((doc) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${doc.type}</td>
      <td>${doc.number}</td>
      <td>${doc.owner}</td>
      <td><span class="pill ${doc.status.toLowerCase()}">${doc.status}</span></td>
      <td class="hash">${doc.hash}</td>
      <td>
        ${
          doc.canDownload
            ? `<button data-action="open-template" data-template="${doc.document}">Unduh</button>`
            : "-"
        }
      </td>
    `;

    docTableBody.appendChild(tr);
  });
}

function renderInvoices() {
  invoiceTableBody.innerHTML = "";
  invoiceCount.textContent = invoices.length;

  invoices.forEach((inv) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${inv.number}</td>
      <td>${inv.spl}</td>
      <td>${inv.amount}</td>
      <td>${inv.status}</td>
      <td>
        <button data-action="generate">Generate PDF</button>
      </td>
    `;

    invoiceTableBody.appendChild(tr);
  });
}

function renderEvidences() {
  evidenceList.innerHTML = "";

  evidences.forEach((ev) => {
    const li = document.createElement("li");
    li.textContent = `${ev.spl} • ${ev.date} — ${ev.description}`;
    evidenceList.appendChild(li);
  });
}

/* ===============================
   EVENTS
================================= */
function attachEvents() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "open-template") {
      downloadTemplateFile(btn.dataset.template);
    }

    if (action === "generate") {
      alert("Invoice siap diunduh sebagai PDF legal-grade.");
      const tpl = btn
        .closest("tr")
        .querySelector("button[data-action='open-template']")?.dataset.template;

      if (tpl) downloadTemplateFile(tpl);
    }
  });

  document.getElementById("btnUploadEvidence").addEventListener("click", () => {
    alert("Unggah bukti kinerja akan menandai SPL siap dibayar.");
  });

  document.getElementById("btnAddInvoice").addEventListener("click", () => {
    alert("Gunakan IPL/SPL yang sudah LOCKED sebelum membuat invoice.");
  });

  document.getElementById("btnRefresh").addEventListener("click", () => {
    renderDocuments();
    renderInvoices();
    renderEvidences();
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/";
  });
}

/* ===============================
   INIT
================================= */
renderLegend();
renderDocuments();
renderInvoices();
renderEvidences();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
