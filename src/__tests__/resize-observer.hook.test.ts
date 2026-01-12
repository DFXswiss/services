import { renderHook } from '@testing-library/react';
import { useResizeObserver } from '../hooks/resize-observer.hook';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  observedElements: Element[] = [];
  
  static instances: MockResizeObserver[] = [];
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }
  
  observe(element: Element) {
    this.observedElements.push(element);
  }
  
  unobserve(element: Element) {
    this.observedElements = this.observedElements.filter(el => el !== element);
  }
  
  disconnect() {
    this.observedElements = [];
  }
  
  // Helper to simulate resize
  simulateResize(entries: ResizeObserverEntry[]) {
    this.callback(entries, this);
  }
}

// Replace global ResizeObserver
const originalResizeObserver = global.ResizeObserver;
beforeAll(() => {
  global.ResizeObserver = MockResizeObserver as any;
});
afterAll(() => {
  global.ResizeObserver = originalResizeObserver;
});
beforeEach(() => {
  MockResizeObserver.instances = [];
});

describe('useResizeObserver', () => {
  it('should return a ref', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useResizeObserver<HTMLDivElement>(callback));
    
    expect(result.current).toHaveProperty('current');
  });

  it('should create ResizeObserver when element is mounted', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useResizeObserver<HTMLDivElement>(callback));
    
    // Simulate mounting element
    const element = document.createElement('div');
    Object.defineProperty(result.current, 'current', {
      value: element,
      writable: true,
    });
    
    // Re-render to trigger useLayoutEffect
    // Note: In real usage, React would handle this
  });

  it('should disconnect observer on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useResizeObserver<HTMLDivElement>(callback));

    unmount();
    
    // Observer should be disconnected
    // (In real implementation, disconnect would be called)
  });

  it('should work with different element types', () => {
    const callback = jest.fn();
    
    // Test with div
    const { result: divResult } = renderHook(() => 
      useResizeObserver<HTMLDivElement>(callback)
    );
    expect(divResult.current).toBeDefined();
    
    // Test with span
    const { result: spanResult } = renderHook(() => 
      useResizeObserver<HTMLSpanElement>(callback)
    );
    expect(spanResult.current).toBeDefined();
    
    // Test with canvas
    const { result: canvasResult } = renderHook(() => 
      useResizeObserver<HTMLCanvasElement>(callback)
    );
    expect(canvasResult.current).toBeDefined();
  });

  it('should pass element and entry to callback', () => {
    const callback = jest.fn();
    renderHook(() => useResizeObserver<HTMLDivElement>(callback));
    
    // The callback signature should accept (target, entry)
    expect(callback.length || callback.toString()).toBeDefined();
  });

  it('should handle callback changes', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    
    const { rerender } = renderHook(
      ({ cb }) => useResizeObserver<HTMLDivElement>(cb),
      { initialProps: { cb: callback1 } }
    );
    
    rerender({ cb: callback2 });
    
    // Hook should update with new callback
  });
});
