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
          doc
