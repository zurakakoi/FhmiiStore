// js/charts.js — grafik penjualan bulanan sederhana (CSS bar chart, gak
// butuh library eksternal). Non-module, pakai formatRupiahAdmin dari admin-orders.js

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function renderSalesChart(containerId, monthlyData) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b));
  const last6 = entries.slice(-6);

  if (last6.length === 0) {
    container.innerHTML = `<p class="muted" style="font-size:13px;">Belum ada penjualan selesai.</p>`;
    return;
  }

  const max = Math.max(...last6.map(([, v]) => v));
  container.innerHTML = `
    <div class="sales-chart">
      ${last6.map(([key, value]) => {
        const [, m] = key.split("-");
        const heightPct = max > 0 ? Math.max((value / max) * 100, 4) : 4;
        return `
        <div class="sales-bar-col">
          <div class="sales-bar-value">${formatRupiahAdmin(value)}</div>
          <div class="sales-bar-track"><div class="sales-bar" style="height:${heightPct}%"></div></div>
          <div class="sales-bar-label">${MONTH_NAMES[Number(m) - 1]}</div>
        </div>`;
      }).join("")}
    </div>`;
}
