const supabase = supabase.createClient(
  'https://vptfubypmfafrnmwweyj.supabase.co',
  'ANON_PUBLIC_KEY'
);

document.getElementById('btnCheckin').onclick = async () => {
  const { error } = await supabase
    .from('attendance_mitra')
    .insert({});

  if (error) {
    alert(error.message);
  } else {
    alert('Check-in berhasil');
  }
};

document.getElementById('logoutBtn').onclick = async () => {
  await supabase.auth.signOut();
  window.location.href = '/apps/login/';
};
