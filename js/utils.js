// js/utils.js — helper keamanan, dipakai di semua file yang nge-render
// data dari Firestore (produk, order, rating) ke HTML. WAJIB di-load
// SEBELUM products.js, admin-products.js, admin-orders.js, rating.js.

// Cegah stored XSS: escape karakter HTML sebelum dimasukin ke innerHTML.
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Validasi URL gambar: cuma izinin https + domain yang kita percaya.
// Nolak javascript:, data:, atau domain sembarangan (anti deface/phishing).
const ALLOWED_IMAGE_HOSTS = ["raw.githubusercontent.com", "firebasestorage.googleapis.com"];

function isValidImageUrl(url) {
  if (!url) return true; // gambar kosong itu valid (opsional)
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return ALLOWED_IMAGE_HOSTS.some((host) => u.hostname === host || u.hostname.endsWith("." + host));
  } catch {
    return false;
  }
}
