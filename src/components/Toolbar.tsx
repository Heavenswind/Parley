import { useReactFlow } from '@xyflow/react';
import { useEffect, useRef, useState } from 'react';
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

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function Toolbar({ errorCount }: { errorCount: number }) {
  const title = useEditor((s) => s.dialogue.title);
  const playing = useEditor((s) => s.playtest !== null);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { setTitle, addNode, load, reset, undo, redo, copySelection, paste, duplicateSelection } = useEditor.getState();
  const flow = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Inside a text field, Ctrl+Z belongs to the field.
      if (!(e.ctrlKey || e.metaKey) || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) undo();
      else if (key === 'y' || (key === 'z' && e.shiftKey)) redo();
      else if (key === 'c') copySelection();
      else if (key === 'v') paste();
      else if (key === 'd') duplicateSelection();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copySelection, paste, duplicateSelection]);

  // New and Sample replace the dialogue in one undoable step, so they don't need a confirmation.
  const replaceWith = (which: 'new' | 'sample') => {
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
      <div className="group">
        <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
        <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">Redo</button>
      </div>
      <span className="spacer" />
      {message && <span className="error">{message}</span>}
      <div className="group">
        <button onClick={() => replaceWith('new')} title="Start an empty dialogue (undoable)">New</button>
        <button onClick={() => replaceWith('sample')} title="Load the sample dialogue (undoable)">Sample</button>
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
