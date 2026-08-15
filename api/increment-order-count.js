// api/increment-order-count.js — naikin hitungan "peminat" produk pas ada
// order masuk. Server-side biar gak bisa di-spam/manipulasi dari client.

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
    await admin.firestore().collection("products").doc(productId).update({
      orderCount: admin.firestore.FieldValue.increment(1),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Gagal increment orderCount:", err);
    return res.status(500).json({ error: "Gagal update" });
  }
};
