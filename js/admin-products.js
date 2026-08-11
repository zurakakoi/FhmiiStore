// js/admin-products.js — CRUD produk dari sisi admin.
// Non-module, pakai `db` global dari firebase-config.js & getStoredPin() dari admin-auth.js

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

async function addProduct(formData, onDone) {
  const pin = getStoredPin();
  try {
    await db.collection("products").add({
      name: formData.name,
      type: formData.type,
      price: Number(formData.price) || 0,
      variants: formData.variants || [],
      desc: formData.desc || "",
      images: formData.imageUrl ? [formData.imageUrl] : [],
      ratingAvg: 0,
      ratingCount: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      pin: pin, // dibutuhkan buat lolos Firestore rules (lihat catatan keamanan di README)
    });
    onDone(true);
  } catch (err) {
    console.error("Gagal menambah produk:", err);
    onDone(false, err.message);
  }
}

async function updateProduct(productId, formData, onDone) {
  const pin = getStoredPin();
  try {
    const updateData = {
      name: formData.name,
      type: formData.type,
      price: Number(formData.price) || 0,
      variants: formData.variants || [],
      desc: formData.desc || "",
      pin: pin, // dibutuhkan buat lolos Firestore rules
    };
    if (formData.imageUrl) {
      updateData.images = [formData.imageUrl];
    }
    await db.collection("products").doc(productId).update(updateData);
    onDone(true);
  } catch (err) {
    console.error("Gagal mengupdate produk:", err);
    onDone(false, err.message);
  }
}

async function getProduct(productId) {
  const doc = await db.collection("products").doc(productId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function deleteProduct(productId) {
  try {
    await db.collection("products").doc(productId).delete();
    return true;
  } catch (err) {
    console.error("Gagal menghapus produk:", err);
    return false;
  }
}

function adminProductRow(product) {
  const img = (product.images && product.images[0]) || "";
  const typeLabel = product.type === "digital" ? "Digital" : "Food";
  const priceInfo =
    product.variants && product.variants.length > 0
      ? `${product.variants.length} varian, mulai Rp${Math.min(...product.variants.map((v) => v.price)).toLocaleString("id-ID")}`
      : `Rp${(product.price || 0).toLocaleString("id-ID")}`;
  return `
  <div class="admin-list-item" data-id="${product.id}">
    ${img ? `<img src="${img}" alt="${product.name}" />` : `<div class="brand-logo-fallback" style="width:44px;height:44px;border-radius:8px;">${typeLabel[0]}</div>`}
    <div class="info">
      <p class="name">${product.name}</p>
      <p class="meta">${typeLabel} · ${priceInfo}</p>
    </div>
    <button class="btn-ghost" style="font-size:12px;padding:6px 12px;" data-edit="${product.id}">Edit</button>
    <button class="btn-danger" data-delete="${product.id}">Hapus</button>
  </div>`;
}

async function renderAdminProductList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<p class="muted" style="font-size:13px;">Memuat produk...</p>`;

  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    if (snap.empty) {
      container.innerHTML = `<p class="muted" style="font-size:13px;">Belum ada produk. Tambah lewat form di samping.</p>`;
      return;
    }
    const products = [];
    snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
    container.innerHTML = products.map(adminProductRow).join("");

    container.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Yakin mau hapus produk ini?")) return;
        btn.textContent = "...";
        const ok = await deleteProduct(btn.dataset.delete);
        if (ok) {
          btn.closest(".admin-list-item").remove();
          showToast("Produk dihapus");
        } else {
          btn.textContent = "Hapus";
          showToast("Gagal menghapus produk");
        }
      });
    });

    container.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof window.onEditProduct === "function") {
          window.onEditProduct(btn.dataset.edit);
        }
      });
    });
  } catch (err) {
    console.error("Gagal memuat produk admin:", err);
    container.innerHTML = `<p class="muted" style="font-size:13px;">Gagal memuat produk.</p>`;
  }
}
