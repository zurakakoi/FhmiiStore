// api/verify-pin.js — Vercel Serverless Function
// Cek PIN admin (disimpen sebagai env var, BUKAN di Firestore), kalau bener
// generate custom token Firebase Auth dengan claim admin:true.

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
    return res.status(500).json({ error: `Init error: ${initError.message}` });
  }

  const { pin } = req.body || {};

  if (!pin || !process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: "PIN salah." });
  }

  try {
    const token = await admin.auth().createCustomToken("fhmii-store-admin", { admin: true });
    return res.status(200).json({ token });
  } catch (err) {
    console.error("Gagal generate custom token:", err);
    return res.status(500).json({ error: `Token error: ${err.message}` });
  }
};
