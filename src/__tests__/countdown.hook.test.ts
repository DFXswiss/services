import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/countdown.hook';

describe('useCountdown', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with zero timer', () => {
    const { result } = renderHook(() => useCountdown());
    
    expect(result.current.timer.minutes).toBe(0);
    expect(result.current.timer.seconds).toBe(0);
    expect(result.current.remainingSeconds).toBe(0);
  });

  it('should start countdown', () => {
    const { result } = renderHook(() => useCountdown());
    
    const futureDate = new Date(Date.now() + 65000); // 65 seconds from now
    
    act(() => {
      result.current.startTimer(futureDate);
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.timer.minutes).toBe(1);
    expect(result.current.timer.seconds).toBeLessThanOrEqual(5);
  });

  it('should count down seconds', () => {
    const { result } = renderHook(() => useCountdown());
    
    const futureDate = new Date(Date.now() + 10000); // 10 seconds from now
    
    act(() => {
      result.current.startTimer(futureDate);
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    const initialSeconds = result.current.remainingSeconds;
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    
    expect(result.current.remainingSeconds).toBeLessThan(initialSeconds);
  });

  it('should stop at zero', () => {
    const { result } = renderHook(() => useCountdown());
    
    const futureDate = new Date(Date.now() + 2000); // 2 seconds from now
    
    act(() => {
      result.current.startTimer(futureDate);
    });
    
    act(() => {
      jest.advanceTimersByTime(5000); // More than countdown
    });
    
    expect(result.current.remainingSeconds).toBeLessThanOrEqual(0);
  });

  it('should clear interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { result, unmount } = renderHook(() => useCountdown());
    
    const futureDate = new Date(Date.now() + 10000);
    
    act(() => {
      result.current.startTimer(futureDate);
    });
    
    unmount();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('should restart timer when called again', () => {
    const { result } = renderHook(() => useCountdown());
    
    // Start first timer
    act(() => {
      result.current.startTimer(new Date(Date.now() + 5000));
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    // Start new timer
    act(() => {
      result.current.startTimer(new Date(Date.now() + 60000)); // 60 seconds
    });
    
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    
    expect(result.current.remainingSeconds).toBeGreaterThan(50);
  });
});
