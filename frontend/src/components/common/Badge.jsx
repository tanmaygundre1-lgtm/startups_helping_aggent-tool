const Badge = ({ children, variant = "neutral" }) => {
  const styles = {
    padding: "4px 8px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8rem",
    fontWeight: 600,
    background: variant === "accent" ? "var(--accent-soft)" : "var(--line)",
    color: variant === "accent" ? "var(--accent-dark)" : "var(--ink)",
  };

  return <span style={styles}>{children}</span>;
};

export default Badge;
