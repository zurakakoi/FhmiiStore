// js/admin-auth.js — validasi PIN admin ke Firestore (pola OMYASSIN),
// bukan Firebase Auth beneran. Non-module, pakai variabel global `db`.

const ADMIN_PIN_KEY = "fhmii-admin-pin";

function getStoredPin() {
  return localStorage.getItem(ADMIN_PIN_KEY);
}

function logoutAdmin() {
  localStorage.removeItem(ADMIN_PIN_KEY);
  sessionStorage.removeItem("fhmii-admin-verified");
  window.location.href = "/admin/login";
}

// Dipanggil di admin/login.html
async function submitAdminPin(pin, onError) {
  try {
    const snap = await Promise.race([
      db.collection("config").doc("adminPin").get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    if (!snap.exists || snap.data().value !== pin) {
      onError("PIN salah. Coba lagi.");
      return;
    }
    localStorage.setItem(ADMIN_PIN_KEY, pin);
    sessionStorage.setItem("fhmii-admin-verified", pin);
    window.location.href = "/admin";
  } catch (err) {
    console.error("Gagal verifikasi PIN:", err);
    const detail = err.code || err.name || err.message || String(err);
    onError(`Gagal terhubung ke server [${detail}]. Coba lagi.`);
  }
}

// Dipanggil di tiap halaman admin selain login, buat cek akses.
// PIN diverifikasi beneran ke Firestore cuma SEKALI per sesi browser
// (ditandain di sessionStorage) — biar navigasi antar halaman admin cepet,
// tapi tetep gak bisa dibypass cuma modal ngisi localStorage sembarangan.
async function guardAdminPage() {
  const pin = getStoredPin();
  if (!pin) {
    window.location.href = "/admin/login";
    return false;
  }

  if (sessionStorage.getItem("fhmii-admin-verified") === pin) {
    return true; // udah diverifikasi sebelumnya di sesi browser ini
  }

  try {
    const snap = await Promise.race([
      db.collection("config").doc("adminPin").get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    if (!snap.exists || snap.data().value !== pin) {
      logoutAdmin();
      return false;
    }
    sessionStorage.setItem("fhmii-admin-verified", pin);
    return true;
  } catch (err) {
    console.error("Gagal cek sesi admin:", err);
    alert("Gagal terhubung ke server buat verifikasi sesi admin. Coba login ulang.");
    window.location.href = "/admin/login";
    return false;
  }
}
