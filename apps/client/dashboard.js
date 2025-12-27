const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  location.href = "/apps/login/";
}
if (spl.status === "FINAL") {
  btnSendPrivy.disabled = false;
}

if (spl.status === "LOCKED") {
  btnEdit.disabled = true;
  btnDownload.disabled = false;
}


const tbody = document.querySelector('#workTable tbody');
let selectedLogId = null;

async function loadWorks() {
  const { data, error } = await supabase
    .from('daily_work_logs')
    .select(`
      id,
      work_date,
      description,
      status,
      mitra_name
    `)
    .eq('status', 'LOCKED')
    .order('work_date', { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  tbody.innerHTML = '';

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">Tidak ada data</td></tr>`;
    return;
  }

  data.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.work_date}</td>
      <td>${row.mitra_name}</td>
      <td>${row.description}</td>
      <td>${row.status}</td>
      <td>
        <button onclick="openSignature('${row.id}')">
          Tanda Tangani
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openSignature(id) {
  selectedLogId = id;
  document.getElementById('signatureSection').style.display = 'block';
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut();
  location.href = '/apps/login/';
};

loadWorks();
