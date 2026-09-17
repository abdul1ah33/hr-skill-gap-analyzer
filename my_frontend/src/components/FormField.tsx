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
        <label className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          {label}
        </label>
      )}

      {children}

      {error && (
        <p className="mt-1 text-xs" style={{ color: "var(--destructive)" }}>{error}</p>
      )}
    </div>
  );
}

export default FormField;