const Button = ({
  children,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  className = "",
  size = "md",
  loading = false,
  ...props
}) => {
  const baseClass = `button button-${variant} button-${size}`;

  return (
    <button
      type={type}
      className={`${baseClass} ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={onClick}
      {...props}
    >
      {loading ? <span className="button-loading" aria-hidden="true" /> : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;
