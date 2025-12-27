import { supabase } from "../shared/supabase.js";

const emailInput = document.getElementById("email");
const otpInput = document.getElementById("otp");
const btnSend = document.getElementById("btnSend");
const btnVerify = document.getElementById("btnVerify");

btnSend.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!email) return alert("Email wajib diisi");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("OTP dikirim ke email. Cek inbox/spam.");
  }
});

btnVerify.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const token = otpInput.value.trim();
  if (!email || !token) return alert("Email dan OTP wajib diisi");

  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    alert(error.message);
    return;
  }

  const user = data?.user;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  if (role === "CLIENT") {
    window.location.href = "/apps/client/";
  } else if (role === "MITRA") {
    window.location.href = "/apps/mitra/";
  } else {
    alert("Role tidak dikenali. Hubungi admin.");
  }
});
