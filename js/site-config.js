// js/site-config.js — ambil setting umum toko (nomor WA dll) dari Firestore
// Non-module version, pakai variabel global `db` dari firebase-config.js

const FALLBACK_WA_NUMBER = "62"; // dipakai kalau config/general belum dibuat / gagal fetch
let cachedWaNumber = null;

async function getWaNumber() {
  if (cachedWaNumber) return cachedWaNumber;
  try {
    const snap = await db.collection("config").doc("general").get();
    if (snap.exists && snap.data().waNumber) {
      cachedWaNumber = snap.data().waNumber;
      return cachedWaNumber;
    }
  } catch (err) {
    console.error("Gagal ambil nomor WA dari Firestore:", err);
  }
  return FALLBACK_WA_NUMBER;
}

let cachedStoreConfig = null;

async function getStoreConfig() {
  if (cachedStoreConfig) return cachedStoreConfig;
  const defaults = { waNumber: FALLBACK_WA_NUMBER, ewallet: { dana: "", gopay: "", ovo: "" }, qrisImageUrl: "" };
  try {
    const snap = await db.collection("config").doc("general").get();
    if (snap.exists) {
      const data = snap.data();
      cachedStoreConfig = {
        waNumber: data.waNumber || defaults.waNumber,
        ewallet: { dana: data.ewallet?.dana || "", gopay: data.ewallet?.gopay || "", ovo: data.ewallet?.ovo || "" },
        qrisImageUrl: data.qrisImageUrl || "",
      };
      return cachedStoreConfig;
    }
  } catch (err) {
    console.error("Gagal ambil setting toko dari Firestore:", err);
  }
  return defaults;
}

function buildWaLink(number, message = "") {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

async function hydrateWaLinks() {
  const number = await getWaNumber();
  document.querySelectorAll("[data-wa-link]").forEach((el) => {
    const message = el.getAttribute("data-wa-message") || "";
    el.href = buildWaLink(number, message);
  });
}
