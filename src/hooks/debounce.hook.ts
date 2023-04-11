import { useEffect, useState } from 'react';

function useDebounce<T>(value?: T, delay?: number): T | undefined {
  const [debouncedValue, setDebouncedValue] = useState<T>();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
