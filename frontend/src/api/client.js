import axios from "axios";
import { auth } from "../config/firebase-config";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  const firebaseUser = auth.currentUser;

  if (firebaseUser) {
    const token = await firebaseUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.message;
    const normalizedError = new Error(
      backendMessage || "The request could not be completed. Please try again.",
    );

    normalizedError.status = error.response?.status;
    normalizedError.code = error.response?.data?.code;
    normalizedError.cause = error;
    return Promise.reject(normalizedError);
  },
);

export default client;