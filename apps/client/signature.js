import { apiFetch } from "/assets/apiClient.js";

export async function submitSignature(logId, signaturePayload) {
  await apiFetch("/api/client/worklogs/sign", {
    method: "POST",
    body: {
      log_id: logId,
      signature: signaturePayload,
    },
  });

  await apiFetch("/api/legal/generate-spl-pdf", {
    method: "POST",
    body: { log_id: logId },
  });

  await apiFetch("/api/legal/send-to-privy", {
    method: "POST",
    body: { log_id: logId },
  });

  alert("SPL ditandatangani & dikirim ke PrivyID via API terpusat");
}
