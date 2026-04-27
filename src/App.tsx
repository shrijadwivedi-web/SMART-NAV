import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  Plus, 
  Trash2, 
  Activity, 
  Clock, 
  Map as MapIcon, 
  Settings2,
  ChevronRight,
  Route,
  Info
} from 'lucide-react';
import { Node, Link, GraphData, NavigationResult } from './types';
import GraphView from './components/GraphView';

export default function App() {
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });
  const [startNode, setStartNode] = useState<number | null>(null);
  const [endNode, setEndNode] = useState<number | null>(null);
  const [navigation, setNavigation] = useState<NavigationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [execTime, setExecTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'navigate' | 'edit'>('navigate');
  
  // Editor State
  const [newNodeName, setNewNodeName] = useState('');
  const [newLinkSource, setNewLinkSource] = useState<number | ''>('');
  const [newLinkTarget, setNewLinkTarget] = useState<number | ''>('');
  const [newLinkWeight, setNewLinkWeight] = useState(10);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const res = await fetch('/api/graph');
      const data = await res.json();
      setGraph(data);
    } catch (err) {
      console.error('Failed to fetch graph', err);
    }
  };

  const handleNavigate = async () => {
    if (startNode === null || endNode === null) return;
    
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const res = await fetch('/api/navigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startNode, endNode })
      });
      const data = await res.json();
      setNavigation(data);
      setExecTime(performance.now() - startTime);
    } catch (err) {
      console.error('Navigation failed', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGraphOnServer = async (newGraph: GraphData) => {
    try {
      await fetch('/api/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGraph)
      });
      setGraph(newGraph);
      setNavigation(null);
    } catch (err) {
      console.error('Failed to update graph', err);
    }
  };

  const addNode = () => {
    const id = graph.nodes.length > 0 ? Math.max(...graph.nodes.map(n => n.id)) + 1 : 0;
    const newNode: Node = {
      id,
      name: newNodeName || `Node ${id}`,
      x: Math.random() * 600 + 100,
      y: Math.random() * 400 + 100
    };
    updateGraphOnServer({ ...graph, nodes: [...graph.nodes, newNode] });
    setNewNodeName('');
  };

  const addLink = () => {
    if (newLinkSource === '' || newLinkTarget === '' || newLinkSource === newLinkTarget) return;
    
    // Check if link already exists
    const exists = graph.links.some(l => {
      const s = typeof l.source === 'number' ? l.source : l.source.id;
      const t = typeof l.target === 'number' ? l.target : l.target.id;
      return (s === newLinkSource && t === newLinkTarget) || (s === newLinkTarget && t === newLinkSource);
    });

    if (exists) {
      alert('This road already exists!');
      return;
    }

    const newLink: Link = {
      source: newLinkSource,
      target: newLinkTarget,
      weight: newLinkWeight
    };

    updateGraphOnServer({ ...graph, links: [...graph.links, newLink] });
    setNewLinkSource('');
    setNewLinkTarget('');
  };

  const removeNode = (id: number) => {
    const newNodes = graph.nodes.filter(n => n.id !== id);
    const newLinks = graph.links.filter(l => {
      const s = typeof l.source === 'number' ? l.source : l.source.id;
      const t = typeof l.target === 'number' ? l.target : l.target.id;
      return s !== id && t !== id;
    });
    updateGraphOnServer({ nodes: newNodes, links: newLinks });
    if (startNode === id) setStartNode(null);
    if (endNode === id) setEndNode(null);
  };

  const updateWeight = (source: number, target: number, newWeight: number) => {
    const newLinks = graph.links.map(l => {
      const s = typeof l.source === 'number' ? l.source : l.source.id;
      const t = typeof l.target === 'number' ? l.target : l.target.id;
      if ((s === source && t === target) || (s === target && t === source)) {
        return { ...l, weight: newWeight };
      }
      return l;
    });
    updateGraphOnServer({ ...graph, links: newLinks });
  };

  return (
    <div className="min-h-screen flex p-6 gap-6 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[320px] glass-card rounded-[24px] p-8 flex flex-col shrink-0">
        <div className="text-2xl font-extrabold tracking-tighter mb-10 flex items-center gap-2">
          SMART<span className="text-[#38bdf8]">NAV</span>
        </div>

        <div className="flex bg-black/20 backdrop-blur-md border border-white/10 p-1 rounded-xl mb-8">
          <button 
            onClick={() => setActiveTab('navigate')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'navigate' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Route size={14} />
            Navigate
          </button>
          <button 
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'edit' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Settings2 size={14} />
            Editor
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {activeTab === 'navigate' ? (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8]">Departure Point</label>
                <select 
                  value={startNode ?? ''} 
                  onChange={(e) => setStartNode(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#38bdf8]/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select starting point...</option>
                  {graph.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8]">Destination</label>
                <select 
                  value={endNode ?? ''} 
                  onChange={(e) => setEndNode(Number(e.target.value))}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#38bdf8]/50 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>Select destination...</option>
                  {graph.nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-3">
                  <Info className="text-[#94a3b8]" size={16} />
                  <p className="text-[11px] text-[#94a3b8] leading-relaxed">
                    High congestion detected on main routes. C++ engine adjusting weights...
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8]">Add New Location</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newNodeName}
                    onChange={(e) => setNewNodeName(e.target.value)}
                    placeholder="Location name..."
                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-[#38bdf8]/50 transition-all"
                  />
                  <button 
                    onClick={addNode}
                    className="p-2 bg-[#38bdf8] text-[#0f172a] rounded-xl hover:bg-[#38bdf8]/90 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8]">Existing Locations</label>
                <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {graph.nodes.map(node => (
                    <div key={node.id} className="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5 group">
                      <span className="text-sm font-medium">{node.name}</span>
                      <button 
                        onClick={() => removeNode(node.id)}
                        className="text-[#94a3b8] hover:text-[#f43f5e] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8]">Add New Road</label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={newLinkSource}
                    onChange={(e) => setNewLinkSource(Number(e.target.value))}
                    className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                  >
                    <option value="" disabled>Source</option>
                    {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                  <select 
                    value={newLinkTarget}
                    onChange={(e) => setNewLinkTarget(Number(e.target.value))}
                    className="bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none"
                  >
                    <option value="" disabled>Target</option>
                    {graph.nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] text-[#94a3b8] mb-1">
                      <span>Weight</span>
                      <span>{newLinkWeight} km</span>
                    </div>
                    <input 
                      type="range"
                      min="1"
                      max="100"
                      value={newLinkWeight}
                      onChange={(e) => setNewLinkWeight(Number(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
                    />
                  </div>
                  <button 
                    onClick={addLink}
                    disabled={newLinkSource === '' || newLinkTarget === ''}
                    className="p-2 bg-[#38bdf8] text-[#0f172a] rounded-xl hover:bg-[#38bdf8]/90 disabled:opacity-50 transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <label className="text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8] block mt-8">Traffic Simulation</label>
              <div className="space-y-4">
                {graph.links.map((link, idx) => {
                  const s = typeof link.source === 'number' ? link.source : link.source.id;
                  const t = typeof link.target === 'number' ? link.target : link.target.id;
                  const sName = graph.nodes.find(n => n.id === s)?.name;
                  const tName = graph.nodes.find(n => n.id === t)?.name;
                  
                  return (
                    <div key={idx} className="bg-black/20 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-[#94a3b8]">{sName} ↔ {tName}</span>
                        <span className="text-[10px] font-bold text-[#38bdf8]">{link.weight} km</span>
                      </div>
                      <input 
                        type="range" 
                        min="1" 
                        max="100" 
                        value={link.weight}
                        onChange={(e) => updateWeight(s, t, Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#38bdf8]"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>

        <button 
          onClick={handleNavigate}
          disabled={loading || startNode === null || endNode === null}
          className="w-full mt-8 bg-[#38bdf8] hover:bg-[#38bdf8]/90 disabled:bg-white/5 disabled:text-white/20 text-[#0f172a] font-extrabold py-4 rounded-xl shadow-[0_4px_15px_rgba(56,189,248,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98] uppercase text-sm tracking-widest"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#0f172a]/30 border-t-[#0f172a] rounded-full animate-spin"></div>
          ) : (
            <>
              <Activity size={18} />
              Execute Dijkstra (C++)
            </>
          )}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 glass-card rounded-[24px] overflow-hidden relative">
          <GraphView 
            data={graph} 
            shortestPath={navigation?.path || []} 
            onNodeClick={(node) => {
              if (activeTab === 'navigate') {
                if (!startNode) setStartNode(node.id);
                else if (!endNode) setEndNode(node.id);
                else {
                  setStartNode(node.id);
                  setEndNode(null);
                }
              }
            }}
            onLinkClick={() => {}}
          />
        </div>

        {/* Stats Panel */}
        <div className="h-[120px] glass-card rounded-[24px] grid grid-cols-4 items-center px-8">
          <div className="border-r border-white/10 px-6">
            <span className="block text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8] mb-1">Shortest Distance</span>
            <span className="text-2xl font-bold text-white">
              {navigation ? `${navigation.distance} km` : '--'}
            </span>
          </div>
          <div className="border-r border-white/10 px-6">
            <span className="block text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8] mb-1">Execution Time (C++)</span>
            <span className="text-2xl font-bold text-white">
              {execTime ? `${execTime.toFixed(3)} ms` : '--'}
            </span>
          </div>
          <div className="border-r border-white/10 px-6">
            <span className="block text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8] mb-1">Path Taken</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {navigation ? (
                navigation.path.map((id, i) => (
                  <span key={id} className="text-sm font-bold text-white">
                    {graph.nodes.find(n => n.id === id)?.name.split(' ')[0]}
                    {i < navigation.path.length - 1 && <span className="mx-1 text-[#94a3b8]">→</span>}
                  </span>
                ))
              ) : (
                <span className="text-sm font-bold text-[#94a3b8]">No route calculated</span>
              )}
            </div>
          </div>
          <div className="px-6">
            <span className="block text-[11px] font-bold uppercase tracking-[1px] text-[#94a3b8] mb-1">System Status</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></div>
              <span className="text-sm font-bold text-[#10b981]">Optimal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
