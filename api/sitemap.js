// api/sitemap.js — generate sitemap.xml OTOMATIS, isinya semua produk yang
// ada di Firestore + halaman statis. Diakses Google lewat /sitemap.xml
// (di-redirect dari vercel.json). Update sendiri tiap ada produk baru,
// gak perlu di-generate manual.

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

const SITE_URL = "https://fhmiistore.my.id"; // ganti kalau domain beda

module.exports = async (req, res) => {
  if (initError) {
    console.error("Firebase Admin init error:", initError);
    return res.status(500).send("Init error");
  }

  try {
    const snap = await admin.firestore().collection("products").get();
    const staticUrls = [
      { loc: `${SITE_URL}/`, priority: "1.0" },
      { loc: `${SITE_URL}/produk`, priority: "0.9" },
    ];
    const productUrls = [];
    snap.forEach((doc) => {
      productUrls.push({
        loc: `${SITE_URL}/produk-detail?id=${doc.id}`,
        priority: "0.7",
      });
    });

    const allUrls = [...staticUrls, ...productUrls];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.status(200).send(xml);
  } catch (err) {
    console.error("Gagal generate sitemap:", err);
    return res.status(500).send("Gagal generate sitemap");
  }
};
