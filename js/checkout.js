// js/checkout.js — bangun pesan WhatsApp dari data order & simpan order ke Firestore
// Non-module, pakai `db` global & buildWaLink() dari site-config.js

function buildOrderMessage(order) {
  const lines = [`Halo min 👋, saya mau pesan:`, ``, `🛍️ *${order.productName}*`];

  if (order.variantLabel) lines.push(`⏱️ Durasi: _${order.variantLabel}_`);
  if (order.qty) lines.push(`🔢 Jumlah: \`${order.qty}\``);
  lines.push(`💰 Harga: *${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(order.price)}*`);

  if (order.fulfillment === "delivery") {
    lines.push(``, `🚚 Metode: _Diantar_`, `📍 Alamat: ${order.address}`);
  } else if (order.fulfillment === "pickup") {
    lines.push(``, `🏠 Metode: _Ambil di tempat_`);
  }

  const paymentLabel = { cod: "Bayar di tempat", ewallet: "E-wallet (Dana/Gopay/OVO)", qris: "QRIS" }[order.paymentMethod] || order.paymentMethod;
  lines.push(``, `💳 Pembayaran: _${paymentLabel}_`);
  if (order.senderName) lines.push(`👤 Nama pengirim: ${order.senderName}`);

  if (order.notes) lines.push(``, `📝 Catatan: ${order.notes}`);

  lines.push(``, `Nama saya: *${order.customerName}* 🙏`);

  return lines.join("\n");
}

async function saveOrder(order) {
  await db.collection("orders").add({
    productId: order.productId,
    productName: order.productName,
    type: order.type,
    variantLabel: order.variantLabel || null,
    qty: order.qty || 1,
    price: order.price,
    fulfillment: order.fulfillment || null,
    address: order.address || null,
    paymentMethod: order.paymentMethod,
    senderName: order.senderName || null,
    notes: order.notes || "",
    customerName: order.customerName,
    buyerEmail: order.buyerEmail || null,
    buyerWhatsapp: order.buyerWhatsapp || null,
    status: "pending",
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  // Naikin hitungan "peminat" produk biar urutan populer kepengaruh.
  // Gagal di sini gak boleh gagalin keseluruhan order, jadi dipisah try/catch.
  try {
    await db.collection("products").doc(order.productId).update({
      orderCount: firebase.firestore.FieldValue.increment(1),
    });
  } catch (err) {
    console.error("Gagal update orderCount produk:", err);
  }
}
