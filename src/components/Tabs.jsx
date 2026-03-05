import React from "react";

export default function Tabs({ activeTab, onTabChange }) {
  return (
    <section className="panel tabs-panel">
      <div className="tabs-row">
        <button
          className={`tab-btn ${activeTab === "visualizer" ? "tab-active" : ""}`}
          onClick={() => onTabChange("visualizer")}
        >
          Path Visualizer
        </button>
        <button
          className={`tab-btn ${activeTab === "map" ? "tab-active" : ""}`}
          onClick={() => onTabChange("map")}
        >
          Real Map + Custom A*
        </button>
      </div>
    </section>
  );
}
