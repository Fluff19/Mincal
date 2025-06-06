// firebase-fs.js
// firebase-fs.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBxV_MettYaPvXN8RGnVVweSl6rmxKm2us",
  authDomain: "mincal0.firebaseapp.com",
  databaseURL: "https://mincal0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mincal0",
  storageBucket: "mincal0.firebasestorage.app",
  messagingSenderId: "805759547819",
  appId: "1:805759547819:web:2465054c1498029c463aee",
  measurementId: "G-37BLRDEB6X"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function pathRef(path) {
  return ref(db, path.replace(".json", ""));
}

export async function readFile(path) {
  const snapshot = await get(pathRef(path));
  return snapshot.exists() ? JSON.stringify(snapshot.val()) : "{}";
}

export async function writeFile(path, data) {
  const json = typeof data === "string" ? JSON.parse(data) : data;
  await set(pathRef(path), json);
}
