export class Stack<T> {
  constructor(private readonly items: T[] = []) {}

  push(item: T): Stack<T> {
    return new Stack([item, ...this.items]);
  }

  pop(asLongAs?: (item: T) => boolean): Stack<T> {
    do {
      this.items.shift();
    } while (this.current && asLongAs?.(this.current));

    return new Stack(this.items);
  }

  get current(): T | undefined {
    return this.items[0];
  }
}
