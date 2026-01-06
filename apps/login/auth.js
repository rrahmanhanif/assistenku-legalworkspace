import { apiWhoAmI } from "/assets/apiClient.js";

window.verifyOtp = async function () {
  alert("Login menggunakan tautan email. Silakan gunakan halaman login utama.");

  try {
    const who = await apiWhoAmI();
    console.log("Identitas pengguna:", who);
  } catch (err) {
    console.error("Gagal mengambil identitas:", err);
  }
};
