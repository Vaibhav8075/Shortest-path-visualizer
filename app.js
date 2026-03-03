const ROWS = 20;
const COLS = 30;
const BENCHMARK_RUNS = 7;

let editorGrid = [];
let startCoord = null;
let endCoord = null;
let isRunning = false;
let mazeVersion = 0;
const singleRunResults = {
    dijkstra: null,
    astar: null
};

const algorithmSelect = document.getElementById("algorithm");
const speedInput = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");
const runBtn = document.getElementById("runBtn");
const compareBtn = document.getElementById("compareBtn");
const mazeBtn = document.getElementById("mazeBtn");
const clearPathBtn = document.getElementById("clearPathBtn");
const clearAllBtn = document.getElementById("clearAllBtn");

const timeEl = document.getElementById("time");
const visitedEl = document.getElementById("visited");
const pathLenEl = document.getElementById("pathLength");
const winnerEl = document.getElementById("winner");

const dTimeEl = document.getElementById("dTime");
const dVisitedEl = document.getElementById("dVisited");
const dPathEl = document.getElementById("dPath");
const aTimeEl = document.getElementById("aTime");
const aVisitedEl = document.getElementById("aVisited");
const aPathEl = document.getElementById("aPath");

speedInput.addEventListener("input", () => {
    speedValue.textContent = `${speedInput.value} ms / step`;
});

runBtn.addEventListener("click", () => runAlgorithm(algorithmSelect.value));
compareBtn.addEventListener("click", runSideBySide);
mazeBtn.addEventListener("click", generateMaze);
clearPathBtn.addEventListener("click", clearPathOnly);
clearAllBtn.addEventListener("click", clearAll);

function makeNode(row, col, element) {
    return {
        row,
        col,
        element,
        distance: Infinity,
        g: Infinity,
        f: Infinity,
        visited: false,
        previous: null,
        isWall: false
    };
}

function buildGrid(container, clickable = false) {
    container.innerHTML = "";
    const grid = [];

    for (let row = 0; row < ROWS; row++) {
        const rowData = [];
        for (let col = 0; col < COLS; col++) {
            const cell = document.createElement("div");
            cell.className = "cell";

            if (clickable) {
                cell.addEventListener("click", () => handleEditorCellClick(row, col));
            }

            container.appendChild(cell);
            rowData.push(makeNode(row, col, cell));
        }
        grid.push(rowData);
    }

    return grid;
}

function createEditorGrid() {
    const editorContainer = document.getElementById("grid");
    editorGrid = buildGrid(editorContainer, true);
}

function getNode(grid, coord) {
    return coord ? grid[coord.row][coord.col] : null;
}

function handleEditorCellClick(row, col) {
    if (isRunning) {
        return;
    }

    const node = editorGrid[row][col];

    if (!startCoord && !node.isWall) {
        startCoord = { row, col };
        node.element.classList.add("start");
        invalidateSingleRunComparison();
        return;
    }

    if (!endCoord && !node.isWall && !(startCoord && row === startCoord.row && col === startCoord.col)) {
        endCoord = { row, col };
        node.element.classList.add("end");
        invalidateSingleRunComparison();
        return;
    }

    if ((startCoord && row === startCoord.row && col === startCoord.col) || (endCoord && row === endCoord.row && col === endCoord.col)) {
        return;
    }

    node.isWall = !node.isWall;
    node.element.classList.toggle("wall", node.isWall);
    invalidateSingleRunComparison();
}

function getNeighbors(sourceGrid, node) {
    const neighbors = [];
    const { row, col } = node;

    if (row > 0) neighbors.push(sourceGrid[row - 1][col]);
    if (row < ROWS - 1) neighbors.push(sourceGrid[row + 1][col]);
    if (col > 0) neighbors.push(sourceGrid[row][col - 1]);
    if (col < COLS - 1) neighbors.push(sourceGrid[row][col + 1]);

    return neighbors.filter((n) => !n.isWall);
}

function resetRunState(grid) {
    for (const row of grid) {
        for (const node of row) {
            node.distance = Infinity;
            node.g = Infinity;
            node.f = Infinity;
            node.visited = false;
            node.previous = null;
            node.element.classList.remove("visited", "path");
        }
    }
}

function setMetrics(time, visited, pathLen, winner) {
    timeEl.textContent = typeof time === "number" ? time.toFixed(2) : String(time);
    visitedEl.textContent = visited;
    pathLenEl.textContent = pathLen;
    winnerEl.textContent = winner;
}

function invalidateSingleRunComparison() {
    mazeVersion += 1;
    singleRunResults.dijkstra = null;
    singleRunResults.astar = null;
}

