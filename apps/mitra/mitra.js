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

function setSummary() {
  const splId = document.getElementById("splId");
  const splStatus = document.getElementById("splStatus");
  const splHash = document.getElementById("splHash");
  const privyStatus = document.getElementById("privyStatus");

  if (splId) splId.textContent = activeSpl.id;
  if (splStatus) splStatus.textContent = activeSpl.status;
  if (splHash) splHash.textContent = activeSpl.hash;
  if (privyStatus) privyStatus.textContent = activeSpl.privy;
}

function renderLogs() {
  const tbody = document.querySelector("#logTable tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  workLogs.forEach((log) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${log.ts}</td>
      <td>${log.action}</td>
      <td>${log.hash}</td>
      <td><span class="pill ${String(log.status).toLowerCase()}">${log.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function setLatestLog(log) {
  const el = document.getElementById("lastLog");
  if (!el) return;
  el.textContent = `${log.ts} — ${log.action}`;
}

async function persistWorkLog(payload) {
  // Demo: Anda masih bisa pakai supabase untuk sink data/audit sesuai rancangan.
  // Jika nanti benar-benar dimatikan, fungsi ini tinggal diganti.
  try {
    if (!supabase) return;
    // Contoh sink (opsional): supabase.from("work_logs").insert(payload);
  } catch (err) {
    console.error("persistWorkLog gagal", err);
  }
}

function hydrate() {
  renderLegend();
  setSummary();
  renderLogs();
  if (workLogs?.[0]) setLatestLog(workLogs[0]);
}

function attachEvents() {
  document.getElementById("btnSubmit")?.addEventListener("click", async () => {
    const desc = document.getElementById("description")?.value.trim() || "Kinerja dikirim";
    const workDate = document.getElementById("workDate")?.value || "2024-09-01";
    const ts = `${workDate} 10:00`;
    const hash = activeSpl.hash || "3ac4...9f1a";

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
