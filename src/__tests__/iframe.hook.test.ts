import { renderHook, act } from '@testing-library/react';
import { useIframe } from '../hooks/iframe.hook';

describe('useIframe', () => {
  const originalWindow = global.window;
  
  beforeEach(() => {
    // Reset window mock
    jest.clearAllMocks();
  });

  describe('isUsedByIframe', () => {
    it('should return false when not in iframe (same location)', () => {
      // Mock window where location equals parent location
      const mockLocation = { href: 'http://localhost:3001' };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });
      Object.defineProperty(window, 'parent', {
        value: { location: mockLocation },
        writable: true,
      });

      const { result } = renderHook(() => useIframe());
      expect(result.current.isUsedByIframe).toBe(false);
    });

    it('should return true when in iframe (different location)', () => {
      // Mock window where location differs from parent location
      const childLocation = { href: 'http://localhost:3001' };
      const parentLocation = { href: 'http://parent.com' };
      
      Object.defineProperty(window, 'location', {
        value: childLocation,
        writable: true,
      });
      Object.defineProperty(window, 'parent', {
        value: { location: parentLocation },
        writable: true,
      });

      const { result } = renderHook(() => useIframe());
      expect(result.current.isUsedByIframe).toBe(true);
    });
  });

  describe('sendMessage', () => {
    it('should call postMessage on window and parent', () => {
      const postMessageMock = jest.fn();
      const parentPostMessageMock = jest.fn();
      
      Object.defineProperty(window, 'postMessage', {
        value: postMessageMock,
        writable: true,
      });
      Object.defineProperty(window, 'parent', {
        value: { 
          location: window.location,
          postMessage: parentPostMessageMock,
        },
        writable: true,
      });

      const { result } = renderHook(() => useIframe());
      
      const messageData = { type: 'TEST', data: 'hello' };
      act(() => {
        result.current.sendMessage(messageData);
      });

      expect(postMessageMock).toHaveBeenCalledWith(messageData, '*');
      expect(parentPostMessageMock).toHaveBeenCalledWith(messageData, '*');
    });

    it('should handle complex message data', () => {
      const postMessageMock = jest.fn();
      const parentPostMessageMock = jest.fn();
      
      Object.defineProperty(window, 'postMessage', {
        value: postMessageMock,
        writable: true,
      });
      Object.defineProperty(window, 'parent', {
        value: { 
          location: window.location,
          postMessage: parentPostMessageMock,
        },
        writable: true,
      });

      const { result } = renderHook(() => useIframe());
      
      const complexData = {
        type: 'PAYMENT_COMPLETE',
        payload: {
          amount: 100,
          currency: 'CHF',
          nested: { deep: true },
        },
      };
      
      act(() => {
        result.current.sendMessage(complexData);
      });

      expect(postMessageMock).toHaveBeenCalledWith(complexData, '*');
    });
  });

  describe('interface', () => {
    it('should return correct interface shape', () => {
      const { result } = renderHook(() => useIframe());
      
      expect(result.current).toHaveProperty('isUsedByIframe');
      expect(result.current).toHaveProperty('sendMessage');
      expect(typeof result.current.isUsedByIframe).toBe('boolean');
      expect(typeof result.current.sendMessage).toBe('function');
    });
  });
});
