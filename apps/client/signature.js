async function submitSignature(logId, signatureBase64, session) {
  const { error } = await supabase
    .from("daily_work_logs")
    .update({
      signature_data: signatureBase64,
      signed_at: new Date().toISOString(),
      status: "SIGNED_INTERNAL"
    })
    .eq("id", logId);

  if (error) throw error;

  // Generate Legal PDF
  await fetch("/functions/v1/generate-SPL-PDF-legal-grade", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ log_id: logId })
  });

  // Send to PrivyID
  await fetch("/functions/v1/send-to-privy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ log_id: logId })
  });

  alert("SPL ditandatangani & dikirim ke PrivyID");
}
