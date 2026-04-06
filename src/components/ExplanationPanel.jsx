import React from "react";

const HEURISTIC_LABELS = {
  manhattan: "Manhattan",
  euclidean: "Euclidean",
  octile: "Octile"
};

export default function ExplanationPanel({ heuristic }) {
  return (
    <section className="panel explanation-panel">
      <h2>Teacher-Ready Explanation</h2>
      <p>
        <strong>Dijkstra is a Uniform Cost Search</strong>, not a plain BFS. On an unweighted grid it behaves similarly to BFS, but once heavy terrain is added it correctly prefers lower cumulative cost over fewer raw steps.
      </p>
      <p>
        <strong>A* explores strategically</strong> by combining cumulative path cost with the selected <strong>{HEURISTIC_LABELS[heuristic]}</strong> heuristic, so you can compare how heuristic choice changes the visited node count.
      </p>
      <p>
        Use the <strong>Draw Heavy Terrain</strong> tool to create high-cost regions and show why Dijkstra&apos;s cumulative distance logic matters in weighted environments.
      </p>
    </section>
  );
}
