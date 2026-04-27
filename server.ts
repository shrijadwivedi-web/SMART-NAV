import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import cors from 'cors';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Compile C++ code if binary doesn't exist
  const cppSource = path.join(__dirname, 'backend', 'dijkstra.cpp');
  const cppBinary = path.join(__dirname, 'backend', process.platform === 'win32' ? 'dijkstra.exe' : 'dijkstra');

  let cppAvailable = false;
  try {
    console.log('Checking for g++...');
    execSync('g++ --version');
    cppAvailable = true;
    console.log('g++ is available.');
  } catch (err) {
    console.warn('g++ not found. C++ backend will not be available.');
  }

  if (cppAvailable) {
    try {
      console.log('Compiling C++ backend...');
      execSync(`g++ -O3 "${cppSource}" -o "${cppBinary}"`);
      console.log('C++ backend compiled successfully.');
    } catch (error) {
      console.error('Failed to compile C++ backend.');
      console.error(error);
    }
  }

  interface Node {
    id: number;
    name: string;
    x: number;
    y: number;
  }

  interface Link {
    source: number | Node;
    target: number | Node;
    weight: number;
  }

  interface GraphData {
    nodes: Node[];
    links: Link[];
  }

  // In-memory graph state (for demo purposes, could be moved to a file or DB)
  let graph: GraphData = {
    nodes: [
      { id: 0, name: 'Railway Station Vijayawada', x: 400, y: 300 },
      { id: 1, name: 'PVP', x: 450, y: 250 },
      { id: 2, name: 'PVR', x: 500, y: 200 },
      { id: 3, name: 'Vijayawada Airport', x: 650, y: 150 },
      { id: 4, name: 'Bhavani Island', x: 300, y: 250 },
      { id: 5, name: 'Mangalgiri', x: 350, y: 400 },
      { id: 6, name: 'SRM AP', x: 300, y: 500 },
      { id: 7, name: 'Guntur', x: 200, y: 450 },
      { id: 8, name: 'Chirala', x: 100, y: 600 },
    ],
    links: [
      { source: 0, target: 1, weight: 5 },
      { source: 1, target: 2, weight: 3 },
      { source: 0, target: 3, weight: 20 },
      { source: 0, target: 4, weight: 8 },
      { source: 0, target: 5, weight: 12 },
      { source: 5, target: 6, weight: 15 },
      { source: 5, target: 7, weight: 25 },
      { source: 7, target: 8, weight: 60 },
      { source: 1, target: 3, weight: 18 },
      { source: 4, target: 5, weight: 10 },
    ]
  };

  // API Routes
  app.get('/api/graph', (req, res) => {
    res.json(graph);
  });

  app.post('/api/graph', (req, res) => {
    graph = req.body;
    res.json({ status: 'success' });
  });

  // JS Fallback for Dijkstra
  function jsDijkstra(start: number, end: number) {
    const dist: Record<number, number> = {};
    const parent: Record<number, number> = {};
    const visited: Record<number, boolean> = {};
    const adj: Record<number, { to: number, weight: number }[]> = {};

    graph.nodes.forEach(n => {
      dist[n.id] = Infinity;
      parent[n.id] = -1;
      visited[n.id] = false;
      adj[n.id] = [];
    });

    // Build adjacency list from links
    graph.links.forEach(link => {
      const u = typeof link.source === 'number' ? link.source : link.source.id;
      const v = typeof link.target === 'number' ? link.target : link.target.id;
      if (adj[u] && adj[v]) {
        adj[u].push({ to: v, weight: link.weight });
        adj[v].push({ to: u, weight: link.weight });
      }
    });

    dist[start] = 0;

    const nodeIds = graph.nodes.map(n => n.id);

    for (let i = 0; i < nodeIds.length; i++) {
      let u = -1;
      for (const id of nodeIds) {
        if (!visited[id] && (u === -1 || dist[id] < dist[u])) {
          u = id;
        }
      }

      if (u === -1 || dist[u] === Infinity) break;
      visited[u] = true;
      if (u === end) break;

      for (const edge of adj[u]) {
        if (dist[u] + edge.weight < dist[edge.to]) {
          dist[edge.to] = dist[u] + edge.weight;
          parent[edge.to] = u;
        }
      }
    }

    if (dist[end] === Infinity || dist[end] === undefined) return { path: [], distance: Infinity };

    const path = [];
    for (let v = end; v !== -1; v = parent[v]) {
      path.push(v);
    }
    return { path: path.reverse(), distance: dist[end] };
  }

  app.post('/api/navigate', (req, res) => {
    const { startNode, endNode } = req.body;

    if (startNode === undefined || endNode === undefined) {
      return res.status(400).json({ error: 'Missing startNode or endNode' });
    }

    // Check if C++ binary exists
    if (!fs.existsSync(cppBinary)) {
      console.warn('C++ binary not found. Falling back to JS implementation.');
      const result = jsDijkstra(startNode, endNode);
      return res.json(result);
    }

    // Prepare input for C++ binary
    const input = `${graph.nodes.length} ${graph.links.length}\n` +
      graph.links.map(l => {
        const s = typeof l.source === 'number' ? l.source : l.source.id;
        const t = typeof l.target === 'number' ? l.target : l.target.id;
        return `${s} ${t} ${l.weight}`;
      }).join('\n') +
      `\n${startNode} ${endNode}\n-1 -1\n`;

    const child = spawn(cppBinary);
    let output = '';
    let errorOutput = '';

    // Handle spawn errors (e.g., ENOENT)
    child.on('error', (err) => {
      console.error('Failed to start C++ process:', err);
      console.warn('Falling back to JS implementation due to spawn error.');
      const result = jsDijkstra(startNode, endNode);
      if (!res.headersSent) {
        res.json(result);
      }
    });

    child.stdin.on('error', (err) => {
      console.error('C++ process stdin error:', err);
    });

    try {
      child.stdin.write(input);
      child.stdin.end();
    } catch (err) {
      console.error('Failed to write to C++ process:', err);
    }

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      if (res.headersSent) return;

      if (code !== 0) {
        console.error('C++ process failed with code', code, errorOutput);
        const result = jsDijkstra(startNode, endNode);
        return res.json(result);
      }

      if (output.includes('NO_PATH')) {
        return res.json({ path: [], distance: Infinity });
      }

      const lines = output.trim().split('\n');
      let distance = 0;
      let pathNodes: number[] = [];

      lines.forEach(line => {
        if (line.startsWith('DISTANCE')) {
          distance = parseInt(line.split(' ')[1]);
        } else if (line.startsWith('PATH')) {
          pathNodes = line.split(' ').slice(1).map(Number);
        }
      });

      res.json({ path: pathNodes, distance });
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
