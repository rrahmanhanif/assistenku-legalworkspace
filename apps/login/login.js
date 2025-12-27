import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  "https://vptfubypmfafrnmwweyj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwdGZ1YnlwbWZhZnJubXd3ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2NjI0OTMsImV4cCI6MjA3ODIzODQ5M30.DWe0Rr5zbWXK5_qUYMq2-vFcVk5JkDslXon5luWGzmw"
);

import { supabase } from "../../supabase.js";

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;

  await supabase.auth.signInWithOtp({ email });
  alert("OTP dikirim ke email");
};

document.getElementById("sendOtp").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  if (!email) return alert("Email wajib diisi");

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false }
  });

  if (error) {
    alert(error.message);
  } else {
    alert("OTP dikirim ke email");
  }
};

document.getElementById("verifyOtp").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const token = document.getElementById("otp").value.trim();

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email"
  });

  if (error) {
    alert(error.message);
  } else {
    window.location.href = "/apps/client/";
  }
};
