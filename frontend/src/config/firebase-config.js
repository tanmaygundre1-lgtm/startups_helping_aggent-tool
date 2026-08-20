import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Changed initializeAuth to getAuth
const firebaseConfig = {  
  apiKey: "AIzaSyCUeMSYtdTXhmjPe4ddBWX_YoWGac-JlhE",
  authDomain: "innercollegestartupnetwork.firebaseapp.com",
  projectId: "innercollegestartupnetwork",
  storageBucket: "innercollegestartupnetwork.firebasestorage.app",
  messagingSenderId: "306401185578",
  appId: "1:306401185578:web:a38b1ce47e6f6797565853",
  measurementId: "G-X9CRGNE5JD"

};

const app = initializeApp(firebaseConfig);

// getAuth automatically includes local persistence and popup resolvers
const auth = getAuth(app); 

const googleProvider = new GoogleAuthProvider();

// Force account selection screen on every login attempt
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export { app, auth, googleProvider };