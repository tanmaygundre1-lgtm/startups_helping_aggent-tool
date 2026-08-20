import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./config/firebase-config";
import { loginWithGoogle, logout } from "./services/authService";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Listen for login/logout state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;

    setErrorMessage("");
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
      setErrorMessage(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      {user ? (
        <div className="profile-card">
          {errorMessage ? (
            <p role="alert">{errorMessage}</p>
          ) : (
            <h2 style={{ color: "green" }}>
              Your login is successfully completed!
            </h2>
          )}
          <img
            src={user.photoURL}
            alt="Profile"
            style={{ borderRadius: "50%", width: "80px" }}
          />
          <h3>Welcome, {user.displayName}</h3>
          <p>{user.email}</p>
          <button
            onClick={handleLogout}
            style={{ padding: "10px", marginTop: "10px" }}
          >
            Logout
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            style={{ padding: "10px 20px", fontSize: "16px" }}
          >
            {isLoggingIn ? "Opening Google Login..." : "Login with Google"}
          </button>
          {errorMessage && <p role="alert">{errorMessage}</p>}
        </>
      )}
    </div>
  );
}

export default App;
