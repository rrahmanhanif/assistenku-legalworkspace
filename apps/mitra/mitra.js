import { signOutFirebase } from "../shared/firebase.js";
import { apiFetch } from "/shared/apiClient.js";
import { requireRole } from "/shared/guards.js";
import { clearPortalSession, loadPortalSession } from "/shared/session.js";

requireRole("MITRA");

const workStatus = document.getElementById("workStatus");
const evidenceCount = document.getElementById("evidenceCount");
const errorBox = document.getElementById("errorBox");
const loadingIndicator = document.getElementById("loadingIndicator");
const worklogsList = document.getElementById("worklogsList");

const docNumberInput = document.getElementById("docNumberInput");
const worklogDate = document.getElementById("worklogDate");
const worklogHours = document.getElementById("worklogHours");
const worklogNotes = document.getElementById("worklogNotes");
const evidenceFileInput = document.getElementById("evidenceFile");

const btnRefresh = document.getElementById("btnRefresh");
const btnLoadWorklogs = document.getElementById("btnLoadWorklogs");
const btnSaveDraft = document.getElementById("btnSaveDraft");
const btnUploadEvidence = document.getElementById("btnUploadEvidence");
const btnSubmit = document.getElementById("btnSubmit");
const btnLock = document.getElementById("btnLock");

let worklogs = [];
let currentStatus = null;

function setLoading(isLoading, message = "Memproses...") {
  if (!loadingIndicator) return;
  loadingIndicator.textContent = message;
  loadingIndicator.style.display = isLoading ? "block" : "none";
}

function setError(message = "") {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.style.display = message ? "block" : "none";
}

function formatDateInput(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getFormPayload() {
  return {
    docType: "SPL",
    docNumber: docNumberInput?.value.trim() || "",
    date: worklogDate?.value || "",
    hours: Number(worklogHours?.value || 0),
    notes: worklogNotes?.value.trim() || ""
  };
}

function updateLockState(status) {
  const locked = status === "LOCKED_BY_SYSTEM" || status === "FINAL";

  if (btnSaveDraft) btnSaveDraft.disabled = locked;
  if (btnUploadEvidence) btnUploadEvidence.disabled = locked;
  if (evidenceFileInput) evidenceFileInput.disabled = locked;
  if (btnSubmit) btnSubmit.disabled = locked;
  if (btnLock) btnLock.disabled = locked;
}

function renderWorklogs() {
  if (!worklogsList) return;

  if (!worklogs.length) {
    worklogsList.innerHTML = '<p class="muted">Belum ada worklog.</p>';
    return;
  }

  worklogsList.innerHTML = worklogs
    .map((log) => {
      const evidenceItems = (log.evidence || []).map((item) => {
        const filename = item.filename || item.name || "Bukti";
        const objectPath = item.objectPath || item.path || "";
        return `
          <li>
            <span>${filename}</span>
            <button class="secondary" data-action="view-evidence" data-path="${objectPath}">Lihat</button>
          </li>
        `;
      });

      return `
        <div class="card" style="margin-bottom: 12px;">
          <div class="row" style="justify-content: space-between; align-items: center;">
            <div>
              <strong>${log.date || "-"}</strong> • ${log.hours ?? "-"} jam
              <div class="muted">${log.notes || "-"}</div>
            </div>
            <span class="pill ${String(log.status || "draft").toLowerCase()}">${log.status || "DRAFT"}</span>
          </div>
          <div style="margin-top: 8px;">
            <div class="muted">Evidence:</div>
            <ul>${evidenceItems.length ? evidenceItems.join("") : '<li class="muted">Belum ada bukti</li>'}</ul>
          </div>
        </div>
      `;
    })
    .join("");
}

async function loadWorklogs() {
  setError("");
  setLoading(true, "Memuat worklogs...");

  const docNumber = docNumberInput?.value.trim();
  const query = docNumber ? `?docNumber=${encodeURIComponent(docNumber)}` : "";

  try {
    const data = await apiFetch(`/api/mitra/worklogs${query}`, { method: "GET" });
    worklogs = data?.worklogs || data?.logs || [];
    currentStatus = data?.status || worklogs?.[0]?.status || null;

    if (workStatus) workStatus.textContent = currentStatus || "-";
    if (evidenceCount) {
      const totalEvidence = worklogs.reduce((sum, log) => sum + (log?.evidence?.length || 0), 0);
      evidenceCount.textContent = String(totalEvidence);
    }

    updateLockState(currentStatus);
    renderWorklogs();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal memuat worklogs.");
    worklogs = [];
    if (workStatus) workStatus.textContent = "Gagal";
    if (evidenceCount) evidenceCount.textContent = "0";
    renderWorklogs();
  } finally {
    setLoading(false);
  }
}

async function saveDraft(event) {
  event.preventDefault();
  setError("");

  const payload = getFormPayload();
  if (!payload.docNumber || !payload.date) {
    setError("Nomor dokumen dan tanggal wajib diisi.");
    return;
  }

  try {
    setLoading(true, "Menyimpan draft...");
    await apiFetch("/api/mitra/worklogs/create-or-update", {
      method: "POST",
      body: payload
    });
    await loadWorklogs();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal menyimpan draft.");
  } finally {
    setLoading(false);
  }
}

async function uploadEvidence() {
  setError("");
  const payload = getFormPayload();

  if (!payload.docNumber || !payload.date) {
    setError("Nomor dokumen dan tanggal wajib diisi sebelum upload bukti.");
    return;
  }

  const files = Array.from(evidenceFileInput?.files || []);
  if (!files.length) {
    setError("Pilih file bukti terlebih dahulu.");
    return;
  }

  if (currentStatus === "LOCKED_BY_SYSTEM" || currentStatus === "FINAL") {
    setError("Worklog sudah terkunci. Upload bukti tidak diperbolehkan.");
    return;
  }

  try {
    setLoading(true, "Mengunggah bukti...");

    for (const file of files) {
      const requestBody = {
        docType: "SPL",
        docNumber: payload.docNumber,
        date: payload.date,
        filename: file.name,
        contentType: file.type || "application/octet-stream"
      };

      const uploadData = await apiFetch("/api/mitra/worklogs/evidence/upload-url", {
        method: "POST",
        body: requestBody
      });

      const signedUrl = uploadData?.signedUrl;
      const objectPath = uploadData?.objectPath;

      if (!signedUrl || !objectPath) {
        throw new Error("Signed URL tidak tersedia dari API.");
      }

      const putResponse = await fetch(signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream"
        },
        body: file
      });

      if (!putResponse.ok) {
        throw new Error("Gagal upload file ke storage.");
      }

      await apiFetch("/api/mitra/worklogs/evidence/attach", {
        method: "POST",
        body: {
          docNumber: payload.docNumber,
          date: payload.date,
          objectPath,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size
        }
      });
    }

    evidenceFileInput.value = "";
    await loadWorklogs();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal upload bukti.");
  } finally {
    setLoading(false);
  }
}

