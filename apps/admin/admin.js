import { renderBlankTemplateList, requirePortalAccess, downloadTemplateFile } from "../shared/access.js";
import { supabase } from "../shared/supabase.js";

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
    hash: "bb2a...c13",
    canDownload: true
  },
  {
    type: "SPL",
    number: "SPL-2024-012",
    owner: "PT Sukses Bersama",
    status: "ACTIVE",
    document: "06-lembar-kinerja.html",
    hash: "-",
    canDownload: false
  }
];

const evidences = [
  {
    id: "EV-001",
    spl: "SPL-2024-011",
    title: "Lembar Kinerja Harian",
    template: "06-lembar-kinerja.html",
    locked: true
  },
  {
    id: "EV-002",
    spl: "SPL-2024-012",
    title: "Lembar Kinerja Harian",
    template: "06-lembar-kinerja.html",
    locked: false
  }
];

const invoices = [
  {
    id: "INV-CL-001",
    type: "Client (IPL)",
    document: "IPL-2024-009",
    template: "01-ipl.html",
    bank: "Mandiri 1230009902984 a.n Abdurrahman Hanif",
    status: "Menunggu Evidence",
    evidenceRequired: true
  },
  {
    id: "INV-MT-001",
    type: "Mitra (SPL)",
    document: "SPL-2024-011",
    template: "03-spl.html",
    bank: "Mandiri 1230009902984 a.n Abdurrahman Hanif",
    status: "Siap Dibayar",
    evidenceRequired: false
  }
];

function badge(status) {
  const variants = {
    ACTIVE: "badge info",
    FINAL: "badge final",
    LOCKED: "badge locked"
  };
  return `<span class="${variants[status] || "badge"}">${status}</span>`;
}

function renderLegend() {
  docLegend.innerHTML = ["ACTIVE", "FINAL", "LOCKED"]
    .map((st) => `<span class="pill ${st.toLowerCase()}">${st}</span>`)
    .join("");
}

function renderDocuments() {
  docTableBody.innerHTML = "";
  documents.forEach((doc) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${doc.type}</td>
      <td>${doc.number}</td>
      <td>${doc.owner}</td>
      <td>${badge(doc.status)}</td>
      <td><span class="pill neutral">${doc.document}</span></td>
      <td class="actions">
        <button class="secondary" data-action="open" data-template="${doc.document}">Preview</button>
        <button data-action="lock" data-number="${doc.number}" ${doc.status === "LOCKED" ? "disabled" : ""}>Lock</button>
      </td>
    `;
    docTableBody.appendChild(row);
  });
}

function renderEvidences() {
  evidenceList.innerHTML = "";
  evidences.forEach((ev) => {
    const card = document.createElement("div");
    card.className = "doc-card";
    card.innerHTML = `
      <div class="doc-title">${ev.title} - ${ev.spl}</div>
      <p class="muted">${ev.locked ? "Sudah dikunci" : "Menunggu konfirmasi"}</p>
      <div class="doc-meta">
        <span class="pill ${ev.locked ? "locked" : "draft"}">${ev.locked ? "LOCKED" : "DRAFT"}</span>
      </div>
      <div class="actions" style="margin-top: 10px; gap: 8px;">
        <button class="secondary" data-action="download-evidence" data-template="${ev.template}">Unduh PDF</button>
        <button data-action="toggle-lock" data-id="${ev.id}">${ev.locked ? "Buka" : "Kunci"}</button>
      </div>
    `;
    evidenceList.appendChild(card);
  });
}

function renderInvoices() {
  invoiceTableBody.innerHTML = "";
  invoices.forEach((inv) => {
    const row = document.createElement("tr");
    const disabled = inv.evidenceRequired && !evidences.find((e) => e.locked && inv.document.includes(e.spl));
    row.innerHTML = `
      <td>${inv.id}</td>
      <td>${inv.type}</td>
      <td>${inv.document}</td>
      <td>${inv.bank}</td>
      <td><span class="pill ${inv.status.toLowerCase().replace(/\s/g, "-")}">${inv.status}</span></td>
      <td class="actions">
        <button class="secondary" data-action="open-template" data-template="${inv.template}">Template</button>
        <button data-action="generate" data-id="${inv.id}" ${disabled ? "disabled" : ""}>Unduh PDF</button>
      </td>
    `;
    invoiceTableBody.appendChild(row);
  });
  invoiceCount.textContent = `${invoices.length} Invoice`;
}

function attachEvents() {
  docTableBody.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "open") {
      downloadTemplateFile(btn.dataset.template, btn.dataset.template);
    }
    if (action === "lock") {
      const doc = documents.find((d) => d.number === btn.dataset.number);
      if (doc) {
        doc.status = "LOCKED";
        renderDocuments();
      }
    }
  });

  evidenceList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "download-evidence") {
      downloadTemplateFile(btn.dataset.template);
    }
    if (action === "toggle-lock") {
      const evObj = evidences.find((e) => e.id === btn.dataset.id);
      if (evObj) {
        evObj.locked = !evObj.locked;
        renderEvidences();
        renderInvoices();
      }
    }
  });

  invoiceTableBody.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === "open-template") {
      downloadTemplateFile(btn.dataset.template);
    }
    if (action === "generate") {
      alert("Invoice siap diunduh sebagai PDF legal-grade dengan data digital yang telah diisi.");
      downloadTemplateFile(btn.closest("tr").querySelector("button[data-action='open-template']").dataset.template);
    }
  });

  document.getElementById("btnUploadEvidence").addEventListener("click", () => {
    alert("Unggah bukti kinerja harian melalui form ini akan menandai data sebagai siap dibayar.");
  });

  document.getElementById("btnAddInvoice").addEventListener("click", () => {
    alert("Gunakan IPL/SPL digital yang telah terkunci sebelum membuat invoice baru.");
  });

  document.getElementById("btnRefresh").addEventListener("click", () => {
    renderDocuments();
    renderInvoices();
    renderEvidences();
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  });
}

renderLegend();
renderDocuments();
renderInvoices();
renderEvidences();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
