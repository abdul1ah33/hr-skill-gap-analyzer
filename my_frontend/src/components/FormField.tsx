interface FormFieldProps {
  label: string;
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
      <label>{label}</label>

      {children}

      {error && (
        <p>{error}</p>
      )}
    </div>
  );
}

export default FormField;