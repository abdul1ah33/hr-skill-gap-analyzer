interface FormFieldProps {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

function FormField({
  label,
  error,
  children,
}: FormFieldProps) {
  return (
    <div>
      {label && (
        <label className="text-xs font-medium" style={{ color: "#6b7280" }}>
          {label}
        </label>
      )}

      {children}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{error}</p>
      )}
    </div>
  );
}

export default FormField;