async function submitWorklog() {
  setError("");
  const payload = getFormPayload();

  if (!payload.docNumber || !payload.date) {
    setError("Nomor dokumen dan tanggal wajib diisi.");
    return;
  }

  try {
    setLoading(true, "Mengirim worklog...");
    await apiFetch("/api/mitra/worklogs/submit", {
      method: "POST",
      body: {
        docType: "SPL",
        docNumber: payload.docNumber,
        date: payload.date
      }
    });
    await loadWorklogs();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal submit worklog.");
  } finally {
    setLoading(false);
  }
}

async function lockWorklog() {
  setError("");
  const payload = getFormPayload();

  if (!payload.docNumber || !payload.date) {
    setError("Nomor dokumen dan tanggal wajib diisi.");
    return;
  }

  try {
    setLoading(true, "Mengunci worklog...");
    await apiFetch("/api/mitra/worklogs/lock", {
      method: "POST",
      body: {
        docType: "SPL",
        docNumber: payload.docNumber,
        date: payload.date
      }
    });
    await loadWorklogs();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal mengunci worklog.");
  } finally {
    setLoading(false);
  }
}

async function viewEvidence(objectPath) {
  if (!objectPath) return;

  try {
    setLoading(true, "Menyiapkan bukti...");
    const data = await apiFetch(`/api/evidence/view-url?objectPath=${encodeURIComponent(objectPath)}`, {
      method: "GET"
    });
    const signedUrl = data?.signedUrl || data?.url;
    if (!signedUrl) throw new Error("Signed URL tidak tersedia.");
    window.open(signedUrl, "_blank");
  } catch (err) {
    console.error(err);
    setError(err?.message || "Gagal membuka bukti.");
  } finally {
    setLoading(false);
  }
}

function bindActions() {
  btnRefresh?.addEventListener("click", loadWorklogs);
  btnLoadWorklogs?.addEventListener("click", loadWorklogs);
  btnUploadEvidence?.addEventListener("click", uploadEvidence);
  btnSubmit?.addEventListener("click", submitWorklog);
  btnLock?.addEventListener("click", lockWorklog);

  document.getElementById("worklogForm")?.addEventListener("submit", saveDraft);

  worklogsList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='view-evidence']");
    if (!button) return;
    viewEvidence(button.dataset.path);
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    clearPortalSession();
    await signOutFirebase();
    window.location.href = "/apps/login/";
  });
}

function initDefaults() {
  const session = loadPortalSession();
  if (session?.docNumber && docNumberInput) {
    docNumberInput.value = session.docNumber;
  }
  if (worklogDate) {
    worklogDate.value = formatDateInput(new Date());
  }
}

bindActions();
initDefaults();
loadWorklogs();
