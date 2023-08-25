export class Stack<T> {
  constructor(private readonly items: T[] = []) {}

  push(item: T): Stack<T> {
    return new Stack([item, ...this.items]);
  }

  pop(): Stack<T> {
    this.items.shift();
    return new Stack(this.items);
  }

  get current(): T | undefined {
    return this.items[0];
  }
}
