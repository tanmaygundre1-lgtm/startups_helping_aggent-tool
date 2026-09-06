import { useState } from "react";
import { logout } from "../services/authService";

const Dashboard = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (err) {
      setError("Logout failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ textAlign: "center", padding: "var(--spacing-lg)" }}>
      <h1>Dashboard</h1>
      {user && (
        <div>
          <p>Welcome, {user.displayName || user.email}!</p>
          {user.photoURL && (
            <img
              src={user.photoURL}
              alt="Profile"
              style={{ width: "100px", borderRadius: "50%" }}
            />
          )}
          <nav>
            <ul style={{ listStyle: "none", padding: 0 }}>
              <li>
                <a href="/profiles/founder">Founder Profile</a>
              </li>
              <li>
                <a href="/profiles/candidate">Candidate Profile</a>
              </li>
              <li>
                <a href="/ideas/new">Create Idea</a>
              </li>
            </ul>
          </nav>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "var(--color-primary-blue)",
              color: "white",
              border: "none",
              padding: "var(--spacing-sm) var(--spacing-lg)",
              borderRadius: "var(--spacing-xs)",
              cursor: "pointer",
              marginTop: "var(--spacing-md)",
            }}
          >
            Logout
          </button>
        </div>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {loading && <p>Processing...</p>}
    </div>
  );
};

export default Dashboard;
