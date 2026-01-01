// Mock @dfx.swiss/react to avoid ES module issues
jest.mock('@dfx.swiss/react', () => ({}));
jest.mock('src/dto/safe.dto', () => ({}));

import { renderHook, act } from '@testing-library/react';
import useDebounce from '../hooks/debounce.hook';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return undefined initially', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBeUndefined();
  });

  it('should update value after delay', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('test');
  });

  it('should use default delay of 500ms', () => {
    const { result } = renderHook(() => useDebounce('test'));
    
    act(() => {
      jest.advanceTimersByTime(499);
    });
    expect(result.current).toBeUndefined();
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('test');
  });

  it('should debounce rapid value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );
    
    // Change value before delay completes
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: 'second' });
    
    act(() => {
      jest.advanceTimersByTime(200);
    });
    rerender({ value: 'third' });
    
    // Value should still be undefined
    expect(result.current).toBeUndefined();
    
    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBe('third');
  });

  it('should handle object values with deep equality', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 1, b: 2 }; // Same content, different reference
    
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: obj1 } }
    );
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toEqual(obj1);
    
    // Rerender with equivalent object - should not trigger new debounce
    rerender({ value: obj2 });
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    // Should still be the original value due to deep equality
    expect(result.current).toEqual(obj1);
  });

  it('should handle undefined value', () => {
    const { result } = renderHook(() => useDebounce(undefined, 500));
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current).toBeUndefined();
  });

  it('should handle number values', () => {
    const { result } = renderHook(() => useDebounce(42, 300));
    
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    expect(result.current).toBe(42);
  });

  it('should clean up timer on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => useDebounce('test', 500));
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
