// api/store-config.js — kasih data pembayaran (WA, e-wallet, QRIS) ke
// pengunjung TANPA pernah expose dokumen config/general mentah-mentah.
// Cuma field-field ini yang di-whitelist buat balik ke client — kalau
// ada field rahasia lain nyangkut di config/general nanti, TETEP AMAN
// karena gak pernah ikut ke-return.

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
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (initError) {
    console.error("Firebase Admin init error:", initError);
    return res.status(500).json({ error: "Init error" });
  }

  try {
    const doc = await admin.firestore().collection("config").doc("general").get();
    const data = doc.exists ? doc.data() : {};

    // WHITELIST KETAT — cuma field ini yang boleh balik ke client.
    res.setHeader("Cache-Control", "public, max-age=60"); // cache ringan, kurangin beban
    return res.status(200).json({
      waNumber: data.waNumber || "",
      ewallet: {
        dana: data.ewallet?.dana || "",
        gopay: data.ewallet?.gopay || "",
        ovo: data.ewallet?.ovo || "",
      },
      qrisImageUrl: data.qrisImageUrl || "",
    });
  } catch (err) {
    console.error("Gagal ambil store config:", err);
    return res.status(500).json({ error: "Gagal ambil data" });
  }
};
