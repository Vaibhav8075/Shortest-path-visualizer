# Can We Go Faster Than Dijkstra? (Vite + React)

Interactive web app to compare Dijkstra and A* with live visualization, side-by-side animation, and performance metrics.

## Stack
- React 18
- Vite 5
- Plain CSS

## Features
- Tabbed interface:
  - `Path Visualizer`
  - `Real Map + Custom A*`
- Grid editor with start/end/walls
- Single-run mode for Dijkstra or A*
- True side-by-side live comparison (two synchronized boards)
- Random maze generator
- Adjustable animation speed
- Metrics: time, visited nodes, path length, winner
- Averaged benchmark timing (`BENCHMARK_RUNS`)
- Real map routing:
  - ORS route on OSM road graph
  - Experimental in-browser Custom A* route on Overpass-fetched graph
  - Start/End by map click or place search

## Project Structure
```text
shortest-path-visualizer/
├── index.html
├── package.json
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── styles.css
│   ├── constants.js
│   ├── pages/
│   │   └── VisualizerPage.jsx
│   ├── components/
│   │   ├── Tabs.jsx
│   │   ├── ControlsPanel.jsx
│   │   ├── MetricsPanel.jsx
│   │   ├── GridBoard.jsx
│   │   ├── ComparePanel.jsx
│   │   ├── ExplanationPanel.jsx
│   │   └── MapModePanel.jsx
│   ├── lib/
│   │   └── grid.js
│   ├── algorithms/
│   │   ├── dijkstra.js
│   │   └── astar.js
│   └── utils/
│       └── priorityQueue.js
└── README.md
```

## Run Locally
```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173`).

## Real Map Mode Setup (Free Stack)
Create a `.env` file in project root:

```bash
VITE_ORS_API_KEY=your_openrouteservice_api_key
```

Then restart dev server:

```bash
npm run dev
```

Get openrouteservice key:
1. Sign up: `https://openrouteservice.org/dev/#/signup`
2. Create API key in ORS dashboard
3. Put key in `.env`

## Build
```bash
npm run build
npm run preview
```

## Usage
1. Open **Path Visualizer** tab.
2. Click one cell to set **Start**.
3. Click one cell to set **End**.
4. Click more cells to add/remove **Walls**.
5. Use **Run** for single algorithm mode.
6. Use **Run Side-by-Side** for direct Dijkstra vs A* comparison.
7. Open **Real Map + Custom A*** tab:
   - Use `Get ORS Route` for backend route.
   - Use `Run Custom A*` for experimental in-browser A* map route.

## Notes
- Custom A* map mode is experimental and depends on Overpass server health.
- In some point pairs, ORS can find a route while Custom A* may fail due to graph extraction limits.
- If Custom A* fails, retry after a short wait or choose slightly different nearby points.

