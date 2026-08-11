// js/store-hours.js — jam operasional toko (khusus produk food, karena
// dimasak pas ada order biar tetep fresh). Produk digital gak kena aturan ini.

const STORE_HOURS = {
  weekday: { start: 15, end: 19 }, // Senin-Jumat 15.00-19.00
  weekend: { start: 6, end: 19 },  // Sabtu-Minggu 06.00-19.00
};

function isWeekend(date) {
  const day = date.getDay(); // 0 = Minggu, 6 = Sabtu
  return day === 0 || day === 6;
}

function isStoreOpen(date = new Date()) {
  const range = isWeekend(date) ? STORE_HOURS.weekend : STORE_HOURS.weekday;
  const hourDecimal = date.getHours() + date.getMinutes() / 60;
  return hourDecimal >= range.start && hourDecimal < range.end;
}

function pad(n) { return String(n).padStart(2, "0"); }

function storeStatusMessage(date = new Date()) {
  if (isStoreOpen(date)) {
    const range = isWeekend(date) ? STORE_HOURS.weekend : STORE_HOURS.weekday;
    return { open: true, text: `Buka sekarang · tutup jam ${pad(range.end)}.00` };
  }

  // Cari kapan buka berikutnya
  const day = date.getDay();
  const hour = date.getHours();

  if (!isWeekend(date) && hour < STORE_HOURS.weekday.start) {
    return { open: false, text: "Tutup · buka jam 15.00 hari ini" };
  }
  if (isWeekend(date) && hour < STORE_HOURS.weekend.start) {
    return { open: false, text: "Tutup · buka jam 06.00 hari ini" };
  }

  // Udah lewat jam tutup hari ini, cek besok
  const tomorrow = new Date(date);
  tomorrow.setDate(date.getDate() + 1);
  const tomorrowIsWeekend = isWeekend(tomorrow);
  const nextStart = tomorrowIsWeekend ? STORE_HOURS.weekend.start : STORE_HOURS.weekday.start;
  return { open: false, text: `Tutup · buka besok jam ${pad(nextStart)}.00` };
}
