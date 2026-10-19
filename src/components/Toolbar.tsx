import { useReactFlow } from '@xyflow/react';
import type { NodeKind } from '../model/types';
import { useEditor } from '../store';

const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: 'line', label: 'Line' },
  { kind: 'choice', label: 'Choice' },
  { kind: 'condition', label: 'Condition' },
  { kind: 'set', label: 'Set' },
  { kind: 'end', label: 'End' },
];

export function Toolbar() {
  const title = useEditor((s) => s.dialogue.title);
  const { setTitle, addNode } = useEditor.getState();
  const flow = useReactFlow();

  // New nodes appear in the middle of what's on screen, nudged so repeated adds don't stack exactly.
  const addAtCenter = (kind: NodeKind) => {
    const canvas = document.querySelector('.react-flow')!.getBoundingClientRect();
    const p = flow.screenToFlowPosition({ x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 });
    const jitter = () => Math.round((Math.random() - 0.5) * 60);
    addNode(kind, { x: p.x - 100 + jitter(), y: p.y - 40 + jitter() });
  };

  return (
    <header className="toolbar">
      <strong className="logo">Parley</strong>
      <input className="title" value={title} aria-label="Dialogue title" onChange={(e) => setTitle(e.target.value)} />
      <div className="group">
        <span className="muted">Add</span>
        {KINDS.map(({ kind, label }) => (
          <button key={kind} className={`add add-${kind}`} onClick={() => addAtCenter(kind)}>{label}</button>
        ))}
      </div>
    </header>
  );
}
