import { useRef } from 'react';

type DeferredPromise<T> = {
  resolve: (value: T) => void;
  reject: (value: unknown) => void;
  promise: Promise<T>;
};

export function useDeferredPromise<T>() {
  const deferRef = useRef<DeferredPromise<T> | null>(null);

  function defer() {
    const deferred = {} as DeferredPromise<T>;

    const promise = new Promise<T>((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });

    deferred.promise = promise;
    deferRef.current = deferred;
    return deferRef.current;
  }

  return { defer, deferRef: deferRef.current };
}
