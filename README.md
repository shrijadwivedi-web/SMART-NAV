# SMART NAV 🗺️

A real-time shortest path visualizer built for navigating city-level road networks. I made this because I wanted to actually *see* Dijkstra's algorithm run on a map, not just print arrays in a terminal.

The app lets you pick two locations, hit a button, and watch the shortest path light up on the graph. You can also add new locations and roads, adjust traffic weights live, and the algorithm re-routes accordingly.

![SMART NAV Screenshot](https://i.imgur.com/placeholder.png)

---

## What it does

- **Shortest Path Visualization** — Runs Dijkstra's algorithm and highlights the optimal route on an interactive graph
- **C++ Powered Backend** — The core algorithm runs in a compiled C++ binary for speed. If `g++` isn't available, it falls back to a JS implementation automatically
- **Live Graph Editor** — Add or remove locations and roads directly from the UI without restarting anything
- **Traffic Simulation** — Drag sliders to change road weights and instantly see how routes change
- **Zoom & Pan** — The graph is fully zoomable and pannable (built with D3.js)

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Graph Rendering | D3.js |
| Backend | Express.js + TypeScript (`tsx`) |
| Algorithm | C++ (g++ compiled) with JS fallback |
| Animation | Framer Motion |
| Dev Server | Vite (served through Express middleware) |

---

## Getting Started

You'll need Node.js (v18+) and optionally `g++` for the C++ engine.

```bash
# Clone the repo
git clone https://github.com/shrijadwivedi-web/SMART-NAV.git
cd SMART-NAV

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

The server will automatically try to compile the C++ backend on startup. If you don't have `g++` installed, it just uses the JavaScript version — no setup needed.

---

## How the C++ Backend Works

On startup, `server.ts` checks if `g++` is available and compiles `backend/dijkstra.cpp`. The compiled binary is then called as a subprocess whenever you request a route — it reads the graph from stdin and writes the shortest path + distance to stdout.

This approach keeps the heavy computation off the Node.js event loop and makes the algorithm significantly faster on large graphs.

If the binary isn't found or the process fails for any reason, the server falls back to a pure JavaScript Dijkstra implementation transparently.

---

## Project Structure

```
├── backend/
│   └── dijkstra.cpp       # C++ Dijkstra implementation
├── src/
│   ├── App.tsx             # Main app component (navigation + editor UI)
│   ├── components/
│   │   └── GraphView.tsx   # D3.js graph renderer
│   └── types.ts            # Shared TypeScript types
├── server.ts               # Express server + API routes + Vite middleware
├── vite.config.ts
└── package.json
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/graph` | Returns current graph (nodes + links) |
| `POST` | `/api/graph` | Replaces the graph with new data |
| `POST` | `/api/navigate` | Runs Dijkstra from `startNode` to `endNode` |

`/api/navigate` request body:
```json
{
  "startNode": 0,
  "endNode": 5
}
```

Response:
```json
{
  "path": [0, 1, 3, 5],
  "distance": 23
}
```

---

## Default Map

The app ships with a small road network around Vijayawada, Andhra Pradesh:

- Railway Station Vijayawada
- PVP, PVR
- Vijayawada Airport
- Bhavani Island
- Mangalgiri
- SRM AP
- Guntur
- Chirala

You can delete any of these and add your own from the Editor tab.

---

## Known Limitations

- Graph state is in-memory only — restarting the server resets it to the default
- Node positions in the editor are randomly placed (drag support is not yet implemented)
- No persistent storage or user accounts

---

## License

MIT
