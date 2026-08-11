// js/firebase-config.js
// Pakai Firebase versi "compat" (bukan ES module) supaya bisa dibuka
// langsung lewat file:// tanpa perlu local server.
// Script CDN compat-nya dipanggil duluan di HTML sebelum file ini.

const firebaseConfig = {
  apiKey: "AIzaSyCyApT4lHJz8KhP_lVEOxCxRIAhEjIsTYQ",
  authDomain: "fhmii-store.vercel.app",
  projectId: "fhmii-store",
  storageBucket: "fhmii-store.firebasestorage.app",
  messagingSenderId: "456290836746",
  appId: "1:456290836746:web:1613a467d3e8e6ceb8daf3"
};

firebase.initializeApp(firebaseConfig);

// Dipakai global di file JS lain (theme.js, products.js, dst)
const db = firebase.firestore();

// auth & googleProvider cuma kedefinisi kalau firebase-auth-compat.js
// ikut di-load di halaman itu (misal admin/login.html gak butuh ini,
// jadi gak di-load, dan itu gak boleh bikin `db` ikut gagal)
let auth, googleProvider;
if (firebase.auth) {
  auth = firebase.auth();
  googleProvider = new firebase.auth.GoogleAuthProvider();
}
