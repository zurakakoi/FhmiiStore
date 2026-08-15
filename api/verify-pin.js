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

// Rate limit sederhana di memori (proteksi PARSIAL — instance serverless
// bisa reset/beda-beda, jadi ini bukan proteksi mutlak, tapi lumayan
// nyusahin brute-force dasar dari 1 sumber).
const attempts = new Map(); // ip -> { count, resetAt }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 menit

function isRateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Terlalu banyak percobaan. Coba lagi 10 menit lagi." });
  }

  if (initError) {
    console.error("Firebase Admin init error:", initError);
    return res.status(500).json({ error: `Init error: ${initError.message}` });
  }

  const { pin } = req.body || {};

  // Delay kecil di tiap percobaan (gagal maupun sukses) biar brute-force
  // butuh waktu jauh lebih lama, tanpa kerasa lambat buat user asli.
  await delay(400);

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
