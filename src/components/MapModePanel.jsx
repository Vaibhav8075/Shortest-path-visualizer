import React, { useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Polyline, TileLayer, useMapEvents } from "react-leaflet";

const DEFAULT_CENTER = [28.6139, 77.209];
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter"
];

const DRIVABLE = new Set([
  "motorway",
  "trunk",
  "primary",
  "secondary",
  "tertiary",
  "unclassified",
  "residential",
  "service",
  "living_street",
  "motorway_link",
  "trunk_link",
  "primary_link",
  "secondary_link",
  "tertiary_link"
]);

function formatCoord(coord) {
  if (!coord) return "Not set";
  return `${coord[0].toFixed(5)}, ${coord[1].toFixed(5)}`;
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function bboxFromPoints(a, b, padRatio = 0.45) {
  const minLat = Math.min(a[0], b[0]);
  const maxLat = Math.max(a[0], b[0]);
  const minLng = Math.min(a[1], b[1]);
  const maxLng = Math.max(a[1], b[1]);

  const latSpan = Math.max(0.03, maxLat - minLat);
  const lngSpan = Math.max(0.03, maxLng - minLng);
  const padLat = latSpan * padRatio;
  const padLng = lngSpan * padRatio;

  return {
    south: minLat - padLat,
    west: minLng - padLng,
    north: maxLat + padLat,
    east: maxLng + padLng
  };
}

function toOverpassQuery(bbox, timeoutSec = 25) {
  return `[out:json][timeout:${timeoutSec}];(way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});>;);out body;`;
}

function addEdge(adjacency, from, to, weight) {
  if (!adjacency.has(from)) adjacency.set(from, []);
  adjacency.get(from).push({ id: to, weight });
}

function nearestNodeIds(coord, nodes, limit = 6) {
  const ranked = [];
  for (const [id, node] of nodes) {
    const d = haversineMeters(coord, [node.lat, node.lng]);
    ranked.push({ id, d });
  }
  ranked.sort((a, b) => a.d - b.d);
  return ranked.slice(0, limit).map((x) => x.id);
}

function toUndirected(adjacency) {
  const undirected = new Map();
  for (const [from, edges] of adjacency) {
    for (const edge of edges) {
      addEdge(undirected, from, edge.id, edge.weight);
      addEdge(undirected, edge.id, from, edge.weight);
    }
  }
  return undirected;
}

function reconstructPath(cameFrom, endId) {
  const path = [endId];
  let current = endId;
  while (cameFrom.has(current)) {
    current = cameFrom.get(current);
    path.push(current);
  }
  return path.reverse();
}

function aStarGraph(startId, endId, nodes, adjacency) {
  const getNodeCoord = (id) => {
    const n = nodes.get(id);
    return [n.lat, n.lng];
  };

  const open = [startId];
  const openSet = new Set([startId]);
  const cameFrom = new Map();
  const gScore = new Map([[startId, 0]]);
  const fScore = new Map([[startId, haversineMeters(getNodeCoord(startId), getNodeCoord(endId))]]);

  let expanded = 0;

  while (open.length > 0) {
    open.sort((a, b) => (fScore.get(a) || Infinity) - (fScore.get(b) || Infinity));
    const current = open.shift();
    openSet.delete(current);
    expanded += 1;

    if (current === endId) {
      const pathIds = reconstructPath(cameFrom, endId);
      return { pathIds, cost: gScore.get(endId) || 0, expanded };
    }

    const neighbors = adjacency.get(current) || [];
    const currentG = gScore.get(current) || Infinity;

    for (const edge of neighbors) {
      const tentative = currentG + edge.weight;
      const known = gScore.get(edge.id) || Infinity;

      if (tentative < known) {
        cameFrom.set(edge.id, current);
        gScore.set(edge.id, tentative);
        const h = haversineMeters(getNodeCoord(edge.id), getNodeCoord(endId));
        fScore.set(edge.id, tentative + h);

        if (!openSet.has(edge.id)) {
          open.push(edge.id);
          openSet.add(edge.id);
        }
      }
    }
  }

  return null;
}

function runWithCandidates(startIds, endIds, nodes, adjacency) {
  let best = null;

  for (const s of startIds) {
    for (const e of endIds) {
      const result = aStarGraph(s, e, nodes, adjacency);
      if (!result) continue;
      if (!best || result.cost < best.cost) {
        best = result;
      }
    }
  }

  return best;
}

async function fetchOverpassRoadElements(startCoord, endCoord) {
  const attempts = [
    { padRatio: 0.45, timeoutSec: 25 },
    { padRatio: 0.85, timeoutSec: 30 },
    { padRatio: 1.30, timeoutSec: 35 }
  ];

  let lastError = "unknown";

  for (const attempt of attempts) {
    const bbox = bboxFromPoints(startCoord, endCoord, attempt.padRatio);
    const query = toOverpassQuery(bbox, attempt.timeoutSec);

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
          },
          body: `data=${encodeURIComponent(query)}`
        });

        const contentType = response.headers.get("content-type") || "";
        const text = await response.text();

        if (!response.ok) {
          if (text.toLowerCase().includes("too busy") || text.toLowerCase().includes("timeout")) {
            lastError = "overpass busy";
            continue;
          }
          lastError = `HTTP ${response.status}`;
          continue;
        }

        if (!contentType.includes("json")) {
          if (text.toLowerCase().includes("too busy") || text.toLowerCase().includes("timeout")) {
            lastError = "overpass busy";
            continue;
          }
          lastError = "non-json response";
          continue;
        }

        const data = JSON.parse(text);
        const elements = data?.elements || [];
        if (elements.length > 0) {
          return elements;
        }
      } catch (error) {
        lastError = error.message || "network error";
      }
    }
  }

  if (lastError === "overpass busy") {
    throw new Error("Overpass servers are busy. Retry in 20-30 seconds or choose closer points.");
  }

  throw new Error(`Overpass fetch failed (${lastError}). Try a smaller area.`);
}

