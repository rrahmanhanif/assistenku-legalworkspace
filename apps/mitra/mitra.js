import { supabase } from "../shared/supabase.js";

const activeSpl = {
  id: "SPL-2024-001",
  status: "ACTIVE",
  hash: "3ac4...9f1a",
  privy: "sent"
};

let workLogs = [
  { ts: "2024-09-01 07:50", action: "Check-in lokasi", hash: "-", status: "ACTIVE" },
  { ts: "2024-09-01 09:10", action: "Isi kinerja harian (DRAFT)", hash: "-", status: "DRAFT" },
  { ts: "2024-09-01 10:05", action: "Upload bukti pekerjaan", hash: "-", status: "ACTIVE" }
];

const statusLabels = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  FINAL: "Final",
  LOCKED: "Locked"
};

function renderLegend() {
  const container = document.getElementById("statusLegend");
  container.innerHTML = Object.keys(statusLabels)
    .map((key) => `<span class="pill ${key.toLowerCase()}">${key}</span>`)
    .join("");
}

function renderLogs() {
  const tbody = document.querySelector("#logTable tbody");
  tbody.innerHTML = "";
  workLogs.forEach((log) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${log.ts}</td>
      <td>${log.action}</td>
      <td class="hash">${log.hash}</td>
    `;
    tbody.appendChild(row);
  });
}

function setSummary() {
  document.getElementById("activeSpl").innerText = `${activeSpl.id} — ${activeSpl.status}`;
  document.getElementById("signState").innerText = activeSpl.privy.toUpperCase();
}

function setLatestLog(log) {
  const panel = document.getElementById("latestLog");
  if (!log) {
    panel.innerHTML = "";
    return;
  }
  document.getElementById("lastStatus").innerText = `${log.status} • ${log.ts}`;
  panel.innerHTML = `
    <div class="doc-title">${log.action}</div>
    <p class="muted">Hash: ${log.hash}</p>
    <span class="pill ${log.status.toLowerCase()}">${statusLabels[log.status] || log.status}</span>
  `;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function persistWorkLog(payload) {
  if (!supabase) return;
  await supabase.from("daily_work_logs").upsert(payload);
}

function hydrate() {
  renderLegend();
  renderLogs();
  setSummary();
  setLatestLog(workLogs[0]);
  document.getElementById("workDate").value = today();
}

function attachEvents() {
  document.getElementById("btnRefresh").addEventListener("click", hydrate);

  document.getElementById("btnSave").addEventListener("click", async () => {
    const desc = document.getElementById("description").value.trim();
    const ts = `${document.getElementById("workDate").value} 09:00`;

    const newLog = { ts, action: desc || "Draft kinerja", hash: "-", status: "DRAFT" };
    workLogs.unshift(newLog);

    await persistWorkLog({ description: desc, status: "DRAFT", work_date: ts });

    renderLogs();
    setLatestLog(newLog);
    document.getElementById("lastStatus").innerText = "DRAFT tersimpan";
  });

  document.getElementById("btnLock").addEventListener("click", async () => {
    const desc = document.getElementById("description").value.trim() || "Kinerja dikirim";
    const ts = `${document.getElementById("workDate").value} 10:00`;
    const hash = "3ac4...9f1a";

    const newLog = { ts, action: `${desc} (LOCKED)`, hash, status: "LOCKED" };
    workLogs.unshift(newLog);

    await persistWorkLog({ description: desc, status: "LOCKED", work_date: ts, hash });

    renderLogs();
    setLatestLog(newLog);
    document.getElementById("lastStatus").innerText = "LOCKED & dikirim ke Client";
  });

  document.getElementById("btnSign").addEventListener("click", () => {
    activeSpl.privy = "sent";
    setSummary();
    alert("Link tanda tangan PrivyID dikirim ke Client & Mitra.");
  });

  document.getElementById("btnDownload").addEventListener("click", () => {
    alert("PDF final siap diunduh dan diarsip legal.");
  });

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    if (supabase?.auth) {
      await supabase.auth.signOut();
    }
    window.location.href = "/apps/login/";
  });
}

hydrate();
attachEvents();
