import { ROWS, COLS, BENCHMARK_RUNS } from "../constants";
import { dijkstra } from "../algorithms/dijkstra";
import { astar } from "../algorithms/astar";

export function createCell(row, col) {
  return {
    row,
    col,
    isWall: false,
    isStart: false,
    isEnd: false,
    visited: false,
    path: false
  };
}

export function createGrid() {
  return Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => createCell(row, col))
  );
}

export function cloneUiGrid(grid) {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getNeighbors(grid, node) {
  const neighbors = [];
  const { row, col } = node;

  if (row > 0) neighbors.push(grid[row - 1][col]);
  if (row < ROWS - 1) neighbors.push(grid[row + 1][col]);
  if (col > 0) neighbors.push(grid[row][col - 1]);
  if (col < COLS - 1) neighbors.push(grid[row][col + 1]);

  return neighbors.filter((n) => !n.isWall);
}

export function createRunGrid(uiGrid) {
  return uiGrid.map((row) =>
    row.map((cell) => ({
      row: cell.row,
      col: cell.col,
      isWall: cell.isWall,
      distance: Infinity,
      g: Infinity,
      f: Infinity,
      visited: false,
      previous: null
    }))
  );
}

export function findCoords(uiGrid) {
  let start = null;
  let end = null;

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (uiGrid[row][col].isStart) start = { row, col };
      if (uiGrid[row][col].isEnd) end = { row, col };
    }
  }

  return { start, end };
}

export function pathFromEnd(endNode) {
  const coords = [];
  let length = 0;
  let current = endNode;

  while (current && current.previous) {
    length += 1;
    current = current.previous;
    coords.push([current.row, current.col]);
  }

  return { coords: coords.reverse(), length };
}

export function runAlgorithmOnGrid(type, runGrid, startCoord, endCoord) {
  const start = runGrid[startCoord.row][startCoord.col];
  const end = runGrid[endCoord.row][endCoord.col];

  const result =
    type === "dijkstra"
      ? dijkstra(runGrid, start, end, getNeighbors)
      : astar(runGrid, start, end, getNeighbors);

  const path = pathFromEnd(end);
  return { ...result, pathCoords: path.coords, pathLength: path.length };
}

export function benchmark(uiGrid, type, startCoord, endCoord) {
  let total = 0;

  for (let i = 0; i < BENCHMARK_RUNS; i += 1) {
    const runGrid = createRunGrid(uiGrid);
    const t0 = performance.now();
    runAlgorithmOnGrid(type, runGrid, startCoord, endCoord);
    const t1 = performance.now();
    total += t1 - t0;
  }

  return total / BENCHMARK_RUNS;
}

export function updateCell(grid, row, col, patch) {
  return grid.map((r, rIdx) =>
    rIdx === row
      ? r.map((c, cIdx) => (cIdx === col ? { ...c, ...patch } : c))
      : r
  );
}

export function clearVisitMarks(grid) {
  return grid.map((row) =>
    row.map((cell) => ({ ...cell, visited: false, path: false }))
  );
}
