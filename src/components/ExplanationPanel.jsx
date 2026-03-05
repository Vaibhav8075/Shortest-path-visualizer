import React from "react";

export default function ExplanationPanel() {
  return (
    <section className="panel explanation-panel">
      <h2>Teacher-Ready Explanation</h2>
      <p>
        <strong>Dijkstra explores uniformly</strong> in all directions and guarantees the shortest path in positive-weight graphs.
      </p>
      <p>
        <strong>A* explores strategically</strong> using an admissible heuristic (Manhattan distance), so it usually visits fewer nodes while preserving optimality on this grid.
      </p>
    </section>
  );
}
