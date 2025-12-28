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
  container.innerHTML = Object.keys(statusLabels)
    .map((key) => `<span class="pill ${key.toLowerCase()}">${key}</span>`)
    .join("");
}

function setSummary() {
  const statusEl = document.getElementById("splStatus");
  const hashEl = document.getElementById("splHash");
  const privyEl = document.getElementById("privyStatus");

  if (statusEl) statusEl.innerText = activeSpl.status;
  if (hashEl) hashEl.innerText = activeSpl.hash;
  if (privyEl) privyEl.innerText = activeSpl.privy;
}

function setLatestLog(log) {
  const latestEl = document.getElementById("latestLog");
  if (!latestEl) return;
  latestEl.innerHTML = `
    <div><strong>${log.action}</strong></div>
    <div class="muted">${log.ts} • Hash: ${log.hash} • Status: ${log.status}</div>
  `;
}

function renderLogs() {
  const container = document.getElementById("workLogList");
  if (!container) return;

  container.innerHTML = workLogs
    .map(
      (l) => `
      <div class="card">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <div><strong>${l.action}</strong></div>
            <div class="muted">${l.ts} • Hash: ${l.hash}</div>
          </div>
          <div><span class="pill ${String(l.status).toLowerCase()}">${l.status}</span></div>
        </div>
      </div>
    `
    )
    .join("");
}

async function persistWorkLog(payload) {
  // Catatan: bagian ini saya biarkan sesuai arsitektur Anda.
  // Jika Anda masih simpan ke Supabase, implementasinya bisa tetap memakai `supabase`.
  // Jika sudah migrasi penuh, kita ganti ke endpoint/Firebase.
  return payload;
}

function hydrate() {
  renderLegend();
  setSummary();
  renderLogs();
  setLatestLog(workLogs[0]);
}

function attachEvents() {
  document.getElementById("btnSubmit")?.addEventListener("click", async () => {
    const desc = document.getElementById("description").value.trim() || "Kinerja dikirim";
    const ts = `${document.getElementById("workDate").value} 10:00`;
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
