import { useEffect, useRef } from 'react';

export function useChange<T>(callback: (newValue: T, oldValue: T) => void, value: T) {
  const previousValue = useRef<T>(value);

  useEffect(() => {
    if (previousValue.current !== value) {
      callback(value, previousValue.current);
      previousValue.current = value;
    }
  }, [value, callback]);
}
