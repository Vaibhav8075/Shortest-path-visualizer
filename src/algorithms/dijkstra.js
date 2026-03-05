import { PriorityQueue } from "../utils/priorityQueue";

export function dijkstra(grid, start, end, getNeighbors) {
  const pq = new PriorityQueue();
  start.distance = 0;
  pq.enqueue(start, 0);

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
      const newDist = node.distance + 1;
      if (newDist < neighbor.distance) {
        neighbor.distance = newDist;
        neighbor.previous = node;
        pq.enqueue(neighbor, newDist);
      }
    }
  }

  return { visitedCount, visitOrder };
}
