import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { useCallback, useMemo, useState } from 'react';
import { linksOf } from '../model/links';
import type { NodeKind } from '../model/types';
import type { Problem } from '../model/validate';
import { useEditor } from '../store';
import { nodeTypes, type FlowNode } from './nodes';

// The minimap paints with SVG fill attributes, which can't read CSS variables; keep in sync with styles.css.
const MINIMAP_COLORS: Record<NodeKind, string> = {
  line: '#7aa2ff',
  choice: '#c58cff',
  condition: '#f4c15d',
  set: '#4fd1a5',
  end: '#ff8a65',
};

// Edge ids encode the link they came from: "<sourceId>|<handle>".
const edgeId = (source: string, handle: string) => `${source}|${handle}`;
const parseEdgeId = (id: string) => {
  const i = id.indexOf('|');
  return { source: id.slice(0, i), handle: id.slice(i + 1) };
};

export function Canvas({ problems }: { problems: Problem[] }) {
  const dialogue = useEditor((s) => s.dialogue);
  const selectedId = useEditor((s) => s.selectedId);
  const activeId = useEditor((s) => s.playtest?.step.nodeId ?? null);
  const { moveNode, deleteNodes, select, connect, disconnect } = useEditor.getState();
  // Rendered sizes reported by React Flow. Nodes are rebuilt from the store on every change,
  // so these have to be passed back in or the minimap and fitView see zero-sized nodes.
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number }>>({});

  const nodes = useMemo<FlowNode[]>(() => {
    const counts = new Map<string, number>();
    for (const p of problems) if (p.nodeId) counts.set(p.nodeId, (counts.get(p.nodeId) ?? 0) + 1);
    return Object.values(dialogue.nodes).map((node) => ({
      id: node.id,
      type: 'dialogue',
      position: node.position,
      selected: node.id === selectedId,
      measured: measured[node.id],
      data: { node, isStart: node.id === dialogue.start, isActive: node.id === activeId, problems: counts.get(node.id) ?? 0 },
    }));
  }, [dialogue, selectedId, activeId, problems, measured]);

  const edges = useMemo<Edge[]>(
    () =>
      Object.values(dialogue.nodes).flatMap((node) =>
        linksOf(node)
          .filter((l) => l.target && dialogue.nodes[l.target])
          .map((l) => ({
            id: edgeId(node.id, l.handle),
            source: node.id,
            sourceHandle: l.handle,
            target: l.target!,
            targetHandle: 'in',
            label: l.handle === 'true' || l.handle === 'false' ? l.handle : undefined,
          })),
      ),
    [dialogue],
  );

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => {
    const removed: string[] = [];
    const sizes: Record<string, { width: number; height: number }> = {};
    for (const c of changes) {
      if (c.type === 'dimensions' && c.dimensions) sizes[c.id] = c.dimensions;
      else if (c.type === 'position' && c.position) moveNode(c.id, c.position);
      else if (c.type === 'select' && c.selected) select(c.id);
      else if (c.type === 'remove') removed.push(c.id);
    }
    if (Object.keys(sizes).length) setMeasured((m) => ({ ...m, ...sizes }));
    if (removed.length) deleteNodes(removed);
  }, [moveNode, select, deleteNodes]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const c of changes) {
      if (c.type === 'remove') {
        const { source, handle } = parseEdgeId(c.id);
        disconnect(source, handle);
      }
    }
  }, [disconnect]);

  const onConnect = useCallback((c: Connection) => {
    if (c.sourceHandle && c.source !== c.target) connect(c.source, c.sourceHandle, c.target);
  }, [connect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={() => select(null)}
      deleteKeyCode={['Delete', 'Backspace']}
      colorMode="dark"
      fitView
      minZoom={0.2}
    >
      <Background gap={24} />
      <MiniMap pannable zoomable nodeColor={(n: FlowNode) => MINIMAP_COLORS[n.data.node.kind]} />
      <Controls />
    </ReactFlow>
  );
}
