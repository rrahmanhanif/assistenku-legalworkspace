import { renderPDF } from "../documents/render.js";
import { saveAudit } from "./audit.js";

export async function generatePDF(spl) {
  if (spl.status === "LOCKED") {
    throw "IMMUTABLE_DOCUMENT";
  }

  const html = injectData(spl);
  const { pdfBuffer, hash } = await renderPDF(html);

  await saveAudit({
    spl_id: spl.id,
    action: "PDF_GENERATED",
    hash
  });

  return { pdfBuffer, hash };
}
