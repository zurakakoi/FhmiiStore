// js/products.js — fetch & render produk (dipakai di index.html & produk.html)
// Non-module version, pakai variabel global `db` dari firebase-config.js

const PLACEHOLDER_IMG =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500' viewBox='0 0 400 500'%3E%3Crect width='400' height='500' fill='%23101B33'/%3E%3Ctext x='50%25' y='50%25' fill='%239CA3AF' font-family='sans-serif' font-size='20' text-anchor='middle' dy='.3em'%3EFhmii Store%3C/text%3E%3C/svg%3E";

function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(number || 0);
}

function renderStars(avg = 0) {
  const rounded = Math.round(avg);
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    stars += `<svg class="star ${i <= rounded ? "" : "empty"}" fill="currentColor" viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.5 6 .8-4.4 4.2 1 6-5.2-2.9-5.2 2.9 1-6L1.4 7.8l6-.8L10 1.5z"/></svg>`;
  }
  return stars;
}

function priceLabel(product) {
  if (product.variants && product.variants.length > 0) {
    const minPrice = Math.min(...product.variants.map((v) => v.price));
    return `Mulai ${formatRupiah(minPrice)}`;
  }
  return formatRupiah(product.price);
}

function productCard(product) {
  const img = (product.images && product.images[0]) || PLACEHOLDER_IMG;
  const typeLabel = product.type === "digital" ? "Digital" : "Food";
  const typeClass = product.type === "digital" ? "digital" : "food";

  return `
  <a href="/produk-detail?id=${product.id}" class="product-card reveal">
    <div class="product-thumb">
      <img src="${img}" alt="${product.name}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
      <span class="product-badge ${typeClass}">${typeLabel}</span>
    </div>
    <div class="product-body">
      <h3 class="product-name">${product.name}</h3>
      <p class="product-desc">${product.desc || ""}</p>
      <div class="product-rating">
        ${renderStars(product.ratingAvg)}
        <span class="count">(${product.ratingCount || 0})</span>
      </div>
      <div class="product-footer">
        <span class="product-price">${priceLabel(product)}</span>
        <span class="btn-ghost product-cta">Pesan</span>
      </div>
    </div>
  </a>`;
}

function skeletonCard() {
  return `
  <div class="skeleton-card">
    <div class="skeleton-thumb skeleton"></div>
    <div class="skeleton-lines">
      <div class="skeleton-line w-75 skeleton"></div>
      <div class="skeleton-line w-50 skeleton"></div>
      <div class="skeleton-line w-33 skeleton"></div>
    </div>
  </div>`;
}

function observeReveal(container) {
  const items = container.querySelectorAll(".reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  items.forEach((el) => io.observe(el));
}

async function renderProductList(containerId, { type = null, max = 50 } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Array.from({ length: 8 }).map(skeletonCard).join("");

  try {
    // Ambil semua produk (single-field orderBy, gak butuh composite index),
    // filter tipe dilakuin di JS biar gak perlu bikin index tambahan di Firestore.
    const snap = await db.collection("products").orderBy("createdAt", "desc").limit(max).get();

    let products = [];
    snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
    if (type === "digital" || type === "food") {
      products = products.filter((p) => p.type === type);
    }
    products.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));

    if (products.length === 0) {
      container.innerHTML = `
        <div class="state-message">
          <p class="title">Belum ada produk di kategori ini</p>
          <p>Coba lihat kategori lain, atau cek lagi nanti.</p>
        </div>`;
      return;
    }

    container.innerHTML = products.map(productCard).join("");
    observeReveal(container);
  } catch (err) {
    console.error("Gagal memuat daftar produk:", err);
    container.innerHTML = `
      <div class="state-message">
        <p class="title">Gagal memuat produk</p>
        <p>Coba muat ulang halaman.</p>
      </div>`;
  }
}

async function renderFeaturedProducts(containerId, max = 8) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = Array.from({ length: max }).map(skeletonCard).join("");

  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").limit(max).get();

    if (snap.empty) {
      container.innerHTML = `
        <div class="state-message">
          <p class="title">Belum ada produk</p>
          <p>Produk yang ditambahkan admin bakal muncul di sini.</p>
        </div>`;
      return;
    }

    const products = [];
    snap.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
    products.sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
    container.innerHTML = products.map(productCard).join("");
    observeReveal(container);
  } catch (err) {
    console.error("Gagal memuat produk:", err);
    container.innerHTML = `
      <div class="state-message">
        <p class="title">Gagal memuat produk</p>
        <p>Coba muat ulang halaman.</p>
      </div>`;
  }
}
