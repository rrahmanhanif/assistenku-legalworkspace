import {
  renderBlankTemplateList,
  requirePortalAccess,
  downloadTemplateFile,
  clearPortalSession
} from "../shared/access.js";
import { signOutFirebase } from "../shared/firebase.js";

// 🔐 Guard ADMIN (async-safe)
requirePortalAccess("ADMIN", "IPL");

const docLegend = document.getElementById("docLegend");
const docTableBody = document.querySelector("#docTable tbody");
const invoiceTableBody = document.querySelector("#invoiceTable tbody");
const invoiceCount = document.getElementById("invoiceCount");
const evidenceList = document.getElementById("evidenceList");

/* =========================
   MOCK DATA (sementara)
========================= */

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
  }
];

const invoices = [
  { id: "INV-001", ref: "IPL-2024-009", status: "PAID" },
  { id: "INV-002", ref: "SPL-2024-011", status: "READY" }
];

const evidences = [
  { id: "EV-001", ref: "SPL-2024-011", status: "LOCKED" }
];

/* =========================
   RENDER
========================= */

function renderLegend() {
  if (!docLegend) return;
  docLegend.innerHTML = `
    <span class="pill locked">LOCKED</span>
    <span class="pill final">FINAL</span>
    <span class="pill draft">DRAFT</span>
  `;
}

function renderDocuments() {
  if (!docTableBody) return;
  docTableBody.innerHTML = "";

  documents.forEach((doc) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${doc.type}</td>
      <td>${doc.number}</td>
      <td>${doc.owner}</td>
      <td><span class="pill ${doc.status.toLowerCase()}">${doc.status}</span></td>
      <td>${doc.hash}</td>
      <td>
        ${
          doc.canDownload
            ? `<button class="secondary" data-action="open-template" data-template="${doc.document}">Unduh</button>`
            : "-"
        }
      </td>
    `;
    docTableBody.appendChild(tr);
  });
}

function renderInvoices() {
  if (!invoiceTableBody) return;
  invoiceTableBody.innerHTML = "";
  invoiceCount.textContent = invoices.length;

  invoices.forEach((inv) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.id}</td>
      <td>${inv.ref}</td>
      <td>${inv.status}</td>
      <td>
        <button class="secondary" data-action="generate">Generate PDF</button>
      </td>
    `;
    invoiceTableBody.appendChild(tr);
  });
}

function renderEvidences() {
  if (!evidenceList) return;
  evidenceList.innerHTML = evidences
    .map((e) => `<li>${e.id} — ${e.ref} — ${e.status}</li>`)
    .join("");
}

/* =========================
   EVENTS
========================= */

function attachEvents() {
  document.body.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;

    const action = btn.dataset.action;

    if (action === "open-template") {
      downloadTemplateFile(btn.dataset.template);
    }

    if (action === "generate") {
      alert("Invoice siap diunduh sebagai PDF legal-grade.");
    }
  });

  document.getElementById("btnRefresh")?.addEventListener("click", () => {
    renderDocuments();
    renderInvoices();
    renderEvidences();
  });

  // 🔓 LOGOUT BERSIH
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn("Firebase signOut gagal, lanjut logout", err);
    } finally {
      clearPortalSession();
      window.location.href = "/";
    }
  });
}

/* =========================
   INIT
========================= */

renderLegend();
renderDocuments();
renderInvoices();
renderEvidences();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
