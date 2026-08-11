// js/admin-orders.js — kelola pesanan di dashboard admin (pending & riwayat)
// Non-module, pakai `db` global & getStoredPin() dari auth.js

function formatRupiahAdmin(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);
}

const ICON_MAIL = `<svg class="inline-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`;
const ICON_PHONE = `<svg class="inline-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.97.76l1.1 4.4a1 1 0 01-.5 1.12l-2.1 1.2a11.05 11.05 0 005.5 5.5l1.2-2.1a1 1 0 011.12-.5l4.4 1.1a1 1 0 01.76.97V19a2 2 0 01-2 2h-1C9.6 21 3 14.4 3 6V5z"/></svg>`;
const ICON_BOX = `<svg class="inline-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`;
const ICON_CHECK = `<svg class="inline-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;

function normalizeWaNumber(num) {
  let digits = (num || "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (!digits.startsWith("62")) digits = "62" + digits;
  return digits;
}

function buildAccountMessage(order, panel) {
  const activeType = panel.querySelector("[data-delivery-type].selected").dataset.deliveryType;
  const lines = [`Halo ${order.customerName}, terima kasih udah pesan *${order.productName}* (${order.variantLabel || ""}) di Fhmii Store!`, ``, `Berikut data akun kamu:`];

  if (activeType === "invite") {
    const link = panel.querySelector(".delivery-invite").value.trim();
    if (!link) { alert("Isi link invite dulu."); return null; }
    lines.push(`Link Invite: ${link}`);
  } else {
    const username = panel.querySelector(".delivery-username").value.trim();
    const password = panel.querySelector(".delivery-password").value.trim();
    if (!username || !password) { alert("Isi email/username & password dulu."); return null; }
    lines.push(`Email/Username: ${username}`, `Password: ${password}`);
  }

  lines.push(``, `Selamat menikmati! Kalau ada kendala, langsung balas pesan ini ya.`);
  return lines.join("\n");
}

function buildFoodStatusMessage(order, statusText) {
  const paymentLabel = { cod: "Bayar di tempat", dana: "Dana", gopay: "GoPay", ovo: "OVO", qris: "QRIS" }[order.paymentMethod] || order.paymentMethod;
  const lines = [
    `Halo ${order.customerName}, ${statusText}`,
    ``,
    `Detail pesanan kamu:`,
    `${order.productName} x${order.qty || 1}`,
    `Total: ${formatRupiahAdmin(order.price)}`,
    `Metode: ${order.fulfillment === "delivery" ? "Diantar" : "Ambil di tempat"}`,
  ];
  if (order.address) lines.push(`Alamat: ${order.address}`);
  lines.push(`Bayar: ${paymentLabel}`);
  if (order.notes) lines.push(`Catatan: ${order.notes}`);
  return lines.join("\n");
}

function orderRow(order) {
  const paymentLabel = { cod: "Bayar di tempat", dana: "Dana", gopay: "GoPay", ovo: "OVO", qris: "QRIS" }[order.paymentMethod] || order.paymentMethod;
  const details = [
    order.variantLabel ? `Durasi: ${order.variantLabel}` : null,
    order.qty > 1 ? `Jumlah: ${order.qty}` : null,
    order.fulfillment ? `Metode: ${order.fulfillment === "delivery" ? "Diantar" : "Ambil di tempat"}` : null,
    order.address ? `Alamat: ${order.address}` : null,
    `Bayar: ${paymentLabel}`,
    order.senderName ? `Pengirim: ${order.senderName}` : null,
    order.notes ? `Catatan: ${order.notes}` : null,
  ].filter(Boolean).join(" · ");

  const contactLine = (order.type === "digital" || order.type === "food")
    ? `<div class="contact-line">${order.buyerEmail ? `<span>${ICON_MAIL}${order.buyerEmail}</span>` : ""}${order.buyerWhatsapp ? `<span>${ICON_PHONE}${order.buyerWhatsapp}</span>` : ""}</div>`
    : "";

  const foodChatPanel = order.type === "food" && order.buyerWhatsapp ? `
    <button class="btn-ghost" style="font-size:12px;padding:6px 12px;margin-top:8px;display:inline-flex;align-items:center;" data-toggle-chat="${order.id}">${ICON_PHONE}Chat Pembeli</button>
    <div class="delivery-panel" id="chat-${order.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
      <p class="option-label" style="margin-bottom:8px;">Kirim update status</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <button class="btn-ghost" style="font-size:13px;text-align:left;padding:10px 14px;" data-status-msg="${order.id}" data-status-text="pesanan kamu lagi diproses ya, ditunggu sebentar.">Pesanan Diproses</button>
        <button class="btn-ghost" style="font-size:13px;text-align:left;padding:10px 14px;" data-status-msg="${order.id}" data-status-text="${order.fulfillment === "delivery" ? "pesanan kamu udah otw diantar." : "pesanan kamu udah siap, silakan diambil ya."}">${order.fulfillment === "delivery" ? "Sedang Diantar" : "Siap Diambil"}</button>
        <button class="btn-ghost" style="font-size:13px;text-align:left;padding:10px 14px;" data-status-msg="${order.id}" data-status-text="pesanan kamu udah selesai. Makasih udah order di Fhmii Store!">Pesanan Selesai</button>
      </div>
    </div>
  ` : "";

  const deliveryPanel = order.type === "digital" ? `
    <button class="btn-ghost" style="font-size:12px;padding:6px 12px;margin-top:8px;margin-right:8px;display:inline-flex;align-items:center;" data-toggle-delivery="${order.id}">${ICON_BOX}Kirim Data Akun</button>
    <div class="delivery-panel" id="delivery-${order.id}" style="display:none;margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
      <div class="pill-options" style="margin-bottom:10px;">
        <button type="button" class="pill-option selected" data-delivery-type="invite">Link Invite</button>
        <button type="button" class="pill-option" data-delivery-type="credentials">Email/Username + Password</button>
      </div>
      <div class="field delivery-invite-field" style="margin-bottom:10px;">
        <input type="text" class="delivery-invite" placeholder="Link invite (misal link Canva)" />
      </div>
      <div class="delivery-cred-field" style="display:none;">
        <div class="field" style="margin-bottom:10px;">
          <input type="text" class="delivery-username" placeholder="Email / Username akun" />
        </div>
        <div class="field" style="margin-bottom:10px;">
          <input type="text" class="delivery-password" placeholder="Password akun" />
        </div>
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn-primary" style="font-size:13px;padding:8px 14px;" data-send-wa="${order.id}" ${!order.buyerWhatsapp ? "disabled title='Nomor WA gak ada'" : ""}>Kirim via WhatsApp</button>
        <button class="btn-ghost" style="font-size:13px;padding:8px 14px;" data-send-email="${order.id}" ${!order.buyerEmail ? "disabled title='Email gak ada'" : ""}>Kirim via Email</button>
      </div>
    </div>
  ` : "";

  return `
  <div class="admin-card" data-order="${order.id}" style="margin-bottom:12px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
      <div>
        <p style="font-weight:600;margin:0 0 2px;">${order.productName}</p>
        <p class="muted" style="font-size:12px;margin:0 0 4px;">Pemesan: ${order.customerName}</p>
        ${contactLine ? `<div class="muted font-mono" style="font-size:11px;margin:0 0 8px;">${contactLine}</div>` : ""}
      </div>
      <span class="font-mono" style="font-weight:600;font-size:14px;white-space:nowrap;">${formatRupiahAdmin(order.price)}</span>
    </div>
    <p class="muted" style="font-size:12px;line-height:1.6;margin:0 0 12px;">${details}</p>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      ${order.status === "pending"
        ? `<button class="btn-primary" style="font-size:13px;padding:8px 16px;" data-complete="${order.id}">Tandai Selesai</button>`
        : `<span class="status-done">${ICON_CHECK}Selesai</span>`}
      <button class="btn-danger" data-delete-order="${order.id}">Hapus</button>
    </div>
    ${deliveryPanel}
    ${foodChatPanel}
  </div>`;
}

async function renderAdminOrders(containerId, status) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<p class="muted" style="font-size:13px;">Memuat pesanan...</p>`;

  try {
    const snap = await db.collection("orders").where("status", "==", status).orderBy("createdAt", "desc").get();
    if (snap.empty) {
      container.innerHTML = `<p class="muted" style="font-size:13px;">${status === "pending" ? "Belum ada pesanan masuk." : "Belum ada riwayat pesanan selesai."}</p>`;
      return;
    }
    const orders = [];
    snap.forEach((doc) => orders.push({ id: doc.id, ...doc.data() }));
    container.innerHTML = orders.map(orderRow).join("");

    container.querySelectorAll("[data-complete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        btn.textContent = "Menyimpan...";
        btn.disabled = true;
        try {
          await db.collection("orders").doc(btn.dataset.complete).update({
            status: "selesai",
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            pin: getStoredPin(),
          });
          renderAdminOrders(containerId, status);
          if (typeof window.onOrderCompleted === "function") window.onOrderCompleted();
        } catch (err) {
          console.error("Gagal update status pesanan:", err);
          btn.textContent = "Tandai Selesai";
          btn.disabled = false;
        }
      });
    });

    // ---- Panel "Kirim Data Akun" (khusus produk digital) ----
    container.querySelectorAll("[data-delete-order]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Yakin mau hapus pesanan ini? Gak bisa dibalikin lagi.")) return;
        btn.textContent = "...";
        btn.disabled = true;
        try {
          await deleteOrder(btn.dataset.deleteOrder);
          btn.closest(".admin-card").remove();
        } catch (err) {
          console.error("Gagal menghapus pesanan:", err);
          btn.textContent = "Hapus";
          btn.disabled = false;
        }
      });
    });

    container.querySelectorAll("[data-toggle-delivery]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = document.getElementById(`delivery-${btn.dataset.toggleDelivery}`);
        if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
      });
    });

    container.querySelectorAll("[data-toggle-chat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const panel = document.getElementById(`chat-${btn.dataset.toggleChat}`);
        if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
      });
    });

    container.querySelectorAll("[data-status-msg]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = orders.find((o) => o.id === btn.dataset.statusMsg);
        const message = buildFoodStatusMessage(order, btn.dataset.statusText);
        window.open(`https://wa.me/${normalizeWaNumber(order.buyerWhatsapp)}?text=${encodeURIComponent(message)}`, "_blank");
      });
    });

    container.querySelectorAll(".delivery-panel").forEach((panel) => {
      const pills = panel.querySelectorAll("[data-delivery-type]");
      const inviteField = panel.querySelector(".delivery-invite-field");
      const credField = panel.querySelector(".delivery-cred-field");
      pills.forEach((pill) => {
        pill.addEventListener("click", () => {
          pills.forEach((p) => p.classList.remove("selected"));
          pill.classList.add("selected");
          const isInvite = pill.dataset.deliveryType === "invite";
          inviteField.style.display = isInvite ? "block" : "none";
          credField.style.display = isInvite ? "none" : "block";
        });
      });
    });

    container.querySelectorAll("[data-send-wa]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = orders.find((o) => o.id === btn.dataset.sendWa);
        const panel = document.getElementById(`delivery-${order.id}`);
        const message = buildAccountMessage(order, panel);
        if (!message) return;
        window.open(`https://wa.me/${normalizeWaNumber(order.buyerWhatsapp)}?text=${encodeURIComponent(message)}`, "_blank");
      });
    });

    container.querySelectorAll("[data-send-email]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const order = orders.find((o) => o.id === btn.dataset.sendEmail);
        const panel = document.getElementById(`delivery-${order.id}`);
        const message = buildAccountMessage(order, panel);
        if (!message) return;
        const subject = `Data Akun ${order.productName} — Fhmii Store`;
        window.location.href = `mailto:${order.buyerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      });
    });
  } catch (err) {
    console.error("Gagal memuat pesanan:", err);
    container.innerHTML = `<p class="muted" style="font-size:13px;">Gagal memuat pesanan.</p>`;
  }
}

const CHART_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const CHART_DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

// Ambil data penjualan (order status "selesai") dikelompokkan per hari/bulan
// sesuai rentang yang dipilih: '7d', '30d', atau '1y'.
async function getSalesSeries(range) {
  const snap = await db.collection("orders").where("status", "==", "selesai").get();
  const now = new Date();
  const points = [];

  if (range === "7d" || range === "30d") {
    const days = range === "7d" ? 7 : 30;
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      buckets[d.toISOString().slice(0, 10)] = 0;
    }
    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.completedAt) return;
      const key = data.completedAt.toDate().toISOString().slice(0, 10);
      if (key in buckets) buckets[key] += data.price || 0;
    });
    const keys = Object.keys(buckets);
    keys.forEach((key, i) => {
      const d = new Date(key);
      const showLabel = days === 7 || i % 5 === 0 || i === keys.length - 1;
      const label = days === 7 ? CHART_DAY_NAMES[d.getDay()] : (showLabel ? String(d.getDate()) : "");
      points.push({ label, value: buckets[key] });
    });
  } else {
    const buckets = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
    }
    snap.forEach((doc) => {
      const data = doc.data();
      if (!data.completedAt) return;
      const d = data.completedAt.toDate();
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key in buckets) buckets[key] += data.price || 0;
    });
    Object.entries(buckets).forEach(([key, value]) => {
      const [, m] = key.split("-");
      points.push({ label: CHART_MONTH_NAMES[Number(m) - 1], value });
    });
  }

  return points;
}

// Ringkasan buat dashboard: jumlah pending, total omzet, jumlah order selesai
async function getOrderStats() {
  const [pendingSnap, doneSnap] = await Promise.all([
    db.collection("orders").where("status", "==", "pending").get(),
    db.collection("orders").where("status", "==", "selesai").get(),
  ]);
  let totalRevenue = 0;
  doneSnap.forEach((doc) => { totalRevenue += doc.data().price || 0; });
  return { pendingCount: pendingSnap.size, doneCount: doneSnap.size, totalRevenue };
}

async function deleteOrder(orderId) {
  await db.collection("orders").doc(orderId).delete();
}

// Rekap penjualan bulanan dari order yang statusnya "selesai"
async function getMonthlySales() {
  const snap = await db.collection("orders").where("status", "==", "selesai").get();
  const monthly = {};
  snap.forEach((doc) => {
    const data = doc.data();
    if (!data.completedAt) return;
    const date = data.completedAt.toDate();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthly[key] = (monthly[key] || 0) + (data.price || 0);
  });
  return monthly;
}
