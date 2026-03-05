import React from "react";
import GridBoard from "./GridBoard";

export default function ComparePanel({ compareMetrics, compareDGrid, compareAGrid }) {
  return (
    <section className="panel compare-panel">
      <h2 className="section-title">True Side-by-Side Live Comparison</h2>
      <div className="compare-wrap">
        <article className="compare-card">
          <h3 className="accent-blue">Dijkstra</h3>
          <p className="mini-metrics">
            Time: {compareMetrics.dTime} ms | Visited: {compareMetrics.dVisited} | Path: {compareMetrics.dPath}
          </p>
          <GridBoard id="compareDGrid" grid={compareDGrid} />
        </article>
        <article className="compare-card">
          <h3 className="accent-red">A*</h3>
          <p className="mini-metrics">
            Time: {compareMetrics.aTime} ms | Visited: {compareMetrics.aVisited} | Path: {compareMetrics.aPath}
          </p>
          <GridBoard id="compareAGrid" grid={compareAGrid} />
        </article>
      </div>
    </section>
  );
}
