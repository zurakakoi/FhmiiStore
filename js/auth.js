// js/auth.js — admin auth pakai Firebase Auth beneran (custom token via
// Vercel serverless function), bukan PIN yang dicek manual ke Firestore.
// Non-module, pakai `auth` global dari firebase-config.js.

function logoutAdmin() {
  auth.signOut().finally(() => {
    window.location.href = "/admin/login";
  });
}

// Dipanggil di admin/login.html
async function submitAdminPin(pin, onError) {
  try {
    const res = await Promise.race([
      fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
    ]);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      onError(data.error || "PIN salah. Coba lagi.");
      return;
    }

    await auth.signInWithCustomToken(data.token);
    window.location.href = "/admin";
  } catch (err) {
    console.error("Gagal login admin:", err);
    onError("Gagal terhubung ke server. Coba lagi.");
  }
}

function waitForAuthUser() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

// Dipanggil di tiap halaman admin selain login, buat cek akses.
async function guardAdminPage() {
  try {
    const user = await Promise.race([
      waitForAuthUser(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);

    if (!user) {
      window.location.href = "/admin/login";
      return false;
    }

    const idTokenResult = await user.getIdTokenResult();
    if (!idTokenResult.claims.admin) {
      await auth.signOut();
      window.location.href = "/admin/login";
      return false;
    }
    return true;
  } catch (err) {
    console.error("Gagal cek sesi admin:", err);
    window.location.href = "/admin/login";
    return false;
  }
}
