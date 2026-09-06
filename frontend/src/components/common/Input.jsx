const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  ...props
}) => {
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontWeight: 600 }}>
          {label}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px',
          border: error ? '1px solid var(--danger)' : '1px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '1rem',
        }}
        {...props}
      />
      {error && <p style={{ color: 'var(--danger)', fontSize: '0.9rem', marginTop: '4px' }}>{error}</p>}
    </div>
  );
};

export default Input;
