// assets/config.js

// API Base URL (kompatibel dengan variable lama dan baru)
window.__API_BASE_URL__ =
  window.__API_BASE_URL__ ||
  window.__API_BASE__ ||
  "https://api.assistenku.com";

// Tetap set __API_BASE__ agar kode lama tidak rusak
window.__API_BASE__ = window.__API_BASE_URL__;

// Firebase config (WAJIB dipanggil sebelum module firebase.js)
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBSL87qkuwSQU8aXvLuu24nV7jUoX2mOSA",
  authDomain: "assistenku-8ef85.firebaseapp.com",
  databaseURL: "https://assistenku-8ef85-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "assistenku-8ef85",
  storageBucket: "assistenku-8ef85.firebasestorage.app",
  messagingSenderId: "320243806907",
  appId: "1:320243806907:web:a78bd29ee497aa04ee2f9e",
  measurementId: "G-CB25PSK4J4"
};

// Base URL untuk legalworkspace (dipakai saat build magic link)
window.LEGALWORKSPACE_BASE_URL = "https://legalworkspace.assistenku.com";
