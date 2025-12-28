import { signOutFirebase } from "../shared/firebase.js";

const sampleSpls = [
  {
    id: "SPL-2024-001",
    client: "PT Alfa Energi",
    mitra: "CV Mitra Kontraktual",
    status: "FINAL",
    documents: ["Perjanjian Induk Layanan", "SPL", "NDA", "Quotation"],
    hash: "3ac4...9f1a",
    privy: { status: "sent", actors: ["Client", "Mitra"] },
    updated_at: "2024-09-01 10:22"
  },
  {
    id: "SPL-2024-002",
    client: "PT Beta Logistik",
    mitra: "PT Sukses Bersama",
    status: "ACTIVE",
    documents: ["Perjanjian Kemitraan", "Addendum IPL"],
    hash: "-",
    privy: { status: "draft", actors: ["Client"] },
    updated_at: "2024-09-01 09:10"
  }
];

const documentPipeline = [
  {
    title: "Generate Dokumen",
    description: "SPL disusun dari template + input data proyek.",
    status: "DONE"
  },
  {
    title: "Audit Hash",
    description: "Hash dokumen dan timestamp dicatat untuk legal-grade audit.",
    status: "DONE"
  },
  {
    title: "Kunci Dokumen",
    description: "Status LOCKED menandai dokumen tidak bisa diubah lagi.",
    status: "READY"
  },
  {
    title: "Kirim PrivyID",
    description: "Dokumen dikirim untuk ditandatangani pihak terkait.",
    status: "READY"
  },
  {
    title: "Final PDF",
    description: "PDF final diunduh dan tersimpan sebagai arsip.",
    status: "PENDING"
  }
];

const auditLog = [];

function formatStatus(status) {
  const map = {
    ACTIVE: "Aktif",
    FINAL: "Final",
    LOCKED: "Terkunci",
    DRAFT: "Draft"
  };
  return map[status] || status;
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
    hash
  });
}

async function persistSplStatus(splId, status) {
  // TODO (next step):
  // Ganti ini dengan persist sungguhan (Supabase RPC / REST endpoint / Firebase callable / dsb).
  return { ok: true, splId, status };
}

function renderSplTable() {
  const tableBody = document.querySelector("#splTable tbody");
  if (!tableBody) return;

  tableBody.innerHTML = sampleSpls
    .map((spl) => {
      return `
      <tr>
        <td><strong>${spl.id}</strong><br><span class="muted">${spl.client}</span></td>
        <td>${spl.mitra}</td>
        <td><span class="${statusChipClass(spl.status)}">${formatStatus(spl.status)}</span></td>
        <td><span class="muted">${spl.hash}</span></td>
        <td><span class="muted">${spl.updated_at}</span></td>
        <td>
          <button class="secondary" data-action="open" data-id="${spl.id}">Buka</button>
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderPipeline() {
  const container = document.getElementById("pipeline");
  if (!container) return;

  container.innerHTML = documentPipeline
    .map((step) => {
      const badge =
        step.status === "DONE"
          ? `<span class="chip chip-final">DONE</span>`
          : step.status === "READY"
            ? `<span class="chip chip-active">READY</span>`
            : `<span class="chip chip-draft">PENDING</span>`;

      return `
      <div class="card">
        <div class="row" style="justify-content: space-between; align-items: center;">
          <div>
            <strong>${step.title}</strong>
            <div class="muted">${step.description}</div>
          </div>
          <div>${badge}</div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderAuditLog() {
  const container = document.getElementById("auditLog");
  if (!container) return;

  if (auditLog.length === 0) {
    container.innerHTML = `<p class="muted">Belum ada aktivitas audit.</p>`;
    return;
  }

  container.innerHTML = auditLog
    .map((entry) => {
      return `
      <div class="card">
        <div><strong>${entry.action}</strong></div>
        <div class="muted">${entry.time} • Hash: ${entry.hash}</div>
      </div>
    `;
    })
    .join("");
}

function hydrate() {
  renderSplTable();
  renderPipeline();
  renderAuditLog();
}

function onClick(id, handler) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", handler);
}

function attachEvents() {
  onClick("btnGenerate", async () => {
    appendAuditEntry("Generate dokumen SPL dari template", sampleSpls[0].hash);
    hydrate();
  });

  onClick("btnHash", async () => {
    sampleSpls[0].hash = "3ac4...9f1a";
    appendAuditEntry("Hash dokumen dibuat", sampleSpls[0].hash);
    hydrate();
  });

  onClick("btnSendPrivy", async () => {
    appendAuditEntry("Dokumen dikirim ke PrivyID", sampleSpls[0].hash);
    hydrate();
  });

  const signaturePanel = document.getElementById("signaturePanel");
  if (signaturePanel) {
    signaturePanel.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      const action = button.dataset.action;
      if (action === "remind") {
        alert("Reminder penandatanganan dikirim ke semua penandatangan.");
      }
      if (action === "download") {
        alert("PDF final diunduh untuk arsip legal.");
      }
    });
  }

  onClick("btnLock", async () => {
    const spl = sampleSpls[0];
    spl.status = "LOCKED";
    appendAuditEntry(`SPL ${spl.id} dikunci (LOCKED)`, spl.hash);
    await persistSplStatus(spl.id, spl.status);
    hydrate();
  });

  onClick("logoutBtn", async () => {
    await signOutFirebase();
    window.location.href = "/apps/login/";
  });
}

hydrate();
attachEvents();
