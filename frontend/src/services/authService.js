import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  auth,
  ensureAuthPersistence,
  googleProvider,
} from "../config/firebase-config";
let googleLoginPromise = null;

const getGoogleLoginError = (error) => {
  const messages = {
    "auth/popup-closed-by-user": "The Google sign-in popup was closed before login completed.",
    "auth/cancelled-popup-request": "A Google sign-in request is already in progress.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup. Allow popups and try again.",
  };

  return messages[error?.code] || error?.message || "Google login failed. Please try again.";
};

const authenticate = async (firebaseAuthentication) => {
  await ensureAuthPersistence();
  return firebaseAuthentication();
};

export const signup = async (email, password) =>
  authenticate(() => createUserWithEmailAndPassword(auth, email, password));

export const login = async (email, password) =>
  authenticate(() => signInWithEmailAndPassword(auth, email, password));

/**
 * Logs in a user using Google Authentication via Popup.
 */
export const loginWithGoogle = async () => {
  if (googleLoginPromise) return googleLoginPromise;

  googleLoginPromise = authenticate(() =>
    signInWithPopup(auth, googleProvider),
  )
    .then((result) => {
      console.log("[AUTH DEBUG] Firebase login successful", result.user.uid);
      return result;
    })
    .catch((error) => {
      const loginError = new Error(getGoogleLoginError(error));
      loginError.code = error?.code;
      loginError.authenticated = error?.authenticated || false;
      console.error("[AuthService] Google Login Error:", error);
      throw loginError;
    })
    .finally(() => {
      googleLoginPromise = null;
    });

  return googleLoginPromise;
};

/**
 * Logs out the current user.
 */
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[AuthService] Logout Error:", error);
    throw error;
  }
};