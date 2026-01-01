import { renderHook, act } from '@testing-library/react';
import { useClipboard } from '../hooks/clipboard.hook';

// Mock copy-to-clipboard
jest.mock('copy-to-clipboard', () => jest.fn());

describe('useClipboard', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with isCopying false', () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.isCopying).toBe(false);
  });

  it('should set isCopying to true when copying', () => {
    const { result } = renderHook(() => useClipboard());
    
    act(() => {
      result.current.copy('test text');
    });
    
    expect(result.current.isCopying).toBe(true);
  });

  it('should reset isCopying after 500ms', () => {
    const { result } = renderHook(() => useClipboard());
    
    act(() => {
      result.current.copy('test text');
    });
    
    expect(result.current.isCopying).toBe(true);
    
    act(() => {
      jest.advanceTimersByTime(500);
    });
    
    expect(result.current.isCopying).toBe(false);
  });

  it('should not copy if text is undefined', () => {
    const { result } = renderHook(() => useClipboard());
    
    act(() => {
      result.current.copy(undefined);
    });
    
    expect(result.current.isCopying).toBe(false);
  });

  it('should not copy if text is empty', () => {
    const { result } = renderHook(() => useClipboard());
    
    act(() => {
      result.current.copy('');
    });
    
    expect(result.current.isCopying).toBe(false);
  });
});
