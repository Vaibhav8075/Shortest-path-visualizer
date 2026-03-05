import { PriorityQueue } from "../utils/priorityQueue";

function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function astar(grid, start, end, getNeighbors) {
  const pq = new PriorityQueue();
  start.g = 0;
  start.f = heuristic(start, end);
  pq.enqueue(start, start.f);

  let visitedCount = 0;
  const visitOrder = [];

  while (!pq.isEmpty()) {
    const node = pq.dequeue();
    if (!node || node.visited || node.isWall) continue;

    node.visited = true;
    visitedCount += 1;
    visitOrder.push([node.row, node.col]);

    if (node === end) break;

    for (const neighbor of getNeighbors(grid, node)) {
      const g = node.g + 1;
      if (g < neighbor.g) {
        neighbor.g = g;
        neighbor.f = g + heuristic(neighbor, end);
        neighbor.previous = node;
        pq.enqueue(neighbor, neighbor.f);
      }
    }
  }

  return { visitedCount, visitOrder };
}
