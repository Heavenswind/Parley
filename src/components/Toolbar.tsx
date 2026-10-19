import { useReactFlow } from '@xyflow/react';
import { useRef, useState } from 'react';
import { download, readDialogueFile, slug } from '../files';
import { sampleDialogue, toRuntime } from '../model/dialogue';
import type { NodeKind } from '../model/types';
import { useEditor } from '../store';
import { startPlaytest } from './Playtest';

const KINDS: { kind: NodeKind; label: string }[] = [
  { kind: 'line', label: 'Line' },
  { kind: 'choice', label: 'Choice' },
  { kind: 'condition', label: 'Condition' },
  { kind: 'set', label: 'Set' },
  { kind: 'end', label: 'End' },
];

export function Toolbar({ errorCount }: { errorCount: number }) {
  const title = useEditor((s) => s.dialogue.title);
  const playing = useEditor((s) => s.playtest !== null);
  const { setTitle, addNode, load, reset } = useEditor.getState();
  const flow = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  // "New" and "Sample" replace the current dialogue, so they ask for a second click instead of a browser dialog.
  const [armed, setArmed] = useState<'new' | 'sample' | null>(null);

  const replaceWith = (which: 'new' | 'sample') => {
    if (armed !== which) {
      setArmed(which);
      setTimeout(() => setArmed((a) => (a === which ? null : a)), 3000);
      return;
    }
    setArmed(null);
    if (which === 'new') reset();
    else load(sampleDialogue());
    setTimeout(() => flow.fitView(), 0);
  };

  // New nodes appear in the middle of what's on screen, nudged so repeated adds don't stack exactly.
  const addAtCenter = (kind: NodeKind) => {
    const canvas = document.querySelector('.react-flow')!.getBoundingClientRect();
    const p = flow.screenToFlowPosition({ x: canvas.left + canvas.width / 2, y: canvas.top + canvas.height / 2 });
    const jitter = () => Math.round((Math.random() - 0.5) * 60);
    addNode(kind, { x: p.x - 100 + jitter(), y: p.y - 40 + jitter() });
  };

  const open = async (file: File | undefined) => {
    if (!file) return;
    try {
      load(await readDialogueFile(file));
      setMessage(null);
      setTimeout(() => flow.fitView(), 0);
    } catch (e) {
      setMessage(`Could not open ${file.name}: ${(e as Error).message}`);
    }
  };

  const exportRuntime = () => {
    const { dialogue } = useEditor.getState();
    download(`${slug(dialogue.title)}.json`, toRuntime(dialogue));
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
      <span className="spacer" />
      {message && <span className="error">{message}</span>}
      <div className="group">
        <button onClick={() => replaceWith('new')}>{armed === 'new' ? 'Click again to clear' : 'New'}</button>
        <button onClick={() => replaceWith('sample')}>{armed === 'sample' ? 'Click again to replace' : 'Sample'}</button>
        <button onClick={() => fileInput.current?.click()}>Open…</button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onChange={(e) => {
            void open(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button onClick={() => { const { dialogue } = useEditor.getState(); download(`${slug(dialogue.title)}.parley.json`, dialogue); }}>
          Save
        </button>
        <button
          onClick={exportRuntime}
          disabled={errorCount > 0}
          title={errorCount > 0 ? 'Fix the errors in the Problems panel first' : 'Export for the game, without editor data'}
        >
          Export for game
        </button>
        <button className="primary" onClick={startPlaytest}>{playing ? 'Restart playtest' : 'Playtest'}</button>
      </div>
    </header>
  );
}
