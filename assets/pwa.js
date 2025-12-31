// /assets/pwa.js
let deferredPrompt = null;

export function setupPwaInstall({ buttonId = "btnInstall", autoPromptOnFirstClick = true } = {}) {
  const btn = document.getElementById(buttonId);

  // Register service worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  // Tombol default: hidden sampai eligible
  if (btn) {
    btn.style.display = "none";
    btn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice?.outcome !== "accepted") {
        // user canceled
      }
      btn.style.display = "none";
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    // Cegah mini-infobar default, kita kontrol via tombol (lebih konsisten)
    e.preventDefault();
    deferredPrompt = e;

    if (btn) btn.style.display = "inline-flex";

    // Opsi: agar terasa “pop up”, kita trigger pada interaksi pertama user (tetap memenuhi user gesture)
    if (autoPromptOnFirstClick) {
      const once = () => {
        document.removeEventListener("click", once, true);
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(() => {
          deferredPrompt = null;
          if (btn) btn.style.display = "none";
        });
      };
      document.addEventListener("click", once, true);
    }
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (btn) btn.style.display = "none";
  });
}
