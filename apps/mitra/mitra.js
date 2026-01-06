import { signOutFirebase } from "../shared/firebase.js";
import { apiFetch, apiWhoAmI } from "/assets/apiClient.js";

let activeSpl = {};
let workLogs = [];

const statusLabels = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FINAL: "Final",
  LOCKED: "Locked",
};

function renderLegend() {
  const container = document.getElementById("statusLegend");
  if (!container) return;

  container.innerHTML = Object.keys(statusLabels)
    .map((key) => `<span class="pill ${key.toLowerCase()}">${key}</span>`)
    .join("");
}

function setSummary() {
  const statusEl = document.getElementById("splStatus");
  const hashEl = document.getElementById("splHash");
  const privyEl = document.getElementById("privyStatus");

  if (statusEl) statusEl.innerText = activeSpl.status || "-";
  if (hashEl) hashEl.innerText = activeSpl.hash || "-";
  if (privyEl) privyEl.innerText = activeSpl.privy || "-";
}

function setLatestLog(log) {
  const latestEl = document.getElementById("latestLog");
  if (!latestEl) return;

  latestEl.innerHTML = `
    <div><strong>${log?.action || "Belum ada log"}</strong></div>
    <div class="muted">${log?.ts || "-"} • Hash: ${log?.hash || "-"} • Status: ${log?.status || "-"}</div>
  `;
}

function renderLogs() {
  const container = document.getElementById("workLogList");
  if (!container) return;

  if (!workLogs.length) {
    container.innerHTML = `<div class="muted">Belum ada log kinerja yang diambil dari API.</div>`;
    return;
  }

  container.innerHTML = workLogs
    .map(
      (l) => `
      <div class="card">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <div><strong>${l.action || "-"}</strong></div>
            <div class="muted">${l.ts || "-"} • Hash: ${l.hash || "-"}</div>
          </div>
          <span class="pill ${l.status?.toLowerCase() || ""}">${l.status || "-"}</span>
        </div>
      </div>`
    )
    .join("");
}

function bindActions() {
  document.getElementById("btnRefresh")?.addEventListener("click", loadData);

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/";
  });
}

async function loadData() {
  try {
    const who = await apiWhoAmI();
    document.getElementById("welcomeName")?.replaceChildren(`Halo, ${who?.email || "Mitra"}`);
  } catch (err) {
    console.error(err);
  }

  try {
    const data = await apiFetch("/api/mitra/worklogs", { method: "GET" });
    activeSpl = data?.activeSpl || {};
    workLogs = data?.logs || [];
  } catch (err) {
    console.error(err);
    activeSpl = {};
    workLogs = [];
  }

  setSummary();
  setLatestLog(workLogs[0]);
  renderLogs();
}

renderLegend();
bindActions();
loadData();
