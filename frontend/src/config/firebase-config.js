import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCUeMSYtdTXhmjPe4ddBWX_YoWGac-JlhE",
  authDomain: "innercollegestartupnetwork.firebaseapp.com",
  projectId: "innercollegestartupnetwork",
  storageBucket: "innercollegestartupnetwork.firebasestorage.app",
  messagingSenderId: "306401185578",
  appId: "1:306401185578:web:a38b1ce47e6f6797565853",
  measurementId: "G-X9CRGNE5JD"

};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const authPersistenceReady = setPersistence(auth, browserLocalPersistence);

const googleProvider = new GoogleAuthProvider();

// Force account selection screen on every login attempt
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export const ensureAuthPersistence = () => authPersistenceReady;

export { app, auth, googleProvider };