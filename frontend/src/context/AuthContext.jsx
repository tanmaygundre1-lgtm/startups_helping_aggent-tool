import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, ensureAuthPersistence } from "../config/firebase-config";
import { getProfile, syncUser } from "../api/userApi";
import { logout as signOut } from "../services/authService";
import { AuthContext } from "./AuthContextValue";

const getErrorMessage = (error) =>
  error?.message || "We could not load your account. Please try again.";

export function AuthProvider({ children }) {
  console.log("[AUTH DEBUG] AuthContext rendered");
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadBackendProfile = async (currentUser) => {
    setLoading(true);
    setError("");
    console.log("[AUTH DEBUG] Starting backend sync for", currentUser.uid);

    try {
      await ensureAuthPersistence();
      await syncUser(currentUser);
      console.log("[AUTH DEBUG] Backend sync success");
      const profileResponse = await getProfile();
      console.log(
        "[AUTH DEBUG] Profile response received, completed:",
        profileResponse.user.profileCompleted,
      );
      setBackendUser(profileResponse.user);
    } catch (requestError) {
      setBackendUser(null);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    console.log("[AUTH DEBUG] Registering onAuthStateChanged listener");

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!active) return;
      console.log(
        "[AUTH DEBUG] onAuthStateChanged callback fired - user:",
        currentUser?.uid || "null",
      );

      setFirebaseUser(currentUser);
      if (!currentUser) {
        setBackendUser(null);
        setError("");
        setLoading(false);
        return;
      }

      await loadBackendProfile(currentUser);
    });
    console.log("[AUTH DEBUG] Listener registered");

    return () => {
      console.log("[AUTH DEBUG] AuthContext listener cleanup");
      active = false;
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!auth.currentUser) return null;

    setError("");
    try {
      const profileResponse = await getProfile();
      setBackendUser(profileResponse.user);
      return profileResponse.user;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw requestError;
    }
  };

  const logout = async () => {
    await signOut();
    setFirebaseUser(null);
    setBackendUser(null);
  };

  const value = useMemo(
    () => ({
      firebaseUser,
      backendUser,
      profile: backendUser,
      profileType: backendUser?.profileType || null,
      profileCompleted: backendUser?.profileCompleted === true,
      loading,
      error,
      refreshProfile,
      logout,
    }),
    [backendUser, error, firebaseUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
