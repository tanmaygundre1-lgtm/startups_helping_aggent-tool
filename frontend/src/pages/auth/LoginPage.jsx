import { useState } from "react";
import { loginWithGoogle } from "../../services/authService";
import Button from "../../components/common/Button";

const LoginPage = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      await loginWithGoogle();
    } catch (loginError) {
      setError(loginError.message || "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <span className="state-kicker">StartupLink</span>
        <h1>Build with the right people.</h1>
        <p className="auth-copy">
          Sign in to continue to your founder and candidate workspace.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button
          className="auth-button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Connecting..." : "Continue with Google"}
        </Button>
      </section>
    </main>
  );
};

export default LoginPage;
