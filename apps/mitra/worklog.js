let currentLogId = null;

async function loadDraft() {
  const { data } = await supabase
    .from('daily_work_logs')
    .select('*')
    .eq('status', 'DRAFT')
    .single();

  if (data) {
    currentLogId = data.id;
    document.getElementById('description').value = data.description;
    document.getElementById('statusInfo').innerText = data.status;
  }
}

loadDraft();

document.getElementById('btnSave').onclick = async () => {
  const desc = document.getElementById('description').value;

  if (currentLogId) {
    await supabase
      .from('daily_work_logs')
      .update({ description: desc })
      .eq('id', currentLogId);
  } else {
    const { data } = await supabase
      .from('daily_work_logs')
      .insert({ description: desc })
      .select()
      .single();

    currentLogId = data.id;
  }

  alert('Draft disimpan');
};

document.getElementById('btnLock').onclick = async () => {
  if (!confirm('Setelah dikirim, data tidak bisa diubah. Lanjutkan?')) return;

  const { error } = await supabase
    .from('daily_work_logs')
    .update({ status: 'LOCKED' })
    .eq('id', currentLogId);

  if (error) {
    alert(error.message);
  } else {
    alert('Dikirim ke client');
    document.getElementById('statusInfo').innerText = 'LOCKED';
  }
};
