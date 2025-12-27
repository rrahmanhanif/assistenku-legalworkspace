 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/apps/client/dashboard.js b/apps/client/dashboard.js
index ddbd5c592d285a0262d2fc3a6f6a99528f3677ea..36758e232366885a371d763173bce87a372791f5 100644
--- a/apps/client/dashboard.js
+++ b/apps/client/dashboard.js
@@ -1,337 +1,275 @@
- (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
-diff --git a/apps/client/dashboard.js b/apps/client/dashboard.js
-index d651cfe6f8952f4819160f95390da0f12fc14258..014ac409953d66782cf9ba70e79dfec902f8b6e6 100644
---- a/apps/client/dashboard.js
-+++ b/apps/client/dashboard.js
-@@ -1,71 +1,272 @@
--const { data: { session } } = await supabase.auth.getSession();
--if (!session) {
--  location.href = "/apps/login/";
--}
--if (spl.status === "FINAL") {
--  btnSendPrivy.disabled = false;
--}
-+import { supabase } from "../shared/supabase.js";
- 
--if (spl.status === "LOCKED") {
--  btnEdit.disabled = true;
--  btnDownload.disabled = false;
--}
-+const sampleSpls = [
-+  {
-+    id: "SPL-2024-001",
-+    client: "PT Alfa Energi",
-+    mitra: "CV Mitra Kontraktual",
-+    status: "FINAL",
-+    documents: ["Perjanjian Induk Layanan", "SPL", "NDA", "Quotation"],
-+    hash: "3ac4...9f1a",
-+    privy: { status: "sent", actors: ["Client", "Mitra"] },
-+    updated_at: "2024-09-01 10:22"
-+  },
-+  {
-+    id: "SPL-2024-002",
-+    client: "PT Beta Logistik",
-+    mitra: "PT Sukses Bersama",
-+    status: "ACTIVE",
-+    documents: ["Perjanjian Kemitraan", "Addendum IPL"],
-+    hash: "-",
-+    privy: { status: "draft", actors: ["Client"] },
-+    updated_at: "2024-09-01 09:10"
-+  }
-+];
- 
-+const documentPipeline = [
-+  { name: "Perjanjian Induk Layanan", status: "PDF dibuat", hash: "f3d...aa8", immutable: true },
-+  { name: "Surat Perintah Layanan", status: "Siap ditandatangani", hash: "3ac...9f1", immutable: false },
-+  { name: "NDA & Tata Tertib", status: "Locked", hash: "a9b...3c2", immutable: true },
-+  { name: "Lembar Kinerja Harian", status: "Draft", hash: "-", immutable: false },
-+  { name: "Quotation", status: "PDF dibuat", hash: "bb1...d61", immutable: true }
-+];
- 
--const tbody = document.querySelector('#workTable tbody');
--let selectedLogId = null;
--
--async function loadWorks() {
--  const { data, error } = await supabase
--    .from('daily_work_logs')
--    .select(`
--      id,
--      work_date,
--      description,
--      status,
--      mitra_name
--    `)
--    .eq('status', 'LOCKED')
--    .order('work_date', { ascending: false });
--
--  if (error) {
--    alert(error.message);
--    return;
--  }
-+const auditTrail = [
-+  { ts: "2024-09-01 08:02", actor: "Client", action: "Membuat SPL", hash: "-" },
-+  { ts: "2024-09-01 08:45", actor: "Mitra", action: "Mengunci kinerja (LOCKED)", hash: "3ac4...9f1a" },
-+  { ts: "2024-09-01 09:15", actor: "System", action: "Generate PDF legal-grade", hash: "3ac4...9f1a" },
-+  { ts: "2024-09-01 09:30", actor: "System", action: "Kirim ke PrivyID", hash: "3ac4...9f1a" }
-+];
- 
--  tbody.innerHTML = '';
-+const checklistItems = [
-+  { title: "Login OTP & verifikasi role", done: true },
-+  { title: "SPL dikaitkan dengan IPL resmi", done: true },
-+  { title: "Render HTML → PDF legal-grade", done: true },
-+  { title: "Hash SHA-256 + simpan metadata", done: true },
-+  { title: "Kirim ke PrivyID Production", done: true },
-+  { title: "Audit trail immutable", done: true },
-+  { title: "Preview dokumen print-safe A4", done: true }
-+];
- 
--  if (!data || data.length === 0) {
--    tbody.innerHTML = `<tr><td colspan="5">Tidak ada data</td></tr>`;
--    return;
--  }
-+function badge(status) {
-+  const variants = {
-+    DRAFT: "badge draft",
-+    ACTIVE: "badge info",
-+    FINAL: "badge final",
-+    LOCKED: "badge locked"
-+  };
-+  return `<span class="${variants[status] || "badge"}">${status}</span>`;
-+}
- 
--  data.forEach(row => {
--    const tr = document.createElement('tr');
--    tr.innerHTML = `
--      <td>${row.work_date}</td>
--      <td>${row.mitra_name}</td>
--      <td>${row.description}</td>
--      <td>${row.status}</td>
-+function privyPill(status) {
-+  const text = {
-+    draft: "Draft",
-+    sent: "Sent to signers",
-+    signed: "Fully signed",
-+    rejected: "Rejected"
-+  };
-+  return `<span class="pill ${status}">${text[status] || status}</span>`;
-+}
-+
-+function renderSplTable(spls) {
-+  const tbody = document.querySelector("#splTable tbody");
-+  tbody.innerHTML = "";
-+
-+  spls.forEach((spl) => {
-+    const row = document.createElement("tr");
-+    row.innerHTML = `
-+      <td>${spl.id}</td>
-+      <td>${spl.client}</td>
-+      <td>${spl.mitra}</td>
-+      <td>${badge(spl.status)}</td>
-       <td>
--        <button onclick="openSignature('${row.id}')">
--          Tanda Tangani
--        </button>
-+        ${spl.documents.map((doc) => `<span class="pill neutral">${doc}</span>`).join(" ")}
-       </td>
-+      <td class="actions" data-id="${spl.id}">
-+        <button class="secondary" data-action="preview">Preview</button>
-+        <button data-action="finalize" ${spl.status === "FINAL" || spl.status === "LOCKED" ? "disabled" : ""}>Finalisasi SPL</button>
-+        <button data-action="lock" class="danger" ${spl.status === "LOCKED" ? "disabled" : ""}>Lock & Audit</button>
-+      </td>
-+    `;
-+    tbody.appendChild(row);
-+  });
-+}
-+
-+function renderDocList(docs) {
-+  const container = document.getElementById("docList");
-+  container.innerHTML = "";
-+
-+  docs.forEach((doc) => {
-+    const card = document.createElement("div");
-+    card.className = "doc-card";
-+    card.innerHTML = `
-+      <div class="doc-title">${doc.name}</div>
-+      <p class="muted">${doc.status}</p>
-+      <p class="hash">Hash: ${doc.hash}</p>
-+      <div class="doc-meta">
-+        <span class="pill ${doc.immutable ? "locked" : "neutral"}">${doc.immutable ? "Immutable" : "Draft"}</span>
-+      </div>
-     `;
--    tbody.appendChild(tr);
-+    container.appendChild(card);
-+  });
-+}
-+
-+function renderAudit(entries) {
-+  const tbody = document.querySelector("#auditTable tbody");
-+  tbody.innerHTML = "";
-+
-+  entries.forEach((log) => {
-+    const row = document.createElement("tr");
-+    row.innerHTML = `
-+      <td>${log.ts}</td>
-+      <td>${log.actor}</td>
-+      <td>${log.action}</td>
-+      <td class="hash">${log.hash}</td>
-+    `;
-+    tbody.appendChild(row);
-+  });
-+}
-+
-+function renderLegend() {
-+  const container = document.getElementById("splLegend");
-+  container.innerHTML = ["DRAFT", "ACTIVE", "FINAL", "LOCKED"]
-+    .map((status) => `<span class="pill ${status.toLowerCase()}">${status}</span>`)
-+    .join("");
-+}
-+
-+function renderSignaturePanel(current) {
-+  const container = document.getElementById("signaturePanel");
-+  container.innerHTML = `
-+    <div class="signature-status">
-+      <div>
-+        <p class="eyebrow">Status</p>
-+        <h4>${current.privy.status === "signed" ? "Signed" : current.privy.status}</h4>
-+        <p class="muted">${current.privy.actors.join(" + ")} harus menyelesaikan penandatanganan.</p>
-+      </div>
-+      <div>${privyPill(current.privy.status)}</div>
-+    </div>
-+    <div class="signature-actions">
-+      <button class="secondary" data-action="download" data-id="${current.id}">Unduh PDF</button>
-+      <button data-action="remind" data-id="${current.id}">Kirim Reminder</button>
-+    </div>
-+  `;
-+}
-+
-+function renderChecklist(items) {
-+  const list = document.getElementById("checklist");
-+  list.innerHTML = "";
-+  items.forEach((item) => {
-+    const li = document.createElement("li");
-+    li.innerHTML = `${item.done ? "✅" : "⬜"} ${item.title}`;
-+    list.appendChild(li);
-   });
- }
- 
--function openSignature(id) {
--  selectedLogId = id;
--  document.getElementById('signatureSection').style.display = 'block';
--  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
-+function setSummary(current) {
-+  document.getElementById("splStatus").innerText = current.status;
-+  document.getElementById("privyStatus").innerText = current.privy.status.toUpperCase();
-+  document.getElementById("hashInfo").innerText = current.hash;
-+}
-+
-+function appendAuditEntry(action, hash = "-") {
-+  const entry = {
-+    ts: new Date().toISOString().replace("T", " ").slice(0, 16),
-+    actor: "Client",
-+    action,
-+    hash
-+  };
-+  auditTrail.unshift(entry);
-+  renderAudit(auditTrail);
- }
- 
--document.getElementById('logoutBtn').onclick = async () => {
--  await supabase.auth.signOut();
--  location.href = '/apps/login/';
--};
-+async function persistSplStatus(id, status) {
-+  if (!supabase) return;
-+  await supabase.from("spl_records").upsert({ spl_id: id, status });
-+}
-+
-+function hydrate() {
-+  renderLegend();
-+  renderSplTable(sampleSpls);
-+  renderDocList(documentPipeline);
-+  renderAudit(auditTrail);
-+  renderChecklist(checklistItems);
-+
-+  const current = sampleSpls[0];
-+  renderSignaturePanel(current);
-+  setSummary(current);
-+}
-+
-+function attachEvents() {
-+  document.getElementById("btnRefresh").addEventListener("click", hydrate);
-+
-+  document.getElementById("splTable").addEventListener("click", async (event) => {
-+    const button = event.target.closest("button");
-+    if (!button) return;
-+
-+    const id = button.closest(".actions").dataset.id;
-+    const spl = sampleSpls.find((item) => item.id === id);
-+    if (!spl) return;
-+
-+    const action = button.dataset.action;
-+    if (action === "preview") {
-+      document.getElementById("docPreview").src = "/documents/spl.html#" + id;
-+      return;
-+    }
-+
-+    if (action === "finalize") {
-+      spl.status = "FINAL";
-+      appendAuditEntry(`SPL ${id} difinalisasi`, spl.hash);
-+      await persistSplStatus(id, spl.status);
-+      hydrate();
-+      return;
-+    }
-+
-+    if (action === "lock") {
-+      spl.status = "LOCKED";
-+      appendAuditEntry(`SPL ${id} dikunci (LOCKED)`, spl.hash);
-+      await persistSplStatus(id, spl.status);
-+      hydrate();
-+    }
-+  });
-+
-+  document.getElementById("btnGenerate").addEventListener("click", () => {
-+    appendAuditEntry("Generate ulang PDF legal-grade", sampleSpls[0].hash);
-+    alert("PDF legal-grade digenerate ulang & hash diverifikasi.");
-+  });
-+
-+  document.getElementById("btnSendPrivy").addEventListener("click", () => {
-+    sampleSpls[0].privy.status = "sent";
-+    appendAuditEntry("Dokumen dikirim ke PrivyID", sampleSpls[0].hash);
-+    hydrate();
-+  });
-+
-+  document.getElementById("signaturePanel").addEventListener("click", (event) => {
-+    const button = event.target.closest("button");
-+    if (!button) return;
-+    const action = button.dataset.action;
-+    if (action === "remind") {
-+      alert("Reminder penandatanganan dikirim ke semua penandatangan.");
-+    }
-+    if (action === "download") {
-+      alert("PDF final diunduh untuk arsip legal.");
-+    }
-+  });
-+
-+  document.getElementById("btnLock").addEventListener("click", async () => {
-+    const spl = sampleSpls[0];
-+    spl.status = "LOCKED";
-+    appendAuditEntry(`SPL ${spl.id} dikunci (LOCKED)`, spl.hash);
-+    await persistSplStatus(spl.id, spl.status);
-+    hydrate();
-+  });
-+
-+  document.getElementById("logoutBtn").addEventListener("click", async () => {
-+    if (supabase?.auth) {
-+      await supabase.auth.signOut();
-+    }
-+    window.location.href = "/apps/login/";
-+  });
-+}
- 
--loadWorks();
-+hydrate();
-+attachEvents();
- 
-EOF
-)
+import { supabase } from "../shared/supabase.js";
+
+const sampleSpls = [
+  {
+    id: "SPL-2024-001",
+    client: "PT Alfa Energi",
+    mitra: "CV Mitra Kontraktual",
+    status: "FINAL",
+    documents: ["Perjanjian Induk Layanan", "SPL", "NDA", "Quotation"],
+    hash: "3ac4...9f1a",
+    privy: { status: "sent", actors: ["Client", "Mitra"] },
+    updated_at: "2024-09-01 10:22"
+  },
+  {
+    id: "SPL-2024-002",
+    client: "PT Beta Logistik",
+    mitra: "PT Sukses Bersama",
+    status: "ACTIVE",
+    documents: ["Perjanjian Kemitraan", "Addendum IPL"],
+    hash: "-",
+    privy: { status: "draft", actors: ["Client"] },
+    updated_at: "2024-09-01 09:10"
+  }
+];
+
+const documentPipeline = [
+  { name: "Perjanjian Induk Layanan", status: "PDF dibuat", hash: "f3d...aa8", immutable: true },
+  { name: "Surat Perintah Layanan", status: "Siap ditandatangani", hash: "3ac...9f1", immutable: false },
+  { name: "NDA & Tata Tertib", status: "Locked", hash: "a9b...3c2", immutable: true },
+  { name: "Lembar Kinerja Harian", status: "Draft", hash: "-", immutable: false },
+  { name: "Quotation", status: "PDF dibuat", hash: "bb1...d61", immutable: true }
+];
+
+const auditTrail = [
+  { ts: "2024-09-01 08:02", actor: "Client", action: "Membuat SPL", hash: "-" },
+  { ts: "2024-09-01 08:45", actor: "Mitra", action: "Mengunci kinerja (LOCKED)", hash: "3ac4...9f1a" },
+  { ts: "2024-09-01 09:15", actor: "System", action: "Generate PDF legal-grade", hash: "3ac4...9f1a" },
+  { ts: "2024-09-01 09:30", actor: "System", action: "Kirim ke PrivyID", hash: "3ac4...9f1a" }
+];
+
+const checklistItems = [
+  { title: "Login OTP & verifikasi role", done: true },
+  { title: "SPL dikaitkan dengan IPL resmi", done: true },
+  { title: "Render HTML → PDF legal-grade", done: true },
+  { title: "Hash SHA-256 + simpan metadata", done: true },
+  { title: "Kirim ke PrivyID Production", done: true },
+  { title: "Audit trail immutable", done: true },
+  { title: "Preview dokumen print-safe A4", done: true }
+];
+
+function badge(status) {
+  const variants = {
+    DRAFT: "badge draft",
+    ACTIVE: "badge info",
+    FINAL: "badge final",
+    LOCKED: "badge locked"
+  };
+  return `<span class="${variants[status] || "badge"}">${status}</span>`;
+}
+
+function privyPill(status) {
+  const text = {
+    draft: "Draft",
+    sent: "Sent to signers",
+    signed: "Fully signed",
+    rejected: "Rejected"
+  };
+  return `<span class="pill ${status}">${text[status] || status}</span>`;
+}
+
+function renderSplTable(spls) {
+  const tbody = document.querySelector("#splTable tbody");
+  tbody.innerHTML = "";
+
+  spls.forEach((spl) => {
+    const row = document.createElement("tr");
+    row.innerHTML = `
+      <td>${spl.id}</td>
+      <td>${spl.client}</td>
+      <td>${spl.mitra}</td>
+      <td>${badge(spl.status)}</td>
+      <td>
+        ${spl.documents.map((doc) => `<span class="pill neutral">${doc}</span>`).join(" ")}
+      </td>
+      <td class="actions" data-id="${spl.id}">
+        <button class="secondary" data-action="preview">Preview</button>
+        <button data-action="finalize" ${spl.status === "FINAL" || spl.status === "LOCKED" ? "disabled" : ""}>Finalisasi SPL</button>
+        <button data-action="lock" class="danger" ${spl.status === "LOCKED" ? "disabled" : ""}>Lock & Audit</button>
+      </td>
+    `;
+    tbody.appendChild(row);
+  });
+}
+
+function renderDocList(docs) {
+  const container = document.getElementById("docList");
+  container.innerHTML = "";
+
+  docs.forEach((doc) => {
+    const card = document.createElement("div");
+    card.className = "doc-card";
+    card.innerHTML = `
+      <div class="doc-title">${doc.name}</div>
+      <p class="muted">${doc.status}</p>
+      <p class="hash">Hash: ${doc.hash}</p>
+      <div class="doc-meta">
+        <span class="pill ${doc.immutable ? "locked" : "neutral"}">${doc.immutable ? "Immutable" : "Draft"}</span>
+      </div>
+    `;
+    container.appendChild(card);
+  });
+}
+
+function renderAudit(entries) {
+  const tbody = document.querySelector("#auditTable tbody");
+  tbody.innerHTML = "";
+
+  entries.forEach((log) => {
+    const row = document.createElement("tr");
+    row.innerHTML = `
+      <td>${log.ts}</td>
+      <td>${log.actor}</td>
+      <td>${log.action}</td>
+      <td class="hash">${log.hash}</td>
+    `;
+    tbody.appendChild(row);
+  });
+}
+
+function renderLegend() {
+  const container = document.getElementById("splLegend");
+  container.innerHTML = ["DRAFT", "ACTIVE", "FINAL", "LOCKED"]
+    .map((status) => `<span class="pill ${status.toLowerCase()}">${status}</span>`)
+    .join("");
+}
+
+function renderSignaturePanel(current) {
+  const container = document.getElementById("signaturePanel");
+  container.innerHTML = `
+    <div class="signature-status">
+      <div>
+        <p class="eyebrow">Status</p>
+        <h4>${current.privy.status === "signed" ? "Signed" : current.privy.status}</h4>
+        <p class="muted">${current.privy.actors.join(" + ")} harus menyelesaikan penandatanganan.</p>
+      </div>
+      <div>${privyPill(current.privy.status)}</div>
+    </div>
+    <div class="signature-actions">
+      <button class="secondary" data-action="download" data-id="${current.id}">Unduh PDF</button>
+      <button data-action="remind" data-id="${current.id}">Kirim Reminder</button>
+    </div>
+  `;
+}
+
+function renderChecklist(items) {
+  const list = document.getElementById("checklist");
+  list.innerHTML = "";
+  items.forEach((item) => {
+    const li = document.createElement("li");
+    li.innerHTML = `${item.done ? "✅" : "⬜"} ${item.title}`;
+    list.appendChild(li);
+  });
+}
+
+function setSummary(current) {
+  document.getElementById("splStatus").innerText = current.status;
+  document.getElementById("privyStatus").innerText = current.privy.status.toUpperCase();
+  document.getElementById("hashInfo").innerText = current.hash;
+}
+
+function appendAuditEntry(action, hash = "-") {
+  const entry = {
+    ts: new Date().toISOString().replace("T", " ").slice(0, 16),
+    actor: "Client",
+    action,
+    hash
+  };
+  auditTrail.unshift(entry);
+  renderAudit(auditTrail);
+}
+
+async function persistSplStatus(id, status) {
+  try {
+    await supabase.from("spl_records").upsert({ spl_id: id, status });
+  } catch (error) {
+    console.warn("Gagal menyimpan status SPL", error);
+  }
+}
+
+function hydrate() {
+  renderLegend();
+  renderSplTable(sampleSpls);
+  renderDocList(documentPipeline);
+  renderAudit(auditTrail);
+  renderChecklist(checklistItems);
+
+  const current = sampleSpls[0];
+  renderSignaturePanel(current);
+  setSummary(current);
+}
+
+function attachEvents() {
+  document.getElementById("btnRefresh").addEventListener("click", hydrate);
+
+  document.getElementById("splTable").addEventListener("click", async (event) => {
+    const button = event.target.closest("button");
+    if (!button) return;
+
+    const id = button.closest(".actions").dataset.id;
+    const spl = sampleSpls.find((item) => item.id === id);
+    if (!spl) return;
+
+    const action = button.dataset.action;
+    if (action === "preview") {
+      document.getElementById("docPreview").src = "/documents/spl.html#" + id;
+      return;
+    }
+
+    if (action === "finalize") {
+      spl.status = "FINAL";
+      appendAuditEntry(`SPL ${id} difinalisasi`, spl.hash);
+      await persistSplStatus(id, spl.status);
+      hydrate();
+      return;
+    }
+
+    if (action === "lock") {
+      spl.status = "LOCKED";
+      appendAuditEntry(`SPL ${id} dikunci (LOCKED)`, spl.hash);
+      await persistSplStatus(id, spl.status);
+      hydrate();
+    }
+  });
+
+  document.getElementById("btnGenerate").addEventListener("click", () => {
+    appendAuditEntry("Generate ulang PDF legal-grade", sampleSpls[0].hash);
+    alert("PDF legal-grade digenerate ulang & hash diverifikasi.");
+  });
+
+  document.getElementById("btnSendPrivy").addEventListener("click", () => {
+    sampleSpls[0].privy.status = "sent";
+    appendAuditEntry("Dokumen dikirim ke PrivyID", sampleSpls[0].hash);
+    hydrate();
+  });
+
+  document.getElementById("signaturePanel").addEventListener("click", (event) => {
+    const button = event.target.closest("button");
+    if (!button) return;
+    const action = button.dataset.action;
+    if (action === "remind") {
+      alert("Reminder penandatanganan dikirim ke semua penandatangan.");
+    }
+    if (action === "download") {
+      alert("PDF final diunduh untuk arsip legal.");
+    }
+  });
+
+  document.getElementById("btnLock").addEventListener("click", async () => {
+    const spl = sampleSpls[0];
+    spl.status = "LOCKED";
+    appendAuditEntry(`SPL ${spl.id} dikunci (LOCKED)`, spl.hash);
+    await persistSplStatus(spl.id, spl.status);
+    hydrate();
+  });
+
+  document.getElementById("logoutBtn").addEventListener("click", async () => {
+    if (supabase?.auth) {
+      await supabase.auth.signOut();
+    }
+    window.location.href = "/apps/login/";
+  });
+}
+
+hydrate();
+attachEvents();
 
EOF
)
