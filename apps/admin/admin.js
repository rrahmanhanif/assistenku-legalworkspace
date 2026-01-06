import {
  renderBlankTemplateList,
  requirePortalAccess,
  downloadTemplateFile
} from "../shared/access.js";
import { signOutFirebase } from "../shared/firebase.js";
import { apiFetch, apiHealth, apiWhoAmI } from "/assets/apiClient.js";

requirePortalAccess("ADMIN", "IPL");

const docLegend = document.getElementById("docLegend");
const docTableBody = document.querySelector("#docTable tbody");
const invoiceTableBody = document.querySelector("#invoiceTable tbody");
const invoiceCount = document.getElementById("invoiceCount");
const evidenceList = document.getElementById("evidenceList");
const statusMessage = document.getElementById("statusMessage");

let documents = [];
let invoices = [];
let evidences = [];

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

  if (!documents.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="muted">Belum ada dokumen dari API.</td>`;
    docTableBody.appendChild(row);
    return;
  }

  documents.forEach((doc) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${doc.type || "-"}</strong></td>
      <td>${doc.number || "-"}</td>
      <td>${doc.owner || "-"}</td>
      <td><span class="status">${doc.status || "-"}</span></td>
      <td class="mono">${doc.hash || "-"}</td>
      <td>
        ${
          doc.downloadPath
            ? `<button class="btn btn-small" data-action="open-template" data-template="${doc.downloadPath}">Buka</button>`
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

  if (!invoices.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="muted">Belum ada invoice dari API.</td>`;
    invoiceTableBody.appendChild(row);
    if (invoiceCount) invoiceCount.textContent = "0";
    return;
  }

  invoices.forEach((inv) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><strong>${inv.number || "-"}</strong></td>
      <td>${inv.owner || "-"}</td>
      <td>${inv.period || "-"}</td>
      <td><span class="status">${inv.status || "-"}</span></td>
      <td>${inv.amount || "-"}</td>
      <td>
        ${
          inv.documentPath
            ? `<button class="btn btn-small" data-action="open-template" data-template="${inv.documentPath}">Buka</button>`
            : ""
        }
        ${
          inv.documentPath
            ? `<button class="btn btn-small btn-primary" data-action="generate">Generate PDF</button>`
            : ""
        }
      </td>
    `;
    invoiceTableBody.appendChild(row);
  });

  if (invoiceCount) invoiceCount.textContent = String(invoices.length);
}

function renderEvidences() {
  if (!evidenceList) return;

  evidenceList.innerHTML = "";

  if (!evidences.length) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `<div class="muted">Belum ada evidence kinerja yang diterima.</div>`;
    evidenceList.appendChild(li);
    return;
  }

  evidences.forEach((item) => {
    const li = document.createElement("li");
    li.className = "list-item";
    li.innerHTML = `
      <div class="list-title">${item.date || "-"} — ${item.mitra || "-"}</div>
      <div class="list-subtitle">${item.client || "-"} • ${item.status || "-"}</div>
      <div class="list-note">${item.note || "-"}</div>
    `;
    evidenceList.appendChild(li);
  });
}

function attachEvents() {
  document.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;

      if (action === "open-template" && btn.dataset.template) {
        downloadTemplateFile(btn.dataset.template);
      }

      if (action === "generate") {
        alert("Invoice siap diunduh sebagai PDF legal-grade dengan data digital yang telah diisi.");
        const openBtn = btn.closest("tr")?.querySelector("button[data-action='open-template']");
        if (openBtn?.dataset?.template) {
          downloadTemplateFile(openBtn.dataset.template);
        }
      }
    });
  });

  document.getElementById("btnUploadEvidence")?.addEventListener("click", () => {
    alert("Unggah bukti kinerja harian dilakukan melalui portal admin API terpusat.");
  });

  document.getElementById("btnAddInvoice")?.addEventListener("click", () => {
    alert("Gunakan IPL/SPL digital yang telah terkunci sebelum membuat invoice baru.");
  });

  document.getElementById("btnRefresh")?.addEventListener("click", () => {
    loadOverview();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/";
  });
}

function setStatus(message) {
  if (statusMessage) statusMessage.textContent = message;
}

async function loadOverview() {
  setStatus("Memuat data terbaru dari api.assistenku.com ...");

  try {
    await apiHealth();
    const who = await apiWhoAmI();
    setStatus(`Terkoneksi sebagai ${who?.email || "-"}`);
  } catch (err) {
    console.error(err);
    setStatus(`Peringatan: ${err?.message || "Gagal memanggil API"}`);
  }

  try {
    const overview = await apiFetch("/api/admin/ledger/overview", { admin: true });
    documents = overview?.documents || [];
    invoices = overview?.invoices || [];
    evidences = overview?.evidences || [];
    setStatus("Data berhasil dimuat dari API");
  } catch (err) {
    console.error(err);
    setStatus(`Gagal memuat overview: ${err?.message || "Unknown"}`);
    documents = [];
    invoices = [];
    evidences = [];
  }

  renderDocuments();
  renderInvoices();
  renderEvidences();
}

renderLegend();
renderBlankTemplateList(document.getElementById("templateDownloads"));
attachEvents();
loadOverview();
