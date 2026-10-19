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
import { useCallback, useMemo } from 'react';
import { linksOf } from '../model/links';
import type { Problem } from '../model/validate';
import { useEditor } from '../store';
import { nodeTypes, type FlowNode } from './nodes';

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

  const nodes = useMemo<FlowNode[]>(() => {
    const counts = new Map<string, number>();
    for (const p of problems) if (p.nodeId) counts.set(p.nodeId, (counts.get(p.nodeId) ?? 0) + 1);
    return Object.values(dialogue.nodes).map((node) => ({
      id: node.id,
      type: 'dialogue',
      position: node.position,
      selected: node.id === selectedId,
      data: { node, isStart: node.id === dialogue.start, isActive: node.id === activeId, problems: counts.get(node.id) ?? 0 },
    }));
  }, [dialogue, selectedId, activeId, problems]);

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
    for (const c of changes) {
      if (c.type === 'position' && c.position) moveNode(c.id, c.position);
      else if (c.type === 'select' && c.selected) select(c.id);
      else if (c.type === 'remove') removed.push(c.id);
    }
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
      <MiniMap pannable zoomable nodeColor={(n: FlowNode) => `var(--${n.data.node.kind})`} />
      <Controls />
    </ReactFlow>
  );
}
