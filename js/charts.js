// js/charts.js — grafik penjualan area/spektrum (SVG murni, gak butuh
// library eksternal). Non-module, pakai formatRupiahAdmin dari admin-orders.js

function renderSalesChart(containerId, points) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!points || points.length === 0 || points.every((p) => p.value === 0)) {
    container.innerHTML = `<p class="muted" style="font-size:13px;">Belum ada penjualan di rentang ini.</p>`;
    return;
  }

  const width = 600, height = 200, padX = 8, padY = 16;
  const max = Math.max(...points.map((p) => p.value), 1);
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padX + i * stepX,
    y: height - padY - (p.value / max) * (height - padY * 2),
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${height - padY} L${coords[0].x.toFixed(1)},${height - padY} Z`;
  const total = points.reduce((sum, p) => sum + p.value, 0);

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="sales-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path d="${areaPath}" fill="url(#salesGradient)" />
      <path d="${linePath}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      ${coords.map((c) => `<circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="2.5" fill="var(--accent)"><title>${c.label}: ${formatRupiahAdmin(c.value)}</title></circle>`).join("")}
    </svg>
    <div class="sales-chart-labels">
      ${points.map((p) => `<span>${p.label}</span>`).join("")}
    </div>
    <p class="muted" style="font-size:12px;margin-top:10px;">Total periode ini: <strong style="color:var(--text);font-family:var(--font-mono);">${formatRupiahAdmin(total)}</strong></p>
  `;
}
