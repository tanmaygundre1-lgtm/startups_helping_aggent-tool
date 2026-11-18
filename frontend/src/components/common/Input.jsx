const Input = ({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  hint,
  id,
  disabled = false,
  ...props
}) => {
  const inputId = id || `input-${label?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "field"}`;

  return (
    <div className="field">
      {label && (
        <label className="field-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={error ? "input input-error" : "input"}
        {...props}
      />
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
