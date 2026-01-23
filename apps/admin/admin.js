import {
  renderBlankTemplateList,
  downloadTemplateFile
} from "../shared/access.js";
import { signOutFirebase } from "../shared/firebase.js";
import { requireRole } from "/shared/guards.js";
import { clearPortalSession, loadPortalSession } from "/shared/session.js";
import { request, requestWithSession } from "/shared/http/httpClient.js";
import { endpoints } from "/shared/http/endpoints.js";
import { baseUrl as API_BASE_URL } from "/shared/http/baseUrl.js";

requireRole("ADMIN");

const docLegend = document.getElementById("docLegend");
const docTableBody = document.querySelector("#docTable tbody");
const invoiceTableBody = document.querySelector("#invoiceTable tbody");
const invoiceCount = document.getElementById("invoiceCount");
const evidenceList = document.getElementById("evidenceList");
const statusMessage = document.getElementById("statusMessage");
const overviewCounts = document.getElementById("overviewCounts");
const whoamiInfo = document.getElementById("whoamiInfo");

const registrationForm = document.getElementById("registrationForm");
const registrationResult = document.getElementById("registrationResult");

let documents = [];
let invoices = [];
let evidences = [];

/* =========================
   WHOAMI (AMAN & SEDERHANA)
========================= */
async function loadWhoAmI() {
  if (!whoamiInfo) return;

  const session = loadPortalSession();
  if (!session?.idToken) {
    whoamiInfo.textContent = "Belum login";
    return;
  }

  try {
    const data = await request(endpoints.auth.whoami, {
      token: session.idToken
    });

    const p = data?.data || data || {};
    whoamiInfo.textContent = `${p.role || "ADMIN"} • ${p.email || "-"} • ${p.id || "-"}`;
  } catch {
    whoamiInfo.textContent = "Gagal memuat identitas";
  }
}

/* =========================
   RENDER
========================= */
function renderLegend() {
  if (!docLegend) return;
  docLegend.innerHTML = `
    <span class="badge badge-primary">FINAL</span>
    <span class="badge badge-warning">LOCKED</span>
    <span class="badge badge-muted">DRAFT</span>
  `;
}

function setStatus(msg) {
  if (statusMessage) statusMessage.textContent = msg;
}

/* =========================
   LOAD OVERVIEW
========================= */
async function loadOverview() {
  setStatus(`Memuat data dari ${API_BASE_URL} ...`);

  try {
    const overview = await requestWithSession(
      endpoints.admin.ledgerOverview,
      { method: "GET" }
    );

    documents = overview?.documents || [];
    invoices = overview?.invoices || [];
    evidences = overview?.evidences || [];

    setStatus("Data berhasil dimuat");
  } catch (err) {
    console.error(err);
    setStatus("Gagal memuat overview");
    documents = [];
    invoices = [];
    evidences = [];
  }

  renderDocuments();
  renderInvoices();
  renderEvidences();
}

/* =========================
   RENDER TABLE (MINIMAL)
========================= */
function renderDocuments() {
  if (!docTableBody) return;
  docTableBody.innerHTML = "";

  if (!documents.length) {
    docTableBody.innerHTML =
      `<tr><td colspan="6" class="muted">Tidak ada dokumen</td></tr>`;
    return;
  }

  documents.forEach((d) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${d.docType || "-"}</td>
      <td>${d.docNumber || "-"}</td>
      <td>${d.status || "-"}</td>
      <td>${d.owner || "-"}</td>
      <td>${d.updatedAt || "-"}</td>
      <td>
        <button onclick="downloadTemplateFile('${d.template}')">Download</button>
      </td>
    `;
    docTableBody.appendChild(tr);
  });
}

function renderInvoices() {
  if (!invoiceTableBody) return;
  invoiceTableBody.innerHTML = "";

  invoices.forEach((inv) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${inv.number}</td>
      <td>${inv.amount}</td>
      <td>${inv.status}</td>
    `;
    invoiceTableBody.appendChild(tr);
  });

  if (invoiceCount) invoiceCount.textContent = invoices.length;
}

function renderEvidences() {
  if (!evidenceList) return;
  evidenceList.innerHTML = "";

  evidences.forEach((e) => {
    const li = document.createElement("li");
    li.textContent = `${e.type} • ${e.createdAt}`;
    evidenceList.appendChild(li);
  });
}

/* =========================
   REGISTER DOC
========================= */
if (registrationForm) {
  registrationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      role: regRole.value,
      email: regEmail.value.trim(),
      accountType: regAccountType.value,
      docType: regDocType.value,
      docNumber: regDocNumber.value.trim(),
      template: regTemplate.value || null,
      isActive: regIsActive.checked
    };

    if (!payload.email || !payload.docNumber) {
      registrationResult.textContent = "Email & nomor dokumen wajib diisi";
      return;
    }

    try {
      const result = await requestWithSession(
        endpoints.legal.docsRegister,
        { method: "POST", body: payload }
      );

      registrationResult.textContent =
        `Registrasi berhasil (${result.id || "-"})`;
    } catch (err) {
      console.error(err);
      registrationResult.textContent = "Registrasi gagal";
    }
  });
}

/* =========================
   INIT
========================= */
renderLegend();
renderBlankTemplateList(document.getElementById("templateDownloads"));
loadWhoAmI();
loadOverview();