function getWinnerFromSingleRuns() {
    const d = singleRunResults.dijkstra;
    const a = singleRunResults.astar;

    if (!d || !a) {
        return "Run both algorithms";
    }

    if (d.mazeVersion !== a.mazeVersion || d.mazeVersion !== mazeVersion) {
        return "Run both algorithms";
    }

    if (a.time < d.time) {
        return "A* (faster)";
    }

    if (d.time < a.time) {
        return "Dijkstra (faster)";
    }

    return "Tie";
}

function setCompareMetrics(dTime, dVisited, dPath, aTime, aVisited, aPath) {
    dTimeEl.textContent = dTime;
    dVisitedEl.textContent = dVisited;
    dPathEl.textContent = dPath;
    aTimeEl.textContent = aTime;
    aVisitedEl.textContent = aVisited;
    aPathEl.textContent = aPath;
}

function clearCompareBoards() {
    document.getElementById("compareDGrid").innerHTML = "";
    document.getElementById("compareAGrid").innerHTML = "";
    setCompareMetrics("-", "-", "-", "-", "-", "-");
}

function clearPathOnly() {
    if (isRunning) {
        return;
    }

    resetRunState(editorGrid);
    setMetrics(0, 0, 0, "N/A");
    clearCompareBoards();
    singleRunResults.dijkstra = null;
    singleRunResults.astar = null;
}

function clearAll() {
    if (isRunning) {
        return;
    }

    startCoord = null;
    endCoord = null;
    createEditorGrid();
    setMetrics(0, 0, 0, "N/A");
    clearCompareBoards();
    invalidateSingleRunComparison();
}

function snapshotWalls() {
    return editorGrid.map((row) => row.map((node) => node.isWall));
}

function applyWallSnapshot(grid, wallSnapshot) {
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const node = grid[row][col];
            node.isWall = wallSnapshot[row][col];
            node.element.classList.toggle("wall", node.isWall);
        }
    }

    const start = getNode(grid, startCoord);
    const end = getNode(grid, endCoord);

    if (start) {
        start.isWall = false;
        start.element.classList.remove("wall");
        start.element.classList.add("start");
    }

    if (end) {
        end.isWall = false;
        end.element.classList.remove("wall");
        end.element.classList.add("end");
    }
}

