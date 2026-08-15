// api/sync-rating.js — hitung ulang rata-rata rating produk & tulis
// balik ke dokumen produk. Dipanggil abis user submit rating.
// Pakai Admin SDK (bypass rules client) biar client gak perlu izin
// nulis ratingAvg/ratingCount langsung ke Firestore sama sekali.

const admin = require("firebase-admin");

let initError = null;
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  } catch (err) {
    initError = err;
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (initError) {
    console.error("Firebase Admin init error:", initError);
    return res.status(500).json({ error: "Init error" });
  }

  const { productId } = req.body || {};
  if (!productId || typeof productId !== "string") {
    return res.status(400).json({ error: "productId wajib diisi" });
  }

  try {
    const db = admin.firestore();
    const ratingsSnap = await db.collection("products").doc(productId).collection("ratings").get();
    const count = ratingsSnap.size;
    let avg = 0;
    if (count > 0) {
      let total = 0;
      ratingsSnap.forEach((doc) => { total += Number(doc.data().star) || 0; });
      avg = total / count;
    }
    await db.collection("products").doc(productId).update({ ratingAvg: avg, ratingCount: count });
    return res.status(200).json({ ratingAvg: avg, ratingCount: count });
  } catch (err) {
    console.error("Gagal sync rating:", err);
    return res.status(500).json({ error: "Gagal sinkronisasi rating" });
  }
};
