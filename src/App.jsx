import React, { useState } from "react";
import Tabs from "./components/Tabs";
import VisualizerPage from "./pages/VisualizerPage";
import MapModePanel from "./components/MapModePanel";

export default function App() {
  const [activeTab, setActiveTab] = useState("visualizer");

  return (
    <>
      <div className="bg-shape bg-shape-a" />
      <div className="bg-shape bg-shape-b" />

      <main className="app-shell">
        <header className="hero">
          <p className="kicker">Interactive Web Application</p>
          <h1>Can We Go Faster Than Dijkstra?</h1>
          <p className="subtitle">
            A visual and practical comparison of <span className="accent-blue">Dijkstra</span> and <span className="accent-red">A*</span> search.
          </p>
        </header>

        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === "visualizer" ? <VisualizerPage /> : <MapModePanel />}
      </main>
    </>
  );
}

