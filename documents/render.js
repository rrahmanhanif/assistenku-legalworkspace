import crypto from "crypto";

export async function renderPDF(html) {
  const pdfBuffer = await htmlToPdf(html);

  const hash = crypto
    .createHash("sha256")
    .update(pdfBuffer)
    .digest("hex");

  return { pdfBuffer, hash };
}
