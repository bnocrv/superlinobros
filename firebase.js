// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDtTJI8yOlIMxR_EYC-2JpoBUlwStgaORA",
  authDomain: "lino-s-world.firebaseapp.com",
  projectId: "lino-s-world",
  storageBucket: "lino-s-world.firebasestorage.app",
  messagingSenderId: "65753250894",
  appId: "1:65753250894:web:dc50fc9592c8bc59a2d71f",
  measurementId: "G-LTY6NZBNR7",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
