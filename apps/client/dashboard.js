import { supabase } from "../shared/supabase.js";
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
  { step: "Draft", status: "done" },
  { step: "Review", status: "done" },
  { step: "Approval", status: "active" },
  { step: "PrivyID", status: "pending" },
  { step: "Final PDF", status: "pending" }
];

function hydrate() {
  // existing hydrate logic (tetap)
}

async function persistSplStatus(id, status) {
  // existing persistence logic (tetap)
}

function appendAuditEntry(message, hash) {
  // existing audit logic (tetap)
}

function attachEvents() {
  document.getElementById("btnSendPrivy")?.addEventListener("click", () => {
    appendAuditEntry("Dokumen dikirim ke PrivyID", sampleSpls[0].hash);
    hydrate();
  });

  document.getElementById("signaturePanel")?.addEventListener("click", (event) => {
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

  document.getElementById("btnLock")?.addEventListener("click", async () => {
    const spl = sampleSpls[0];
    spl.status = "LOCKED";
    appendAuditEntry(`SPL ${spl.id} dikunci (LOCKED)`, spl.hash);
    await persistSplStatus(spl.id, spl.status);
    hydrate();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOutFirebase();
    window.location.href = "/apps/login/";
  });
}

hydrate();
attachEvents();
