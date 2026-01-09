import { renderHook } from '@testing-library/react';
import { useChange } from '../hooks/change.hook';

describe('useChange', () => {
  it('should not call callback on initial render', () => {
    const callback = jest.fn();
    renderHook(() => useChange(callback, 'initial'));
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call callback when value changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: 'first' } }
    );
    
    expect(callback).not.toHaveBeenCalled();
    
    rerender({ value: 'second' });
    
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('second', 'first');
  });

  it('should not call callback when value stays the same', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: 'same' } }
    );
    
    rerender({ value: 'same' });
    rerender({ value: 'same' });
    
    expect(callback).not.toHaveBeenCalled();
  });

  it('should track multiple changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: 1 } }
    );
    
    rerender({ value: 2 });
    expect(callback).toHaveBeenLastCalledWith(2, 1);
    
    rerender({ value: 3 });
    expect(callback).toHaveBeenLastCalledWith(3, 2);
    
    rerender({ value: 10 });
    expect(callback).toHaveBeenLastCalledWith(10, 3);
    
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should work with objects (reference comparison)', () => {
    const callback = jest.fn();
    const obj1 = { a: 1 };
    const obj2 = { a: 1 }; // Same content, different reference
    
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: obj1 } }
    );
    
    // Different reference should trigger callback
    rerender({ value: obj2 });
    expect(callback).toHaveBeenCalledWith(obj2, obj1);
  });

  it('should work with null and undefined', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: null as string | null } }
    );
    
    rerender({ value: 'defined' });
    expect(callback).toHaveBeenCalledWith('defined', null);
    
    rerender({ value: null });
    expect(callback).toHaveBeenCalledWith(null, 'defined');
  });

  it('should handle boolean changes', () => {
    const callback = jest.fn();
    const { rerender } = renderHook(
      ({ value }) => useChange(callback, value),
      { initialProps: { value: false } }
    );
    
    rerender({ value: true });
    expect(callback).toHaveBeenCalledWith(true, false);
    
    rerender({ value: false });
    expect(callback).toHaveBeenCalledWith(false, true);
  });
});
