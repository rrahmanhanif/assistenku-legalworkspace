import { apiFetch } from "/assets/apiClient.js";

export async function approve(id) {
  if (!confirm("Setujui & kunci SPL?")) return;

  try {
    await apiFetch("/api/client/worklogs/approve", {
      method: "POST",
      body: { id }
    });

    await apiFetch("/api/legal/generate-spl-pdf", {
      method: "POST",
      body: { log_id: id }
    });

    alert("Disetujui & PDF dibuat lewat API terpusat");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal menyetujui log");
  }
}
