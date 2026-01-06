import { signOutFirebase } from "../shared/firebase.js";
import { apiFetch, apiWhoAmI } from "/assets/apiClient.js";

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
    time: new Date().toLocaleString("id-ID"),
    action,
    hash,
  });
}

function renderSpls() {
  const tbody = document.querySelector("#splTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!spls.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="6" class="muted">Belum ada SPL dari API.</td>`;
    tbody.appendChild(row);
    return;
  }

  spls.forEach((spl) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${spl.id || "-"}</td>
      <td>${spl.client || "-"}</td>
      <td>${spl.mitra || "-"}</td>
      <td><span class="${statusChipClass(spl.status)}">${formatStatus(spl.status)}</span></td>
      <td>${(spl.documents || []).join(", ")}</td>
      <td class="mono">${spl.hash || "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderPipeline() {
  const list = document.getElementById("pipelineList");
  if (!list) return;

  list.innerHTML = "";

  if (!documentPipeline.length) {
    list.innerHTML = `<li class="muted">Tahapan pipeline belum tersedia.</li>`;
    return;
  }

  documentPipeline.forEach((step) => {
    const li = document.createElement("li");
    li.className = "pipeline-step";
    li.innerHTML = `
      <div class="row" style="justify-content: space-between; align-items: center;">
        <div>
          <div class="step-title">${step.title || "-"}</div>
          <div class="muted">${step.description || ""}</div>
        </div>
        <span class="chip ${step.status?.toLowerCase() || ""}">${step.status || "PENDING"}</span>
      </div>
    `;
    list.appendChild(li);
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

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/";
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
    const who = await apiWhoAmI();
    appendAuditEntry(`Autentikasi berhasil untuk ${who?.email || "-"}`);
  } catch (err) {
    console.error(err);
    appendAuditEntry("Gagal mengambil identitas", err?.message || "-");
  }

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
