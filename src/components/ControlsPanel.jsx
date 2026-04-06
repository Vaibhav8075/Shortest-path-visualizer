import React from "react";
import { HEURISTICS } from "../constants";

export default function ControlsPanel({
  algorithm,
  heuristic,
  editorTool,
  speed,
  isRunning,
  onAlgorithmChange,
  onHeuristicChange,
  onEditorToolChange,
  onSpeedChange,
  onRun,
  onRunSideBySide,
  onRandomMaze,
  onClearPath,
  onResetGrid
}) {
  return (
    <section className="panel controls-panel">
      <div className="controls-grid controls-grid-extended">
        <label>
          Algorithm
          <select
            value={algorithm}
            onChange={(e) => onAlgorithmChange(e.target.value)}
            disabled={isRunning}
          >
            <option value="dijkstra">Dijkstra</option>
            <option value="astar">A*</option>
          </select>
        </label>

        <label>
          Heuristic
          <select
            value={heuristic}
            onChange={(e) => onHeuristicChange(e.target.value)}
            disabled={isRunning || algorithm !== "astar"}
          >
            {HEURISTICS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Editor Tool
          <select
            value={editorTool}
            onChange={(e) => onEditorToolChange(e.target.value)}
            disabled={isRunning}
          >
            <option value="wall">Draw Walls</option>
            <option value="weight">Draw Heavy Terrain</option>
          </select>
        </label>

        <label>
          Speed
          <input
            type="range"
            min="1"
            max="60"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            disabled={isRunning}
          />
          <span>{speed} ms / step</span>
        </label>

        <div className="buttons">
          <button className="btn btn-primary" onClick={onRun} disabled={isRunning}>
            Run
          </button>
          <button className="btn btn-danger" onClick={onRunSideBySide} disabled={isRunning}>
            Run Side-by-Side
          </button>
          <button className="btn btn-muted" onClick={onRandomMaze} disabled={isRunning}>
            Random Maze
          </button>
          <button className="btn btn-muted" onClick={onClearPath} disabled={isRunning}>
            Clear Path
          </button>
          <button className="btn btn-muted" onClick={onResetGrid} disabled={isRunning}>
            Reset Grid
          </button>
        </div>
      </div>
    </section>
  );
}
