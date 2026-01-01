import { Stack } from '../util/stack';

describe('Stack', () => {
  describe('constructor', () => {
    it('should create an empty stack', () => {
      const stack = new Stack<number>();
      expect(stack.size).toBe(0);
      expect(stack.current).toBeUndefined();
    });

    it('should create a stack with initial items', () => {
      const stack = new Stack<number>([1, 2, 3]);
      expect(stack.size).toBe(3);
      expect(stack.current).toBe(1);
    });
  });

  describe('push', () => {
    it('should add item to top of stack', () => {
      const stack = new Stack<number>();
      const newStack = stack.push(42);
      expect(newStack.current).toBe(42);
      expect(newStack.size).toBe(1);
    });

    it('should return a new stack instance', () => {
      const stack = new Stack<number>([1]);
      const newStack = stack.push(2);
      expect(newStack).not.toBe(stack);
      expect(newStack.current).toBe(2);
      expect(stack.current).toBe(1);
    });

    it('should push multiple items', () => {
      let stack = new Stack<string>();
      stack = stack.push('a');
      stack = stack.push('b');
      stack = stack.push('c');
      expect(stack.size).toBe(3);
      expect(stack.current).toBe('c');
    });
  });

  describe('pop', () => {
    it('should remove top item from stack', () => {
      const stack = new Stack<number>([1, 2, 3]);
      const newStack = stack.pop();
      expect(newStack.current).toBe(2);
      expect(newStack.size).toBe(2);
    });

    it('should handle empty stack', () => {
      const stack = new Stack<number>();
      const newStack = stack.pop();
      expect(newStack.current).toBeUndefined();
      expect(newStack.size).toBe(0);
    });

    it('should pop while condition is true', () => {
      const stack = new Stack<number>([1, 2, 3, 10, 20]);
      const newStack = stack.pop((item) => item < 5);
      expect(newStack.current).toBe(10);
    });
  });

  describe('current', () => {
    it('should return undefined for empty stack', () => {
      const stack = new Stack<number>();
      expect(stack.current).toBeUndefined();
    });

    it('should return top item', () => {
      const stack = new Stack<string>(['top', 'middle', 'bottom']);
      expect(stack.current).toBe('top');
    });
  });

  describe('size', () => {
    it('should return 0 for empty stack', () => {
      const stack = new Stack<number>();
      expect(stack.size).toBe(0);
    });

    it('should return correct size', () => {
      const stack = new Stack<number>([1, 2, 3, 4, 5]);
      expect(stack.size).toBe(5);
    });
  });
});
