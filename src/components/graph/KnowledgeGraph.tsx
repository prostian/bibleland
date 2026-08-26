import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
} from 'd3-force';
import { select } from 'd3-selection';
import { zoom, zoomIdentity, type ZoomTransform } from 'd3-zoom';

import type { GraphEdge, GraphNode, KnowledgeGraph as Graph, NodeType } from '@/types';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useElementSize } from '@/hooks/useElementSize';

/** Farbtoken je Knotentyp — dieselben wie in Karte und Chips. */
const NODE_COLOR_VAR: Record<NodeType, string> = {
  ereignis: '--bl-node-ereignis',
  person: '--bl-node-person',
  ort: '--bl-node-ort',
  buch: '--bl-node-buch',
  reise: '--bl-node-reise',
};

/** Radius aus dem Grad: viel verknüpfte Knoten sind größer, aber nicht beliebig. */
function radiusOf(node: GraphNode, isCenter: boolean): number {
  if (isCenter) return 11;
  return Math.min(4 + Math.sqrt(node.degree) * 1.6, 10);
}

interface KnowledgeGraphProps {
  graph: Graph;
  /** Knoten, um den herum gezeichnet wird — wird hervorgehoben. */
  centerId?: string | undefined;
  onSelect: (node: GraphNode) => void;
}

/**
 * Das Wissensnetz als Kräftesimulation auf einem Canvas.
 *
 * Canvas statt DOM oder SVG: Bei mehreren hundert Knoten, die sich sechzigmal
 * pro Sekunde bewegen, wäre jedes Element ein eigener Layout-Vorgang. Der
 * Preis ist, dass die Knoten nicht fokussierbar sind — deshalb steht neben
 * dem Netz immer eine Liste derselben Knoten als bedienbare Alternative.
 *
 * Farben werden zur Laufzeit aus den CSS-Variablen gelesen, damit das Netz
 * beim Wechsel zwischen hellem und dunklem Modus mitzieht.
 */
