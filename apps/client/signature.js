import { requestWithSession } from "/shared/http/httpClient.js";

export async function submitSignature(logId, signaturePayload) {
  try {
    await requestWithSession("/api/client/worklogs/sign", {
      method: "POST",
      body: {
        log_id: logId,
        signature: signaturePayload,
      },
    });

    await requestWithSession("/api/legal/generate-spl-pdf", {
      method: "POST",
      body: { log_id: logId },
    });

    await requestWithSession("/api/legal/send-to-privy", {
      method: "POST",
      body: { log_id: logId },
    });

    alert("SPL ditandatangani & dikirim ke PrivyID via API terpusat");
  } catch (err) {
    console.error(err);
    alert(err?.message || "Gagal mengirim tanda tangan");
  }
}
