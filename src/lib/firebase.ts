import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBLFaXuZdWymqsCFUOm5AXUcScAQU7-Z7c",
  authDomain: "guzwa-fa08a.firebaseapp.com",
  projectId: "guzwa-fa08a",
  storageBucket: "guzwa-fa08a.firebasestorage.app",
  messagingSenderId: "44176577069",
  appId: "1:44176577069:web:65173b0b8971940c279ea4",
  measurementId: "G-PCWPHE9587",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
