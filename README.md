# Can We Go Faster Than Dijkstra?

Interactive web application for visual and practical comparison of:
- Dijkstra's Algorithm
- A* Search Algorithm

Built with pure HTML, CSS, and JavaScript.

## Project Goals
- Live pathfinding visualization
- Performance metrics
- True side-by-side comparison

## Features
- Click-to-build grid editor
- Start, end, and wall placement
- Single algorithm run (Dijkstra or A*)
- True side-by-side live comparison (two boards, simultaneous animation)
- Random maze generator
- Adjustable animation speed
- Metrics panel:
  - Time (averaged benchmark timing)
  - Visited nodes
  - Path length
  - Winner

## Timing Method
Displayed time is measured with `performance.now()` and averaged across multiple internal runs on the same maze snapshot (`BENCHMARK_RUNS` in `app.js`).

This improves stability for classroom/demo comparison while keeping animation separate from timing.

## Project Structure
```text
shortest-path-visualizer/
├── index.html
├── style.css
├── app.js
├── algorithms/
│   ├── dijkstra.js
│   └── astar.js
└── utils/
    └── priorityQueue.js
```

## How to Run
### Option 1: Open directly
Open `index.html` in a browser.

### Option 2: Local server (recommended)
```powershell
python -m http.server 8000
```
Then open:
`http://localhost:8000`

## How to Use
1. Click one cell to set **Start**.
2. Click another cell to set **End**.
3. Click additional cells to draw/remove **Walls**.
4. Use:
   - `Run` for selected algorithm
   - `Run Side-by-Side` for direct live comparison
5. Use `Random Maze`, `Clear Path`, or `Reset Grid` as needed.

## Key Line for Explanation
"Dijkstra explores uniformly, while A* uses an admissible heuristic to guide search."
