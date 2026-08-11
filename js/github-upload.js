// github-upload.js
// js/github-upload.js — upload gambar produk langsung ke repo GitHub
// (assets/products/) lewat GitHub Contents API, balikin raw URL-nya.
// Non-module, dipakai di admin/produk.html.

const GITHUB_OWNER = "zurakakoi";
const GITHUB_REPO = "Fhmii-Store";
const GITHUB_BRANCH = "main";
const GITHUB_TOKEN_KEY = "fhmii-github-token";

function getGithubToken() {
  return localStorage.getItem(GITHUB_TOKEN_KEY) || "";
}

function saveGithubToken(token) {
  localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
    reader.readAsDataURL(file);
  });
}

function sanitizeFileName(name) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/-+/g, "-");
}

async function uploadImageToGithub(file, folder = "assets/products") {
  const token = getGithubToken();
  if (!token) {
    throw new Error("Token GitHub belum diisi. Isi dulu di bagian Pengaturan GitHub.");
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File yang dipilih bukan gambar.");
  }

  const base64Content = await fileToBase64(file);
  const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
  const path = `${folder}/${fileName}`;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload gambar produk: ${fileName}`,
        content: base64Content,
        branch: GITHUB_BRANCH,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Token GitHub salah/kadaluarsa.");
    if (res.status === 404) throw new Error("Repo tidak ditemukan / token gak punya akses.");
    throw new Error(err.message || "Gagal upload ke GitHub.");
  }

  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;
}
