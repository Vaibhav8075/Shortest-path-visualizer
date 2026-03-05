export class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    const top = this.elements.shift();
    return top ? top.element : null;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}
