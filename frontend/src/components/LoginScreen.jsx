import { useState } from "react";
import { loginWithGoogle } from "../services/authService";

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
    } catch (err) {
      setError("Login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "var(--spacing-lg)" }}>
      <h1>Welcome to Founder-Candidate Matcher</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && (
        <button
          onClick={handleLogin}
          style={{
            backgroundColor: "var(--color-primary-blue)",
            color: "white",
            border: "none",
            padding: "var(--spacing-sm) var(--spacing-lg)",
            borderRadius: "var(--spacing-xs)",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          Login with Google
        </button>
      )}
      {loading && <p>Logging in...</p>}
    </div>
  );
};

export default LoginScreen;
