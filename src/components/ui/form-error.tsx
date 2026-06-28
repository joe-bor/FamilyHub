interface FormErrorProps {
  message?: string;
  /**
   * Stable id so an input can reference this error via `aria-describedby`,
   * associating the message with its field for assistive tech.
   */
  id?: string;
}

export function FormError({ message, id }: FormErrorProps) {
  if (!message) return null;

  return (
    <p id={id} className="text-sm text-destructive mt-1" role="alert">
      {message}
    </p>
  );
}
