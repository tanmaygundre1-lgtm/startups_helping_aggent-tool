import {
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../config/firebase-config";

/**
 * Logs in a user using Google Authentication via Popup.
 */
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error) {
    console.error("[AuthService] Google Login Error:", error);
    throw error;
  }
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