function reconstructPath(endNode) {
    const path = [];
    let current = endNode;

    while (current && current.previous) {
        path.push(current.previous);
        current = current.previous;
    }

    return path.reverse();
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function animateResult(visitOrder, pathNodes, speed, startNode, endNode) {
    for (const node of visitOrder) {
        if (node !== startNode && node !== endNode) {
            node.element.classList.add("visited");
        }
        await sleep(speed);
    }

    for (const node of pathNodes) {
        if (node !== startNode && node !== endNode) {
            node.element.classList.add("path");
        }
        await sleep(Math.max(8, Math.floor(speed * 0.55)));
    }
}

function setControlsDisabled(disabled) {
    isRunning = disabled;
    runBtn.disabled = disabled;
    compareBtn.disabled = disabled;
    mazeBtn.disabled = disabled;
    clearPathBtn.disabled = disabled;
    clearAllBtn.disabled = disabled;
    algorithmSelect.disabled = disabled;
}

function executeAlgorithm(algorithm, grid, startNode, endNode) {
    if (algorithm === "dijkstra") {
        return dijkstra(grid, startNode, endNode);
    }
    return astar(grid, startNode, endNode);
}

function createBenchmarkGrid(wallSnapshot) {
    const ghostContainer = document.createElement("div");
    const grid = buildGrid(ghostContainer, false);
    applyWallSnapshot(grid, wallSnapshot);
    resetRunState(grid);
    return grid;
}

function benchmarkAlgorithm(algorithm, wallSnapshot, runs) {
    let total = 0;

    for (let i = 0; i < runs; i++) {
        const grid = createBenchmarkGrid(wallSnapshot);
        const startNode = getNode(grid, startCoord);
        const endNode = getNode(grid, endCoord);

        const t0 = performance.now();
        executeAlgorithm(algorithm, grid, startNode, endNode);
        const t1 = performance.now();

        total += t1 - t0;
    }

    return total / runs;
}

async function runAlgorithm(algorithm) {
    if (isRunning) {
        return;
    }

    if (!startCoord || !endCoord) {
        alert("Place a start and end node first.");
        return;
    }

    setControlsDisabled(true);

    try {
        resetRunState(editorGrid);
        const wallSnapshot = snapshotWalls();

        const startNode = getNode(editorGrid, startCoord);
        const endNode = getNode(editorGrid, endCoord);

        const result = executeAlgorithm(algorithm, editorGrid, startNode, endNode);
        const elapsed = benchmarkAlgorithm(algorithm, wallSnapshot, BENCHMARK_RUNS);

        const path = reconstructPath(endNode);
        await animateResult(result.visitOrder, path, Number(speedInput.value), startNode, endNode);

        singleRunResults[algorithm] = {
            time: elapsed,
            visited: result.visitedCount,
            path: path.length,
            mazeVersion
        };

        setMetrics(elapsed, result.visitedCount, path.length, getWinnerFromSingleRuns());

        if (algorithm === "dijkstra") {
            dTimeEl.textContent = elapsed.toFixed(2);
            dVisitedEl.textContent = String(result.visitedCount);
            dPathEl.textContent = String(path.length);
        } else {
            aTimeEl.textContent = elapsed.toFixed(2);
            aVisitedEl.textContent = String(result.visitedCount);
            aPathEl.textContent = String(path.length);
        }
    } catch (error) {
        console.error("Run failed:", error);
        setMetrics("Error", "-", "-", "Run failed");
        alert("Run failed. Open browser console (F12) for details.");
    } finally {
        setControlsDisabled(false);
    }
}

function prepareCompareGrid(containerId, wallSnapshot) {
    const container = document.getElementById(containerId);
    const grid = buildGrid(container, false);
    applyWallSnapshot(grid, wallSnapshot);
    resetRunState(grid);
    return grid;
}

async function runSideBySide() {
    if (isRunning) {
        return;
    }

    if (!startCoord || !endCoord) {
        alert("Place a start and end node first.");
        return;
    }

    setControlsDisabled(true);

    try {
        resetRunState(editorGrid);

        const speed = Number(speedInput.value);
        const wallSnapshot = snapshotWalls();

        const dGrid = prepareCompareGrid("compareDGrid", wallSnapshot);
        const aGrid = prepareCompareGrid("compareAGrid", wallSnapshot);

        const dStart = getNode(dGrid, startCoord);
        const dEnd = getNode(dGrid, endCoord);
        const aStart = getNode(aGrid, startCoord);
        const aEnd = getNode(aGrid, endCoord);

        const dResult = dijkstra(dGrid, dStart, dEnd);
        const dTime = benchmarkAlgorithm("dijkstra", wallSnapshot, BENCHMARK_RUNS);
        const dPath = reconstructPath(dEnd);

        const aResult = astar(aGrid, aStart, aEnd);
        const aTime = benchmarkAlgorithm("astar", wallSnapshot, BENCHMARK_RUNS);
        const aPath = reconstructPath(aEnd);

        await Promise.all([
            animateResult(dResult.visitOrder, dPath, speed, dStart, dEnd),
            animateResult(aResult.visitOrder, aPath, speed, aStart, aEnd)
        ]);

        const winner = aTime < dTime ? "A* (faster)" : dTime < aTime ? "Dijkstra (faster)" : "Tie";

        setMetrics(`D: ${dTime.toFixed(2)} | A*: ${aTime.toFixed(2)}`, `${dResult.visitedCount} vs ${aResult.visitedCount}`, `${dPath.length} vs ${aPath.length}`, winner);

        setCompareMetrics(dTime.toFixed(2), String(dResult.visitedCount), String(dPath.length), aTime.toFixed(2), String(aResult.visitedCount), String(aPath.length));
    } catch (error) {
        console.error("Side-by-side failed:", error);
        setMetrics("Error", "-", "-", "Comparison failed");
        setCompareMetrics("ERR", "ERR", "ERR", "ERR", "ERR", "ERR");
        alert("Side-by-side failed. Open browser console (F12) for details.");
    } finally {
        setControlsDisabled(false);
    }
}

function generateMaze() {
    if (isRunning) {
        return;
    }

    clearAll();

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const node = editorGrid[row][col];
            if (Math.random() < 0.24) {
                node.isWall = true;
                node.element.classList.add("wall");
            }
        }
    }

    startCoord = { row: Math.floor(ROWS / 2), col: 3 };
    endCoord = { row: Math.floor(ROWS / 2), col: COLS - 4 };

    const startNode = getNode(editorGrid, startCoord);
    const endNode = getNode(editorGrid, endCoord);

    startNode.isWall = false;
    endNode.isWall = false;
    startNode.element.classList.remove("wall");
    endNode.element.classList.remove("wall");
    startNode.element.classList.add("start");
    endNode.element.classList.add("end");
    invalidateSingleRunComparison();
}

createEditorGrid();
clearCompareBoards();
setMetrics(0, 0, 0, "N/A");
