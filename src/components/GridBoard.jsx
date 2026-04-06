import React from "react";
import { HEAVY_TERRAIN_COST } from "../constants";

export default function GridBoard({ grid, onCellClick, id }) {
  return (
    <div id={id} className={id === "grid" ? "grid" : "mini-grid"}>
      {grid.flat().map((cell) => {
        const classes = ["cell"];
        if (cell.isStart) classes.push("start");
        if (cell.isEnd) classes.push("end");
        if (cell.isWall) classes.push("wall");
        if (cell.weight > 1) classes.push("weight");
        if (cell.visited) classes.push("visited");
        if (cell.path) classes.push("path");

        return (
          <div
            key={`${id}-${cell.row}-${cell.col}`}
            className={classes.join(" ")}
            onClick={onCellClick ? () => onCellClick(cell.row, cell.col) : undefined}
          >
            {!cell.isWall && !cell.isStart && !cell.isEnd && cell.weight === HEAVY_TERRAIN_COST ? (
              <span className="cell-cost">{cell.weight}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
