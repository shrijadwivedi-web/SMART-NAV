import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Node, Link, GraphData } from '../types';

interface GraphViewProps {
  data: GraphData;
  shortestPath: number[];
  onNodeClick: (node: Node) => void;
  onLinkClick: (link: Link) => void;
}

export default function GraphView({ data, shortestPath, onNodeClick, onLinkClick }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current?.parentElement) {
        const { clientWidth, clientHeight } = svgRef.current.parentElement;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };

    window.addEventListener('resize', updateDimensions);
    updateDimensions();
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Draw links
    const links = g.append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', (d) => {
        const u = typeof d.source === 'number' ? d.source : d.source.id;
        const v = typeof d.target === 'number' ? d.target : d.target.id;
        
        const isPath = shortestPath.some((nodeId, i) => {
          if (i === 0) return false;
          const prev = shortestPath[i - 1];
          return (prev === u && nodeId === v) || (prev === v && nodeId === u);
        });

        return isPath ? '#f43f5e' : 'rgba(255, 255, 255, 0.1)';
      })
      .attr('stroke-width', (d) => {
        const u = typeof d.source === 'number' ? d.source : d.source.id;
        const v = typeof d.target === 'number' ? d.target : d.target.id;
        const isPath = shortestPath.some((nodeId, i) => {
          if (i === 0) return false;
          const prev = shortestPath[i - 1];
          return (prev === u && nodeId === v) || (prev === v && nodeId === u);
        });
        return isPath ? 4 : 2;
      })
      .attr('stroke-linecap', 'round')
      .style('filter', (d) => {
        const u = typeof d.source === 'number' ? d.source : d.source.id;
        const v = typeof d.target === 'number' ? d.target : d.target.id;
        const isPath = shortestPath.some((nodeId, i) => {
          if (i === 0) return false;
          const prev = shortestPath[i - 1];
          return (prev === u && nodeId === v) || (prev === v && nodeId === u);
        });
        return isPath ? 'drop-shadow(0 0 10px rgba(244, 63, 94, 0.5))' : 'none';
      })
      .attr('x1', (d) => {
        const sourceNode = data.nodes.find(n => n.id === (typeof d.source === 'number' ? d.source : d.source.id));
        return sourceNode?.x || 0;
      })
      .attr('y1', (d) => {
        const sourceNode = data.nodes.find(n => n.id === (typeof d.source === 'number' ? d.source : d.source.id));
        return sourceNode?.y || 0;
      })
      .attr('x2', (d) => {
        const targetNode = data.nodes.find(n => n.id === (typeof d.target === 'number' ? d.target : d.target.id));
        return targetNode?.x || 0;
      })
      .attr('y2', (d) => {
        const targetNode = data.nodes.find(n => n.id === (typeof d.target === 'number' ? d.target : d.target.id));
        return targetNode?.y || 0;
      })
      .on('click', (event, d) => onLinkClick(d));

    // Weight labels
    g.append('g')
      .selectAll('text')
      .data(data.links)
      .enter()
      .append('text')
      .attr('x', (d) => {
        const s = data.nodes.find(n => n.id === (typeof d.source === 'number' ? d.source : d.source.id));
        const t = data.nodes.find(n => n.id === (typeof d.target === 'number' ? d.target : d.target.id));
        return ((s?.x || 0) + (t?.x || 0)) / 2;
      })
      .attr('y', (d) => {
        const s = data.nodes.find(n => n.id === (typeof d.source === 'number' ? d.source : d.source.id));
        const t = data.nodes.find(n => n.id === (typeof d.target === 'number' ? d.target : d.target.id));
        return ((s?.y || 0) + (t?.y || 0)) / 2 - 10;
      })
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => `${d.weight}ms`);

    // Draw nodes
    const nodes = g.append('g')
      .selectAll('g')
      .data(data.nodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => onNodeClick(d))
      .style('cursor', 'pointer');

    nodes.append('circle')
      .attr('r', 24)
      .attr('fill', d => shortestPath.includes(d.id) ? '#f43f5e' : 'rgba(15, 23, 42, 0.8)')
      .attr('stroke', d => shortestPath.includes(d.id) ? '#fff' : '#38bdf8')
      .attr('stroke-width', 2)
      .style('filter', d => shortestPath.includes(d.id) ? 'drop-shadow(0 0 20px rgba(244, 63, 94, 0.4))' : 'drop-shadow(0 0 15px rgba(56, 189, 248, 0.2))');

    nodes.append('text')
      .attr('dy', 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .attr('font-size', '12px')
      .attr('font-weight', '700')
      .text(d => d.name.charAt(0));

    nodes.append('text')
      .attr('dy', 40)
      .attr('text-anchor', 'middle')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .text(d => d.name);

    // Pulse animation for path nodes
    if (shortestPath.length > 0) {
      nodes.filter(d => shortestPath.includes(d.id))
        .select('circle')
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', '24;26;24')
        .attr('dur', '1.5s')
        .attr('repeatCount', 'indefinite');
    }

  }, [data, shortestPath, dimensions]);

  return (
    <div className="w-full h-full bg-transparent overflow-hidden relative">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="bg-black/30 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-lg">
          <h3 className="text-[#94a3b8] text-[10px] font-bold uppercase tracking-widest mb-3">Network Legend</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-slate-900 border border-[#38bdf8]"></div>
              <span className="text-[#94a3b8] text-[11px] font-medium">Location</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#f43f5e] shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
              <span className="text-[#94a3b8] text-[11px] font-medium">Route Node</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-0.5 bg-white/10"></div>
              <span className="text-[#94a3b8] text-[11px] font-medium">Road</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-1 bg-[#f43f5e]"></div>
              <span className="text-[#94a3b8] text-[11px] font-medium">Shortest Path</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
