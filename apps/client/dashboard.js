import { requirePortalAccess, clearPortalSession } from "../shared/access.js";
import { signOutFirebase } from "../shared/firebase.js";

// 🔐 Guard CLIENT
requirePortalAccess("CLIENT", "IPL");

/* =========================
   MOCK DATA
========================= */

const sampleSpls = [
  {
    id: "SPL-2024-001",
    client: "PT Alfa Energi",
    mitra: "CV Mitra Kontraktual",
    status: "FINAL",
    documents: ["Perjanjian Induk Layanan", "SPL", "NDA", "Quotation"],
    hash: "3ac4...9f1a",
    updated_at: "2024-09-01 10:22"
  }
];

const documentPipeline = [
  { step: "Draft", status: "done" },
  { step: "Review", status: "done" },
  { step: "Approval", status: "active" },
  { step: "PrivyID", status: "pending" },
  { step: "Final PDF", status: "pending" }
];

/* =========================
   RENDER
========================= */

function hydrate() {
  const list = document.getElementById("splList");
  if (!list) return;

  list.innerHTML = sampleSpls
    .map(
      (s) => `
    <li>
      <strong>${s.id}</strong> — ${s.client} / ${s.mitra}
      <br>Status: ${s.status}
    </li>`
    )
    .join("");
}

/* =========================
   EVENTS
========================= */

function attachEvents() {
  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    try {
      await signOutFirebase();
    } catch (err) {
      console.warn("Firebase signOut gagal, lanjut logout", err);
    } finally {
      clearPortalSession();
      window.location.href = "/";
    }
  });
}

/* =========================
   INIT
========================= */

hydrate();
attachEvents();
