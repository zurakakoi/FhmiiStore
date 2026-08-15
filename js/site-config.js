// js/site-config.js — ambil setting umum toko (nomor WA, e-wallet, QRIS)
// lewat server function /api/store-config — BUKAN baca Firestore
// langsung, biar dokumen config/general bisa dikunci total ke admin aja
// tanpa mengorbankan fitur checkout buat pengunjung biasa.

const FALLBACK_WA_NUMBER = "62"; // dipakai kalau server function gagal diakses
let cachedStoreConfig = null;

async function getStoreConfig() {
  if (cachedStoreConfig) return cachedStoreConfig;
  const defaults = { waNumber: FALLBACK_WA_NUMBER, ewallet: { dana: "", gopay: "", ovo: "" }, qrisImageUrl: "" };
  try {
    const res = await Promise.race([
      fetch("/api/store-config"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ]);
    if (!res.ok) {
      console.error(`Gagal ambil setting toko: /api/store-config balikin status ${res.status}`);
      return defaults;
    }
    const data = await res.json();
    cachedStoreConfig = {
      waNumber: data.waNumber || defaults.waNumber,
      ewallet: { dana: data.ewallet?.dana || "", gopay: data.ewallet?.gopay || "", ovo: data.ewallet?.ovo || "" },
      qrisImageUrl: data.qrisImageUrl || "",
    };
    return cachedStoreConfig;
  } catch (err) {
    console.error("Gagal ambil setting toko:", err);
    return defaults;
  }
}

async function getWaNumber() {
  const config = await getStoreConfig();
  return config.waNumber;
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
