import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { DialogueNode } from '../model/types';

export type NodeData = { node: DialogueNode; isStart: boolean; isActive: boolean; problems: number };
export type FlowNode = Node<NodeData>;

const TITLES: Record<DialogueNode['kind'], string> = {
  line: 'Line',
  choice: 'Choice',
  condition: 'Condition',
  set: 'Set',
  end: 'End',
};

function Shell({ data, children }: { data: NodeData; children: React.ReactNode }) {
  const { node, isStart, isActive, problems } = data;
  return (
    <div className={`gnode gnode-${node.kind}${isActive ? ' is-active' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" />
      <div className="gnode-head">
        <span>{TITLES[node.kind]}</span>
        {isStart && <span className="badge badge-start">start</span>}
        {problems > 0 && <span className="badge badge-problem" title="See the Problems panel">{problems}</span>}
      </div>
      <div className="gnode-body">{children}</div>
    </div>
  );
}

function Out({ id, label }: { id: string; label?: string }) {
  return (
    <div className="gnode-out">
      {label && <span className="gnode-out-label">{label}</span>}
      <Handle type="source" position={Position.Right} id={id} />
    </div>
  );
}

const placeholder = (text: string, fallback: string) => (text.trim() ? text : <em className="muted">{fallback}</em>);

function DialogueNodeView({ data }: NodeProps<FlowNode>) {
  const { node } = data;
  switch (node.kind) {
    case 'line':
      return (
        <Shell data={data}>
          <div className="speaker">{placeholder(node.speaker, 'No speaker')}</div>
          <div className="text">{placeholder(node.text, 'Empty line')}</div>
          <Out id="next" />
        </Shell>
      );
    case 'choice':
      return (
        <Shell data={data}>
          {node.prompt && <div className="text">{node.prompt}</div>}
          {node.options.map((o, i) => (
            <div className="option" key={o.id}>
              <span>{placeholder(o.text, `Option ${i + 1}`)}</span>
              {o.condition && <code className="cond" title="Only shown when this is true">if {o.condition}</code>}
              <Handle type="source" position={Position.Right} id={`opt:${o.id}`} />
            </div>
          ))}
        </Shell>
      );
    case 'condition':
      return (
        <Shell data={data}>
          <code>{placeholder(node.expression, 'No expression')}</code>
          <Out id="true" label="true" />
          <Out id="false" label="false" />
        </Shell>
      );
    case 'set':
      return (
        <Shell data={data}>
          <code>
            {node.variable || '?'} = {node.expression || '?'}
          </code>
          <Out id="next" />
        </Shell>
      );
    case 'end':
      return (
        <Shell data={data}>
          {node.tag ? <code>{node.tag}</code> : <em className="muted">No tag</em>}
        </Shell>
      );
  }
}

// One component for every kind keeps the React Flow `nodeTypes` map stable.
export const nodeTypes = { dialogue: DialogueNodeView };
