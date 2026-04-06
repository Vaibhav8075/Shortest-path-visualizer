import React from "react";

export default function MetricsPanel({ metrics, winnerText }) {
  return (
    <section className="panel stats-panel stats-panel-extended">
      <div className="metric">
        <h3>Time</h3>
        <p>{metrics.time} ms</p>
      </div>
      <div className="metric">
        <h3>Visited Nodes</h3>
        <p>{metrics.visited}</p>
      </div>
      <div className="metric">
        <h3>Path Length</h3>
        <p>{metrics.pathLength}</p>
      </div>
      <div className="metric">
        <h3>Path Cost</h3>
        <p>{metrics.pathCost}</p>
      </div>
      <div className="metric">
        <h3>Winner</h3>
        <p>{winnerText}</p>
      </div>
    </section>
  );
}