function ClickHandler({ pickMode, onSetStart, onSetEnd }) {
  useMapEvents({
    click(event) {
      const coord = [event.latlng.lat, event.latlng.lng];
      if (pickMode === "start") onSetStart(coord);
      else onSetEnd(coord);
    }
  });
  return null;
}

export default function MapModePanel() {
  const orsKey = import.meta.env.VITE_ORS_API_KEY;
  const mapRef = useRef(null);

  const [status, setStatus] = useState("Map ready. Click to pick Start or End.");
  const [pickMode, setPickMode] = useState("start");
  const [startCoord, setStartCoord] = useState(null);
  const [endCoord, setEndCoord] = useState(null);

  const [orsRouteCoords, setOrsRouteCoords] = useState([]);
  const [customRouteCoords, setCustomRouteCoords] = useState([]);

  const [routeInfo, setRouteInfo] = useState({
    orsDistance: "-",
    orsDuration: "-",
    customDistance: "-",
    customDuration: "-"
  });

  const [startQuery, setStartQuery] = useState("");
  const [endQuery, setEndQuery] = useState("");

  const canRoute = useMemo(() => Boolean(startCoord && endCoord), [startCoord, endCoord]);

  async function searchPlace(query, target) {
    const trimmed = query.trim();
    if (!trimmed) {
      setStatus(`Enter a ${target} location name first.`);
      return;
    }

    try {
      setStatus(`Searching ${target}...`);
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data || data.length === 0) {
        setStatus(`No results found for ${target}.`);
        return;
      }

      const hit = data[0];
      const coord = [Number(hit.lat), Number(hit.lon)];

      if (target === "start") {
        setStartCoord(coord);
        setStatus("Start set from search. Pick End or click map.");
      } else {
        setEndCoord(coord);
        setStatus("End set from search. Run ORS or Custom A*.");
      }

      if (mapRef.current) mapRef.current.setView(coord, 14);
    } catch (error) {
      setStatus(`Search failed: ${error.message}`);
    }
  }

  async function getOrsRoute() {
    if (!orsKey) {
      setStatus("Missing VITE_ORS_API_KEY in .env. Add key and restart npm run dev.");
      return;
    }
    if (!canRoute) {
      setStatus("Select both start and end points first.");
      return;
    }

    setStatus("Calculating ORS route...");

    try {
      const body = {
        coordinates: [
          [startCoord[1], startCoord[0]],
          [endCoord[1], endCoord[0]]
        ]
      };

      const response = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: orsKey
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const feature = data?.features?.[0];
      const segment = feature?.properties?.segments?.[0];
      const coords = feature?.geometry?.coordinates;

      if (!coords || !segment) throw new Error("No route data found");

      const latLngCoords = coords.map(([lng, lat]) => [lat, lng]);
      setOrsRouteCoords(latLngCoords);

      const distanceKm = (segment.distance / 1000).toFixed(2);
      const durationMin = Math.round(segment.duration / 60);

      setRouteInfo((prev) => ({
        ...prev,
        orsDistance: `${distanceKm} km`,
        orsDuration: `${durationMin} min`
      }));

      if (mapRef.current) mapRef.current.fitBounds(latLngCoords);
      setStatus("ORS route ready.");
    } catch (error) {
      setStatus(`ORS route failed: ${error.message}`);
    }
  }

  async function runCustomAStar() {
    if (!canRoute) {
      setStatus("Select both start and end points first.");
      return;
    }

    setStatus("Building local road graph for Custom A*...");

    try {
      const elements = await fetchOverpassRoadElements(startCoord, endCoord);

      const nodes = new Map();
      const ways = [];

      for (const el of elements) {
        if (el.type === "node" && typeof el.lat === "number" && typeof el.lon === "number") {
          nodes.set(el.id, { lat: el.lat, lng: el.lon });
        } else if (el.type === "way" && Array.isArray(el.nodes) && el.tags?.highway && DRIVABLE.has(el.tags.highway)) {
          ways.push(el);
        }
      }

      const adjacency = new Map();

      for (const way of ways) {
        const ids = way.nodes;
        const oneway = way.tags?.oneway;

        for (let i = 0; i < ids.length - 1; i += 1) {
          const a = ids[i];
          const b = ids[i + 1];
          const na = nodes.get(a);
          const nb = nodes.get(b);
          if (!na || !nb) continue;

          const w = haversineMeters([na.lat, na.lng], [nb.lat, nb.lng]);

          if (oneway === "yes" || oneway === "1" || oneway === "true") {
            addEdge(adjacency, a, b, w);
          } else if (oneway === "-1") {
            addEdge(adjacency, b, a, w);
          } else {
            addEdge(adjacency, a, b, w);
            addEdge(adjacency, b, a, w);
          }
        }
      }

      if (nodes.size === 0 || adjacency.size === 0) {
        throw new Error("No drivable graph found in selected area");
      }

      const startCandidates = nearestNodeIds(startCoord, nodes, 8);
      const endCandidates = nearestNodeIds(endCoord, nodes, 8);

      if (startCandidates.length === 0 || endCandidates.length === 0) {
        throw new Error("Could not snap to road nodes");
      }

      setStatus("Running Custom A*...");
      const t0 = performance.now();
      let result = runWithCandidates(startCandidates, endCandidates, nodes, adjacency);

      if (!result) {
        const undirected = toUndirected(adjacency);
        result = runWithCandidates(startCandidates, endCandidates, nodes, undirected);
      }

      const t1 = performance.now();

      if (!result) {
        throw new Error("No path found by Custom A*");
      }

      const coords = result.pathIds.map((id) => {
        const n = nodes.get(id);
        return [n.lat, n.lng];
      });

      setCustomRouteCoords(coords);

      const distanceKm = (result.cost / 1000).toFixed(2);
      const durationMin = Math.round((result.cost / 1000 / 35) * 60);

      setRouteInfo((prev) => ({
        ...prev,
        customDistance: `${distanceKm} km`,
        customDuration: `${durationMin} min`
      }));

      if (mapRef.current) mapRef.current.fitBounds(coords);
      setStatus(`Custom A* route ready (${result.expanded} nodes expanded, ${(t1 - t0).toFixed(1)} ms).`);
    } catch (error) {
      setStatus(`Custom A* failed: ${error.message}`);
    }
  }

  function clearRoute() {
    setStartCoord(null);
    setEndCoord(null);
    setOrsRouteCoords([]);
    setCustomRouteCoords([]);
    setRouteInfo({
      orsDistance: "-",
      orsDuration: "-",
      customDistance: "-",
      customDuration: "-"
    });
    setStartQuery("");
    setEndQuery("");
    setStatus("Cleared. Click map or search to set points again.");

    if (mapRef.current) mapRef.current.setView(DEFAULT_CENTER, 12);
  }

  return (
    <section className="panel map-panel">
      <h2 className="section-title">Real Map Mode (Hybrid)</h2>
      <div className="map-layout">
        <div className="map-left">
          <div className="map-toolbar">
            <button className={`btn ${pickMode === "start" ? "btn-primary" : "btn-muted"}`} onClick={() => setPickMode("start")}>Pick Start</button>
            <button className={`btn ${pickMode === "end" ? "btn-danger" : "btn-muted"}`} onClick={() => setPickMode("end")}>Pick End</button>
            <button className="btn btn-primary" onClick={getOrsRoute}>Get ORS Route</button>
            <button className="btn btn-danger" onClick={runCustomAStar}>Run Custom A*</button>
            <button className="btn btn-muted" onClick={clearRoute}>Clear</button>
          </div>

          <h3 className="map-search-title">Search Locations</h3>

          <div className="map-search-row">
            <input className="map-search-input" placeholder="Search start (e.g., Connaught Place)" value={startQuery} onChange={(e) => setStartQuery(e.target.value)} />
            <button className="btn btn-primary" onClick={() => searchPlace(startQuery, "start")}>Set Start</button>
          </div>

          <div className="map-search-row">
            <input className="map-search-input" placeholder="Search end (e.g., India Gate)" value={endQuery} onChange={(e) => setEndQuery(e.target.value)} />
            <button className="btn btn-danger" onClick={() => searchPlace(endQuery, "end")}>Set End</button>
          </div>

          <div className="map-status">{status}</div>

          <div className="map-canvas">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={12}
              scrollWheelZoom
              style={{ height: "100%", width: "100%" }}
              whenCreated={(map) => {
                mapRef.current = map;
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <ClickHandler
                pickMode={pickMode}
                onSetStart={(coord) => {
                  setStartCoord(coord);
                  setStatus("Start selected. Pick End and click map.");
                }}
                onSetEnd={(coord) => {
                  setEndCoord(coord);
                  setStatus("End selected. Run ORS or Custom A*.");
                }}
              />

              {startCoord && <CircleMarker center={startCoord} radius={8} pathOptions={{ color: "#138a5a", fillColor: "#138a5a", fillOpacity: 0.9 }} />}
              {endCoord && <CircleMarker center={endCoord} radius={8} pathOptions={{ color: "#e63e4b", fillColor: "#e63e4b", fillOpacity: 0.9 }} />}

              {orsRouteCoords.length > 0 && <Polyline positions={orsRouteCoords} pathOptions={{ color: "#0f74ff", weight: 5 }} />}
              {customRouteCoords.length > 0 && <Polyline positions={customRouteCoords} pathOptions={{ color: "#ff7a1a", weight: 4, dashArray: "8 6" }} />}
            </MapContainer>
          </div>
        </div>

        <aside className="map-right panel">
          <h3>Route Summary</h3>
          <p><strong>Start:</strong> {formatCoord(startCoord)}</p>
          <p><strong>End:</strong> {formatCoord(endCoord)}</p>
          <p><strong>ORS Distance:</strong> {routeInfo.orsDistance}</p>
          <p><strong>ORS ETA:</strong> {routeInfo.orsDuration}</p>
          <p><strong>Custom A* Distance:</strong> {routeInfo.customDistance}</p>
          <p><strong>Custom A* ETA:</strong> {routeInfo.customDuration}</p>
        </aside>
      </div>
    </section>
  );
}
