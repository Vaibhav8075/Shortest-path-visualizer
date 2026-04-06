import React, { useMemo, useState } from "react";
import { COLS, ROWS, HEAVY_TERRAIN_COST } from "../constants";
import {
  benchmark,
  clearVisitMarks,
  cloneUiGrid,
  createGrid,
  createRunGrid,
  findCoords,
  runAlgorithmOnGrid,
  sleep,
  updateCell
} from "../lib/grid";
import ControlsPanel from "../components/ControlsPanel";
import MetricsPanel from "../components/MetricsPanel";
import GridBoard from "../components/GridBoard";
import ComparePanel from "../components/ComparePanel";
import ExplanationPanel from "../components/ExplanationPanel";

function formatSingleWinner(results, mazeVersion) {
  const d = results.dijkstra;
  const a = results.astar;
  if (!d || !a) return "Run both algorithms";
  if (d.mazeVersion !== a.mazeVersion || d.mazeVersion !== mazeVersion) return "Run both algorithms";
  if (a.time < d.time) return "A* (faster)";
  if (d.time < a.time) return "Dijkstra (faster)";
  return "Tie";
}

export default function VisualizerPage() {
  const [algorithm, setAlgorithm] = useState("dijkstra");
  const [heuristic, setHeuristic] = useState("manhattan");
  const [editorTool, setEditorTool] = useState("wall");
  const [speed, setSpeed] = useState(24);
  const [isRunning, setIsRunning] = useState(false);
  const [mazeVersion, setMazeVersion] = useState(0);
  const [singleRunResults, setSingleRunResults] = useState({ dijkstra: null, astar: null });

  const [editorGrid, setEditorGrid] = useState(() => createGrid());
  const [compareDGrid, setCompareDGrid] = useState(() => createGrid());
  const [compareAGrid, setCompareAGrid] = useState(() => createGrid());

  const [metrics, setMetrics] = useState({
    time: "0.00",
    visited: "0",
    pathLength: "0",
    winner: "N/A",
    pathCost: "0"
  });

  const [compareMetrics, setCompareMetrics] = useState({
    dTime: "-",
    dVisited: "-",
    dPath: "-",
    aTime: "-",
    aVisited: "-",
    aPath: "-"
  });

  const winnerFromSingleRuns = useMemo(
    () => formatSingleWinner(singleRunResults, mazeVersion),
    [singleRunResults, mazeVersion]
  );

  function invalidateComparison() {
    setMazeVersion((v) => v + 1);
    setSingleRunResults({ dijkstra: null, astar: null });
  }

  function onEditorCellClick(row, col) {
    if (isRunning) return;

    const { start, end } = findCoords(editorGrid);
    const cell = editorGrid[row][col];

    if (!start && !cell.isWall) {
      setEditorGrid((prev) => updateCell(prev, row, col, { isStart: true, weight: 1 }));
      invalidateComparison();
      return;
    }

    if (!end && !cell.isWall && !cell.isStart) {
      setEditorGrid((prev) => updateCell(prev, row, col, { isEnd: true, weight: 1 }));
      invalidateComparison();
      return;
    }

    if (cell.isStart || cell.isEnd) return;

    if (editorTool === "weight") {
      setEditorGrid((prev) =>
        updateCell(prev, row, col, {
          isWall: false,
          weight: cell.weight > 1 ? 1 : HEAVY_TERRAIN_COST
        })
      );
    } else {
      setEditorGrid((prev) =>
        updateCell(prev, row, col, {
          isWall: !cell.isWall,
          weight: !cell.isWall ? 1 : cell.weight
        })
      );
    }

    invalidateComparison();
  }

  function resetCompareBoards() {
    setCompareDGrid(createGrid());
    setCompareAGrid(createGrid());
    setCompareMetrics({ dTime: "-", dVisited: "-", dPath: "-", aTime: "-", aVisited: "-", aPath: "-" });
  }

  function clearPath() {
    if (isRunning) return;
    setEditorGrid((prev) => clearVisitMarks(prev));
    setMetrics({ time: "0.00", visited: "0", pathLength: "0", winner: "N/A", pathCost: "0" });
    resetCompareBoards();
    setSingleRunResults({ dijkstra: null, astar: null });
  }

  function resetGrid() {
    if (isRunning) return;
    setEditorGrid(createGrid());
    setMetrics({ time: "0.00", visited: "0", pathLength: "0", winner: "N/A", pathCost: "0" });
    resetCompareBoards();
    invalidateComparison();
  }

  function randomMaze() {
    if (isRunning) return;

    const grid = createGrid();
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (Math.random() < 0.24) grid[row][col].isWall = true;
        else if (Math.random() < 0.12) grid[row][col].weight = HEAVY_TERRAIN_COST;
      }
    }

    const s = { row: Math.floor(ROWS / 2), col: 3 };
    const e = { row: Math.floor(ROWS / 2), col: COLS - 4 };
    grid[s.row][s.col].isWall = false;
    grid[e.row][e.col].isWall = false;
    grid[s.row][s.col].weight = 1;
    grid[e.row][e.col].weight = 1;
    grid[s.row][s.col].isStart = true;
    grid[e.row][e.col].isEnd = true;

    setEditorGrid(grid);
    setMetrics({ time: "0.00", visited: "0", pathLength: "0", winner: "N/A", pathCost: "0" });
    resetCompareBoards();
    invalidateComparison();
  }

  async function animateToGrid(setGrid, visitOrder, pathCoords, speedMs, start, end) {
    for (const [row, col] of visitOrder) {
      if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) {
        await sleep(speedMs);
      } else {
        setGrid((prev) => updateCell(prev, row, col, { visited: true }));
        await sleep(speedMs);
      }
    }

    for (const [row, col] of pathCoords) {
      if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) {
        await sleep(Math.max(8, Math.floor(speedMs * 0.55)));
      } else {
        setGrid((prev) => updateCell(prev, row, col, { path: true }));
        await sleep(Math.max(8, Math.floor(speedMs * 0.55)));
      }
    }
  }

  function getRunOptions(type) {
    return type === "astar" ? { heuristicType: heuristic } : {};
  }

  async function runSingle() {
    if (isRunning) return;

    const { start: startCoord, end: endCoord } = findCoords(editorGrid);
    if (!startCoord || !endCoord) {
      alert("Place a start and end node first.");
      return;
    }

    setIsRunning(true);
    try {
      const cleanEditor = clearVisitMarks(editorGrid);
      setEditorGrid(cleanEditor);

      const runGrid = createRunGrid(cleanEditor);
      const runOptions = getRunOptions(algorithm);
      const result = runAlgorithmOnGrid(algorithm, runGrid, startCoord, endCoord, runOptions);
      const elapsed = benchmark(cleanEditor, algorithm, startCoord, endCoord, runOptions);

      const nextSingle = {
        ...singleRunResults,
        [algorithm]: {
          time: elapsed,
          visited: result.visitedCount,
          path: result.pathLength,
          cost: result.pathCost,
          mazeVersion
        }
      };

      await animateToGrid(setEditorGrid, result.visitOrder, result.pathCoords, Number(speed), startCoord, endCoord);

      setSingleRunResults(nextSingle);
      setMetrics({
        time: elapsed.toFixed(2),
        visited: String(result.visitedCount),
        pathLength: String(result.pathLength),
        winner: formatSingleWinner(nextSingle, mazeVersion),
        pathCost: String(result.pathCost)
      });

      if (algorithm === "dijkstra") {
        setCompareMetrics((prev) => ({
          ...prev,
          dTime: elapsed.toFixed(2),
          dVisited: String(result.visitedCount),
          dPath: `${result.pathLength} / cost ${result.pathCost}`
        }));
      } else {
        setCompareMetrics((prev) => ({
          ...prev,
          aTime: elapsed.toFixed(2),
          aVisited: String(result.visitedCount),
          aPath: `${result.pathLength} / cost ${result.pathCost}`
        }));
      }
    } catch (error) {
      console.error("Run failed:", error);
      setMetrics({ time: "Error", visited: "-", pathLength: "-", winner: "Run failed", pathCost: "-" });
      alert("Run failed. Open browser console (F12) for details.");
    } finally {
      setIsRunning(false);
    }
  }

  async function runSideBySide() {
    if (isRunning) return;

    const { start: startCoord, end: endCoord } = findCoords(editorGrid);
    if (!startCoord || !endCoord) {
      alert("Place a start and end node first.");
      return;
    }

    setIsRunning(true);
    try {
      const cleanEditor = clearVisitMarks(editorGrid);
      setEditorGrid(cleanEditor);

      const dBase = cloneUiGrid(cleanEditor);
      const aBase = cloneUiGrid(cleanEditor);
      setCompareDGrid(dBase);
      setCompareAGrid(aBase);

      const dRun = createRunGrid(dBase);
      const aRun = createRunGrid(aBase);

      const dResult = runAlgorithmOnGrid("dijkstra", dRun, startCoord, endCoord);
      const aResult = runAlgorithmOnGrid("astar", aRun, startCoord, endCoord, getRunOptions("astar"));

      const dTime = benchmark(cleanEditor, "dijkstra", startCoord, endCoord);
      const aTime = benchmark(cleanEditor, "astar", startCoord, endCoord, getRunOptions("astar"));

      await Promise.all([
        animateToGrid(setCompareDGrid, dResult.visitOrder, dResult.pathCoords, Number(speed), startCoord, endCoord),
        animateToGrid(setCompareAGrid, aResult.visitOrder, aResult.pathCoords, Number(speed), startCoord, endCoord)
      ]);

      const winner = aTime < dTime ? "A* (faster)" : dTime < aTime ? "Dijkstra (faster)" : "Tie";
      setMetrics({
        time: `D: ${dTime.toFixed(2)} | A*: ${aTime.toFixed(2)}`,
        visited: `${dResult.visitedCount} vs ${aResult.visitedCount}`,
        pathLength: `${dResult.pathLength} vs ${aResult.pathLength}`,
        winner,
        pathCost: `${dResult.pathCost} vs ${aResult.pathCost}`
      });

      setCompareMetrics({
        dTime: dTime.toFixed(2),
        dVisited: String(dResult.visitedCount),
        dPath: `${dResult.pathLength} / cost ${dResult.pathCost}`,
        aTime: aTime.toFixed(2),
        aVisited: String(aResult.visitedCount),
        aPath: `${aResult.pathLength} / cost ${aResult.pathCost}`
      });

      setSingleRunResults({
        dijkstra: { time: dTime, visited: dResult.visitedCount, path: dResult.pathLength, cost: dResult.pathCost, mazeVersion },
        astar: { time: aTime, visited: aResult.visitedCount, path: aResult.pathLength, cost: aResult.pathCost, mazeVersion }
      });
    } catch (error) {
      console.error("Side-by-side failed:", error);
      setMetrics({ time: "Error", visited: "-", pathLength: "-", winner: "Comparison failed", pathCost: "-" });
      setCompareMetrics({ dTime: "ERR", dVisited: "ERR", dPath: "ERR", aTime: "ERR", aVisited: "ERR", aPath: "ERR" });
      alert("Side-by-side failed. Open browser console (F12) for details.");
    } finally {
      setIsRunning(false);
    }
  }

  const winnerText = winnerFromSingleRuns === "Run both algorithms" ? metrics.winner : winnerFromSingleRuns;

  return (
    <>
      <section className="panel controls-panel">
        <h2 className="section-title">Editor Grid</h2>
        <div className="legend">
          <span><i className="dot start" /> Start</span>
          <span><i className="dot end" /> End</span>
          <span><i className="dot wall" /> Wall</span>
          <span><i className="dot weight" /> Heavy Terrain</span>
          <span><i className="dot visited" /> Visited</span>
          <span><i className="dot path" /> Path</span>
        </div>
        <GridBoard id="grid" grid={editorGrid} onCellClick={onEditorCellClick} />
      </section>

      <ControlsPanel
        algorithm={algorithm}
        heuristic={heuristic}
        editorTool={editorTool}
        speed={speed}
        isRunning={isRunning}
        onAlgorithmChange={setAlgorithm}
        onHeuristicChange={setHeuristic}
        onEditorToolChange={setEditorTool}
        onSpeedChange={setSpeed}
        onRun={runSingle}
        onRunSideBySide={runSideBySide}
        onRandomMaze={randomMaze}
        onClearPath={clearPath}
        onResetGrid={resetGrid}
      />

      <MetricsPanel metrics={metrics} winnerText={winnerText} />
      <ComparePanel compareMetrics={compareMetrics} compareDGrid={compareDGrid} compareAGrid={compareAGrid} />
      <ExplanationPanel heuristic={heuristic} />
    </>
  );
}
