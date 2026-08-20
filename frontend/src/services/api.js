import axios from "axios";
import { auth } from "../config/firebase-config";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

export const syncCurrentUser = async (firebaseUser = auth.currentUser) => {
  if (!firebaseUser) {
    throw new Error("Authentication succeeded, but no Firebase user is available.");
  }

  const token = await firebaseUser.getIdToken();
  const response = await api.post(
    "/users/sync",
    {
      name: firebaseUser.displayName || "",
      profileImage: firebaseUser.photoURL || "",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

export default api;