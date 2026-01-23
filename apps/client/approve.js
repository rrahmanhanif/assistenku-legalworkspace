import { requestWithSession } from "/shared/http/httpClient.js";

export async function approve(id) {
  if (!confirm("Setujui & kunci SPL?")) return;

  try {
    await requestWithSession("/api/client/worklogs/approve", {
      method: "POST",
      body: { id }
    });

    await requestWithSession("/api/legal/generate-spl-pdf", {
      method: "POST",
      body: { log_id: id }
    });

    alert("Disetujui & PDF dibuat lewat API terpusat");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal menyetujui log");
  }
}
