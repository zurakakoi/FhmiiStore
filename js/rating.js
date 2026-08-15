// js/rating.js — Google Sign-In buat rating produk + submit, kalkulasi rata-rata,
// dan sinkronisasi ke dokumen produk biar muncul di kartu produk juga.
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

  const ratingsRef = db.collection("products").doc(productId).collection("ratings");

  // Satu user cuma boleh punya 1 rating per produk — kalau udah pernah
  // ngerating, update yang lama daripada numpuk entri baru.
  const existing = await ratingsRef.where("uid", "==", currentUser.uid).limit(1).get();
  const payload = {
    uid: currentUser.uid,
    name: currentUser.displayName || "Pengguna",
    photoURL: currentUser.photoURL || null,
    star,
    comment: comment || "",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  if (!existing.empty) {
    await ratingsRef.doc(existing.docs[0].id).update(payload);
  } else {
    await ratingsRef.add(payload);
  }

  await syncProductRatingSummary(productId);
}

// Ambil semua rating produk, hitung ulang rata-rata & jumlahnya, terus
// tulis balik ke dokumen produk lewat server function (bukan client
// langsung) biar gak bisa dimanipulasi/di-spam bot.
async function syncProductRatingSummary(productId) {
  try {
    await fetch("/api/sync-rating", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
  } catch (err) {
    console.error("Gagal sinkronisasi rata-rata rating ke produk:", err);
  }
}

function initialsAvatar(name) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return `<div class="review-avatar-fallback">${escapeHtml(initial)}</div>`;
}

function formatReviewDate(timestamp) {
  if (!timestamp || !timestamp.toDate) return "";
  const date = timestamp.toDate();
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function reviewStars(star) {
  let out = "";
  for (let i = 1; i <= 5; i++) {
    out += `<svg class="star ${i <= star ? "" : "empty"}" width="13" height="13" fill="currentColor" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1 6-5.2-2.9-5.2 2.9 1-6L1.4 7.8l6-.8L10 1.5z"/></svg>`;
  }
  return out;
}

function reviewItem(review) {
  const name = escapeHtml(review.name);
  const safePhoto = isValidImageUrl(review.photoURL) ? review.photoURL : null;
  const avatar = safePhoto
    ? `<img src="${safePhoto}" alt="${name}" class="review-avatar" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'), {className:'review-avatar-fallback', textContent:'${escapeHtml((review.name || "?").charAt(0).toUpperCase())}'}))" />`
    : initialsAvatar(review.name);

  return `
  <div class="review-item">
    <div class="review-top">
      ${avatar}
      <div class="review-meta">
        <p class="review-name">${name}</p>
        <div class="review-stars-row">
          <div class="review-stars">${reviewStars(review.star)}</div>
          <span class="review-date">${formatReviewDate(review.createdAt)}</span>
        </div>
      </div>
    </div>
    ${review.comment ? `<p class="review-text">${escapeHtml(review.comment)}</p>` : ""}
  </div>`;
}

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
      summary.innerHTML = `<span class="rating-summary-avg">${avg.toFixed(1)}</span> <span class="review-stars">${reviewStars(Math.round(avg))}</span> <span class="muted">(${reviews.length})</span>`;
    }
  } catch (err) {
    console.error("Gagal memuat rating:", err);
    container.innerHTML = `<p class="muted" style="font-size:13px;">Gagal memuat ulasan.</p>`;
  }
}
