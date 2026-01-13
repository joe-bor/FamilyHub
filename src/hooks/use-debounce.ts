import { useEffect, useState } from "react";

/**
 * Debounce a value by a specified delay.
 * Returns the debounced value that only updates after the delay has passed.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 *
 * @example
 * const searchTerm = useDebounce(inputValue, 500);
 * // searchTerm only updates 500ms after inputValue stops changing
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
