export async function lockSPL(spl_id) {
  await db.from("spl")
    .update({
      status: "LOCKED",
      locked_at: new Date()
    })
    .eq("id", spl_id);
}