export default function KnowledgeGraph({ graph, centerId, onSelect }: KnowledgeGraphProps) {
  const [containerRef, size] = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const [hovered, setHovered] = useState<GraphNode | null>(null);

  // Simulation, Transformation und Knotenpositionen leben außerhalb von React:
  // Sie ändern sich pro Bild, ein Rerender pro Bild wäre unbezahlbar.
  const simulationRef = useRef<Simulation<GraphNode, GraphEdge> | null>(null);
  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const nodesRef = useRef<GraphNode[]>([]);
  const hoveredRef = useRef<GraphNode | null>(null);

  // Kopien anlegen: d3-force schreibt x/y/vx/vy direkt in die Objekte, und
  // der Datenbestand darf davon nichts abbekommen.
  const data = useMemo(() => {
    const nodes: GraphNode[] = graph.nodes.map((node) => ({ ...node }));
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const edges: GraphEdge[] = graph.edges
      .map((edge) => ({
        ...edge,
        source: byId.get(edge.source as string)!,
        target: byId.get(edge.target as string)!,
      }))
      .filter((edge) => edge.source && edge.target);
    return { nodes, edges };
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const { width, height } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    nodesRef.current = data.nodes;

    // Den Mittelpunktsknoten festhalten, damit die Ansicht nicht wegdriftet.
    const center = data.nodes.find((node) => node.id === centerId);
    if (center) {
      center.fx = 0;
      center.fy = 0;
    }

    const simulation = forceSimulation<GraphNode, GraphEdge>(data.nodes)
      .force(
        'link',
        forceLink<GraphNode, GraphEdge>(data.edges)
          .id((node) => node.id)
          .distance((edge) => (edge.type === 'verwandt_mit' ? 42 : 62))
          .strength(0.28),
      )
      .force('charge', forceManyBody<GraphNode>().strength(-170).distanceMax(420))
      .force('collide', forceCollide<GraphNode>().radius((node) => radiusOf(node, node.id === centerId) + 7))
      .force('center', forceCenter(0, 0))
      .alphaDecay(0.035);

    simulationRef.current = simulation;

    const styles = getComputedStyle(document.documentElement);
    const readVar = (name: string) => styles.getPropertyValue(name).trim() || '#888';
    const colors = {
      edge: readVar('--bl-border-strong'),
      edgeActive: readVar('--bl-accent'),
      label: readVar('--bl-text-muted'),
      labelStrong: readVar('--bl-text'),
      surface: readVar('--bl-surface'),
      node: Object.fromEntries(
        Object.entries(NODE_COLOR_VAR).map(([type, name]) => [type, readVar(name)]),
      ) as Record<NodeType, string>,
    };

    const draw = () => {
      const t = transformRef.current;
      context.save();
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.translate(width / 2 + t.x, height / 2 + t.y);
      context.scale(t.k, t.k);

      const active = hoveredRef.current;
      const activeNeighbours = new Set<string>();
      if (active) {
        for (const edge of data.edges) {
          const source = edge.source as GraphNode;
          const target = edge.target as GraphNode;
          if (source.id === active.id) activeNeighbours.add(target.id);
          if (target.id === active.id) activeNeighbours.add(source.id);
        }
      }

      // Kanten zuerst, damit die Knoten obenauf liegen.
      context.lineWidth = 1 / t.k;
      for (const edge of data.edges) {
        const source = edge.source as GraphNode;
        const target = edge.target as GraphNode;
        if (source.x === undefined || target.x === undefined) continue;

        const touchesActive =
          active !== null && (source.id === active.id || target.id === active.id);
        context.strokeStyle = touchesActive ? colors.edgeActive : colors.edge;
        context.globalAlpha = active ? (touchesActive ? 0.9 : 0.12) : 0.45;
        context.beginPath();
        context.moveTo(source.x, source.y ?? 0);
        context.lineTo(target.x, target.y ?? 0);
        context.stroke();
      }

      context.globalAlpha = 1;

      for (const node of data.nodes) {
        if (node.x === undefined || node.y === undefined) continue;
        const isCenter = node.id === centerId;
        const dimmed = active !== null && !isCenter && node.id !== active.id && !activeNeighbours.has(node.id);
        const r = radiusOf(node, isCenter);

        context.globalAlpha = dimmed ? 0.2 : 1;
        context.beginPath();
        context.arc(node.x, node.y, r, 0, Math.PI * 2);
        context.fillStyle = colors.node[node.type];
        context.fill();

        if (isCenter || node.id === active?.id) {
          context.lineWidth = 2.5 / t.k;
          context.strokeStyle = colors.surface;
          context.stroke();
        }

        // Beschriftung nur, wo sie lesbar ist und nicht alles zukleistert.
        const showLabel = isCenter || node.id === active?.id || (t.k > 1.15 && node.degree > 3);
        if (showLabel && !dimmed) {
          context.font = `${isCenter ? 600 : 400} ${11 / t.k}px ${getComputedStyle(document.body).fontFamily}`;
          context.fillStyle = isCenter ? colors.labelStrong : colors.label;
          context.textAlign = 'center';
          context.textBaseline = 'top';
          context.fillText(node.label, node.x, node.y + r + 3 / t.k);
        }
      }

      context.globalAlpha = 1;
      context.restore();
    };

    simulation.on('tick', draw);

    // Bei abbestellter Bewegung nicht animieren, sondern vorrechnen und
    // einmal zeichnen — das Ergebnis ist dasselbe, nur ohne Zappeln.
    if (reducedMotion) {
      simulation.stop();
      for (let i = 0; i < 220; i++) simulation.tick();
      draw();
    }

    /* --- Zoomen und Verschieben ---------------------------------- */
    const zoomBehaviour = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        draw();
      });

    const selection = select(canvas);
    selection.call(zoomBehaviour);

    /* --- Treffersuche unter dem Mauszeiger ----------------------- */
    const nodeAt = (clientX: number, clientY: number): GraphNode | null => {
      const rect = canvas.getBoundingClientRect();
      const t = transformRef.current;
      const x = (clientX - rect.left - width / 2 - t.x) / t.k;
      const y = (clientY - rect.top - height / 2 - t.y) / t.k;

      let best: GraphNode | null = null;
      let bestDistance = Infinity;
      for (const node of data.nodes) {
        if (node.x === undefined || node.y === undefined) continue;
        const dx = node.x - x;
        const dy = node.y - y;
        const distance = dx * dx + dy * dy;
        const r = radiusOf(node, node.id === centerId) + 4;
        if (distance <= r * r && distance < bestDistance) {
          best = node;
          bestDistance = distance;
        }
      }
      return best;
    };

    const onMouseMove = (e: MouseEvent) => {
      const node = nodeAt(e.clientX, e.clientY);
      if (node?.id !== hoveredRef.current?.id) {
        hoveredRef.current = node;
        setHovered(node);
        canvas.style.cursor = node ? 'pointer' : 'grab';
        draw();
      }
    };

    const onClick = (e: MouseEvent) => {
      const node = nodeAt(e.clientX, e.clientY);
      if (node) onSelect(node);
    };

    const onMouseLeave = () => {
      hoveredRef.current = null;
      setHovered(null);
      draw();
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('mouseleave', onMouseLeave);

    return () => {
      simulation.stop();
      selection.on('.zoom', null);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('mouseleave', onMouseLeave);
      simulationRef.current = null;
    };
  }, [data, size, centerId, reducedMotion, onSelect]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="block cursor-grab touch-none" />

      {hovered ? (
        <div className="pointer-events-none absolute bottom-3 left-3 max-w-xs rounded-lg border border-line bg-overlay px-2.5 py-1.5 shadow-panel backdrop-blur-md">
          <p className="text-xs font-medium text-ink">{hovered.label}</p>
          <p className="text-[10px] text-ink-subtle">
            {hovered.type} · {hovered.degree} Verbindungen
          </p>
        </div>
      ) : null}
    </div>
  );
}
