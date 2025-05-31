import { useEffect, useRef, useState } from 'react';
import { deepEqual } from 'src/util/utils';

export default function useDebounce<T>(value?: T, delay?: number): T | undefined {
  const [debouncedValue, setDebouncedValue] = useState<T>();
  const previousValue = useRef<T>();

  useEffect(() => {
    // Only set timer if value has actually changed (deep equality)
    if (!deepEqual(value, previousValue.current)) {
      const timer = setTimeout(() => {
        setDebouncedValue(value);
        previousValue.current = value;
      }, delay || 500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [value, delay]);

  return debouncedValue;
}
