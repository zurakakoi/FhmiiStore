// js/rating.js — Google Sign-In buat rating produk + submit & tampilkan review
// Non-module, pakai `auth`, `googleProvider`, `db` global dari firebase-config.js

let currentUser = null;

function watchAuthState(onChange) {
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    onChange(user);
  });
}

async function signInWithGoogle() {
  try {
    await auth.signInWithPopup(googleProvider);
  } catch (err) {
    console.error("Gagal sign in:", err);
    alert("Gagal masuk dengan Google. Coba lagi.");
  }
}

function signOutUser() {
  auth.signOut();
}

async function submitRating(productId, { star, comment }) {
  if (!currentUser) throw new Error("Harus login dulu buat kasih rating.");
  await db.collection("products").doc(productId).collection("ratings").add({
    uid: currentUser.uid,
    name: currentUser.displayName || "Pengguna",
    star,
    comment: comment || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
}

function reviewStars(star) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += `<svg class="star ${i <= star ? "" : "empty"}" width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1 6-5.2-2.9-5.2 2.9 1-6L1.4 7.8l6-.8L10 1.5z"/></svg>`;
  }
  return out;
}

function reviewItem(review) {
  return `
  <div class="review-item">
    <div class="review-head">
      <strong style="font-size:13px;">${review.name}</strong>
      <div class="review-stars">${reviewStars(review.star)}</div>
    </div>
    ${review.comment ? `<p class="review-text">${review.comment}</p>` : ""}
  </div>`;
}

// Ambil semua rating produk, tampilkan daftar + hitung rata-rata (dihitung
// di sisi client karena update field ratingAvg di dokumen produk butuh PIN admin)
async function renderRatings(productId, containerId, summaryId) {
  const container = document.getElementById(containerId);
  const summary = document.getElementById(summaryId);
  if (!container) return;

  container.innerHTML = `<p class="muted" style="font-size:13px;">Memuat ulasan...</p>`;

  try {
    const snap = await db.collection("products").doc(productId).collection("ratings").orderBy("createdAt", "desc").get();
    if (snap.empty) {
      container.innerHTML = `<p class="muted" style="font-size:13px;">Belum ada ulasan. Jadi yang pertama kasih rating!</p>`;
      if (summary) summary.textContent = "Belum ada rating";
      return;
    }
    const reviews = [];
    snap.forEach((doc) => reviews.push(doc.data()));
    container.innerHTML = reviews.map(reviewItem).join("");

    if (summary) {
      const avg = reviews.reduce((sum, r) => sum + r.star, 0) / reviews.length;
      summary.textContent = `${avg.toFixed(1)} (${reviews.length} ulasan)`;
    }
  } catch (err) {
    console.error("Gagal memuat rating:", err);
    container.innerHTML = `<p class="muted" style="font-size:13px;">Gagal memuat ulasan.</p>`;
  }
}
