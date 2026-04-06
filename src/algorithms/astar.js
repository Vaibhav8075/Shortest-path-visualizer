import { PriorityQueue } from "../utils/priorityQueue";

function heuristicDistance(a, b, heuristicType) {
  const dx = Math.abs(a.row - b.row);
  const dy = Math.abs(a.col - b.col);

  if (heuristicType === "euclidean") {
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (heuristicType === "octile") {
    const diagonal = Math.min(dx, dy);
    const straight = Math.max(dx, dy) - diagonal;
    return diagonal * Math.SQRT2 + straight;
  }

  return dx + dy;
}

export function astar(grid, start, end, getNeighbors, options = {}) {
  const heuristicType = options.heuristicType || "manhattan";
  const pq = new PriorityQueue();
  start.g = 0;
  start.f = heuristicDistance(start, end, heuristicType);
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
      const g = node.g + neighbor.weight;
      if (g < neighbor.g) {
        neighbor.g = g;
        neighbor.f = g + heuristicDistance(neighbor, end, heuristicType);
        neighbor.previous = node;
        pq.enqueue(neighbor, neighbor.f);
      }
    }
  }

  return { visitedCount, visitOrder };
}
