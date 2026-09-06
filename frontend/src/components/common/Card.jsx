const Card = ({ children, className = "" }) => {
  return (
    <div
      className={className}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-lg)",
      }}
    >
      {children}
    </div>
  );
};

export default Card;
