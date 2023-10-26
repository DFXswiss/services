import { useEffect, useRef } from 'react';
import { AbortError } from '../util/abort-error';

type DeferredPromise<T> = {
  resolve: (value: T) => void;
  reject: (value: unknown) => void;
  promise: Promise<T>;
};

export function useDeferredPromise<T>(): [() => Promise<T>, DeferredPromise<T> | null] {
  const deferRef = useRef<DeferredPromise<T> | null>(null);

  useEffect(() => {
    return () => deferRef.current?.reject(new AbortError());
  }, []);

  function defer(): Promise<T> {
    const deferred = {} as DeferredPromise<T>;

    const promise = new Promise<T>((resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });

    deferred.promise = promise;
    deferRef.current = deferred;

    return deferRef.current.promise;
  }

  return [defer, deferRef.current];
}
