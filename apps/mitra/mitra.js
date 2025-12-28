import { supabase } from "../shared/supabase.js";
import { signOutFirebase } from "../shared/firebase.js";

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
  if (!container) return;
  container.innerHTML = Object.keys(statusLabels)
    .map((key) => `<span class="pill ${key.toLowerCase()}">${key}</span>`)
    .join("");
}

function renderLogs() {
  const list = document.getElementById("logList");
  if (!list) return;
  list.innerHTML = "";
  workLogs.forEach((log) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>${log.ts}</span>
      <span>${log.action}</span>
      <span class="pill ${log.status.toLowerCase()}">${log.status}</span>
    `;
    list.appendChild(li);
  });
}

function setLatestLog(log) {
  const el = document.getElementById("lastLog");
  if (!el) return;
  el.textContent = `${log.ts} — ${log.action}`;
}

function setSummary() {
  const el = document.getElementById("splSummary");
  if (!el) return;
  el.textContent = `${activeSpl.id} • ${activeSpl.status.toUpperCase()} • Privy: ${activeSpl.privy}`;
}

async function persistWorkLog(payload) {
  // placeholder: simpan ke backend (Supabase / API)
  return payload;
}

function hydrate() {
  renderLegend();
  renderLogs();
  setSummary();
}

function attachEvents() {
  document.getElementById("btnSubmit")?.addEventListener("click", async () => {
    const desc = document.getElementById("description")?.value.trim() || "Kinerja dikirim";
    const date = document.getElementById("workDate")?.value || "2024-09-01";
    const ts = `${date} 10:00`;
    const hash = "3ac4...9f1a";

    const newLog = { ts, action: `${desc} (LOCKED)`, hash, status: "LOCKED" };
    workLogs.unshift(newLog);

    await persistWorkLog({ description: desc, status: "LOCKED", work_date: ts, hash });

    renderLogs();
    setLatestLog(newLog);
    const lastStatus = document.getElementById("lastStatus");
    if (lastStatus) lastStatus.innerText = "LOCKED & dikirim ke Client";
  });

  document.getElementById("btnSign")?.addEventListener("click", () => {
    activeSpl.privy = "sent";
    setSummary();
    alert("Link tanda tangan PrivyID dikirim ke Client & Mitra.");
  });

  document.getElementById("btnDownload")?.addEventListener("click", () => {
    alert("PDF final siap diunduh dan diarsip legal.");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/apps/login/";
  });
}

hydrate();
attachEvents();
