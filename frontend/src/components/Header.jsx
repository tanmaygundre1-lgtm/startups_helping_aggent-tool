import { Link } from "react-router-dom";

const Header = () => {
  return (
    <nav
      style={{
        padding: "var(--spacing-md)",
        borderBottom: "1px solid #ccc",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Link
        to="/"
        style={{
          fontWeight: "bold",
          fontSize: "1.2rem",
          textDecoration: "none",
          color: "var(--color-neutral-text)",
        }}
      >
        StartupLink
      </Link>
      <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/profiles/founder">My Profile</Link>
        <Link to="/ideas/new">Create Idea</Link>
      </div>
    </nav>
  );
};

export default Header;
