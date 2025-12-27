async function approve(id) {
  if (!confirm("Setujui & kunci SPL?")) return;

  const { error } = await supabase
    .from("daily_work_logs")
    .update({
      status: "APPROVED",
      approved_at: new Date().toISOString()
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await fetch("/functions/v1/generate-SPL-PDF-legal-grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ log_id: id })
  });

  alert("Disetujui & PDF dibuat");
  loadWorks();
}
