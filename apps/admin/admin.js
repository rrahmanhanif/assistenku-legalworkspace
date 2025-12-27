import { supabase } from "../shared/supabase.js";

const templateList = document.getElementById("templateList");
const clientActivity = document.getElementById("clientActivity");
const mitraActivity = document.getElementById("mitraActivity");
const iplInfo = document.getElementById("iplInfo");
const clientCount = document.getElementById("clientCount");
const mitraCount = document.getElementById("mitraCount");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");

const templates = [
  { label: "IPL Utama", path: "/documents/templates/01-ipl.html", role: "ADMIN" },
  { label: "Addendum IPL", path: "/documents/templates/02-addendum-ipl-pt.html", role: "CLIENT" },
  { label: "Perjanjian Mitra", path: "/documents/templates/04-perjanjian-mitra.html", role: "MITRA" },
  { label: "Lembar Kinerja", path: "/documents/templates/06-lembar-kinerja.html", role: "MITRA" },
  { label: "Alur Sistem", path: "/documents/templates/alur-sistem-assistenku.html", role: "ADMIN" }
];

async function fetchTemplatePreview(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Tidak bisa memuat dokumen");
  const html = await res.text();
  return html.substring(0, 160).replace(/\s+/g, " ");
}

async function renderTemplates() {
  templateList.innerHTML = "";

  const cards = await Promise.all(
    templates.map(async (tpl) => {
      const wrapper = document.createElement("div");
      wrapper.className = "doc-card";

      const title = document.createElement("h3");
      title.textContent = `${tpl.label} (${tpl.role})`;

      const link = document.createElement("a");
      link.href = tpl.path;
      link.textContent = "Lihat dokumen";
      link.target = "_blank";

      const status = document.createElement("p");
      status.className = "muted";

      try {
        const preview = await fetchTemplatePreview(tpl.path);
        status.textContent = preview;
      } catch (err) {
        status.textContent = err?.message || "Gagal memuat preview";
      }

      wrapper.appendChild(title);
      wrapper.appendChild(status);
      wrapper.appendChild(link);
      return wrapper;
    })
  );

  cards.forEach((card) => templateList.appendChild(card));
}

function renderIplInfo() {
  try {
    const stored = JSON.parse(localStorage.getItem("iplAccess") || "{}");
    if (stored?.template) {
      iplInfo.textContent = `Login dengan ${stored.template}`;
    } else {
      iplInfo.textContent = "IPL belum diverifikasi";
    }
  } catch {
    iplInfo.textContent = "IPL belum diverifikasi";
  }
}

function renderTable(label, items) {
  if (!items.length) {
    return `<p class="muted">Belum ada aktivitas ${label.toLowerCase()}.</p>`;
  }

  const rows = items
    .map(
      (item, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${item.role}</td>
        <td><a href="${item.ipl_template || "#"}" target="_blank">${item.ipl_template || "IPL belum diset"}</a></td>
      </tr>`
    )
    .join("\n");

  return `
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Role</th>
          <th>Dokumen IPL</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

async function renderProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, ipl_template");

  if (error || !data) {
    clientCount.textContent = "-";
    mitraCount.textContent = "-";
    clientActivity.textContent = "Tidak dapat memuat data client";
    mitraActivity.textContent = "Tidak dapat memuat data mitra";
    return;
  }

  const clientProfiles = data.filter((row) => row.role === "CLIENT");
  const mitraProfiles = data.filter((row) => row.role === "MITRA");

  clientCount.textContent = String(clientProfiles.length);
  mitraCount.textContent = String(mitraProfiles.length);

  clientActivity.innerHTML = renderTable("Client", clientProfiles);
  mitraActivity.innerHTML = renderTable("Mitra", mitraProfiles);
}

async function refresh() {
  renderIplInfo();
  await renderTemplates();
  await renderProfiles();
}

if (refreshBtn) refreshBtn.addEventListener("click", refresh);

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    if (supabase?.auth) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("iplAccess");
    window.location.href = "/apps/login/";
  });
}

refresh();
