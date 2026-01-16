import { signOutFirebase } from "../shared/firebase.js";
import { apiFetch } from "/shared/apiClient.js";
import { clearPortalSession } from "/shared/session.js";

let spls = [];
let documentPipeline = [];
let auditLog = [];

function formatStatus(status) {
  const map = {
    ACTIVE: "Aktif",
    FINAL: "Final",
    LOCKED: "Terkunci",
    DRAFT: "Draft",
    PAID: "Dibayar",
  };
  return map[status] || status || "-";
}

function statusChipClass(status) {
  if (status === "FINAL") return "chip chip-final";
  if (status === "LOCKED") return "chip chip-lock";
  if (status === "ACTIVE") return "chip chip-active";
  return "chip chip-draft";
}

function appendAuditEntry(action, hash = "-") {
  auditLog.unshift({
    action,
    hash,
    time: new Date().toLocaleString("id-ID"),
  });
}

function renderSpls() {
  const container = document.getElementById("splList");
  if (!container) return;

  container.innerHTML = "";

  if (!spls.length) {
    container.innerHTML = `<p class="muted">Belum ada SPL.</p>`;
    return;
  }

  spls.forEach((spl) => {
    const row = document.createElement("div");
    row.className = "spl-row";
    row.innerHTML = `
      <div>
        <strong>${spl.number || "-"}</strong>
        <span class="${statusChipClass(spl.status)}">
          ${formatStatus(spl.status)}
        </span>
      </div>
      <div class="muted">${spl.period || "-"}</div>
    `;
    container.appendChild(row);
  });
}

function renderPipeline() {
  const container = document.getElementById("pipeline");
  if (!container) return;

  container.innerHTML = "";

  if (!documentPipeline.length) {
    container.innerHTML = `<p class="muted">Pipeline kosong.</p>`;
    return;
  }

  documentPipeline.forEach((item) => {
    const row = document.createElement("div");
    row.className = "pipeline-row";
    row.innerHTML = `
      <div>
        <strong>${item.name || "-"}</strong>
        <span class="muted">${formatStatus(item.status)}</span>
      </div>
      <div class="mono muted">${item.hash || "-"}</div>
    `;
    container.appendChild(row);
  });
}

function renderAuditLog() {
  const container = document.getElementById("auditLog");
  if (!container) return;

  container.innerHTML = "";

  if (!auditLog.length) {
    container.innerHTML = `<p class="muted">Belum ada audit trail.</p>`;
    return;
  }

  auditLog.forEach((item) => {
    const row = document.createElement("div");
    row.className = "audit-row";
    row.innerHTML = `
      <div><strong>${item.action}</strong> <span class="muted">${item.time}</span></div>
      <div class="mono muted">${item.hash || "-"}</div>
    `;
    container.appendChild(row);
  });
}

function bindActions() {
  document.getElementById("btnSendToPrivy")?.addEventListener("click", () => {
    appendAuditEntry("Kirim ke PrivyID", "pending");
    renderAuditLog();
    alert("Permintaan dikirim ke API Privy melalui backend terpusat.");
  });

  document.getElementById("btnRefresh")?.addEventListener("click", () => loadData());

  document.getElementById("btnLoadInvoices")?.addEventListener("click", () => loadData());

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    clearPortalSession();
    await signOutFirebase();
    window.location.href = "/apps/login/";
  });
}

async function loadData() {
  const statusEl = document.getElementById("splStatus");
  const privyStatus = document.getElementById("privyStatus");
  const evidenceStatus = document.getElementById("evidenceStatus");

  if (statusEl) statusEl.textContent = "Memuat...";
  if (privyStatus) privyStatus.textContent = "Memuat...";
  if (evidenceStatus) evidenceStatus.textContent = "Memuat...";

  try {
    const data = await apiFetch("/api/client/invoices/list", { method: "GET" });

    spls = data?.spls || [];
    documentPipeline = data?.pipeline || [];
    auditLog = data?.audit || auditLog;

    if (statusEl) statusEl.textContent = data?.latestStatus || "-";
    if (privyStatus) privyStatus.textContent = data?.privyStatus || "-";
    if (evidenceStatus) evidenceStatus.textContent = data?.evidenceStatus || "-";
  } catch (err) {
    console.error(err);

    if (statusEl) statusEl.textContent = "Gagal memuat";
    if (privyStatus) privyStatus.textContent = "Gagal";
    if (evidenceStatus) evidenceStatus.textContent = "Gagal";
  }

  renderSpls();
  renderPipeline();
  renderAuditLog();
}

bindActions();
loadData();
