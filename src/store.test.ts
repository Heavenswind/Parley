import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyDialogue, sampleDialogue } from './model/dialogue';
import { useEditor } from './store';

// Tests don't need the autosave; without this, zustand warns that there's no localStorage in Node.
vi.mock('zustand/middleware', async (original) => ({
  ...(await original<typeof import('zustand/middleware')>()),
  persist: <T,>(config: T) => config,
}));

const store = () => useEditor.getState();

describe('undo and redo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditor.setState({ dialogue: sampleDialogue(), past: [], future: [], lastMerge: null, selectedId: null, playtest: null });
  });
  afterEach(() => vi.useRealTimers());

  const firstLine = () => Object.values(store().dialogue.nodes).find((n) => n.kind === 'line')!;

  it('undoes typing in one field as a single step', () => {
    const id = firstLine().id;
    for (const text of ['H', 'He', 'Hey']) {
      store().updateNode(id, { text });
      vi.advanceTimersByTime(200);
    }
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().dialogue).toEqual(sampleDialogue());
  });

  it('starts a new step after a pause or in another field', () => {
    const id = firstLine().id;
    store().updateNode(id, { text: 'a' });
    vi.advanceTimersByTime(1500);
    store().updateNode(id, { text: 'ab' });
    store().updateNode(id, { speaker: 'Mara' });
    expect(store().past).toHaveLength(3);
  });

  it('undoes a whole drag at once', () => {
    const id = firstLine().id;
    for (let x = 0; x < 50; x += 5) {
      store().moveNode(id, { x, y: 0 });
      vi.advanceTimersByTime(16);
    }
    expect(store().past).toHaveLength(1);
  });

  it('makes New undoable and redoes it', () => {
    store().reset();
    expect(store().dialogue).toEqual(emptyDialogue());
    store().undo();
    expect(store().dialogue).toEqual(sampleDialogue());
    store().redo();
    expect(store().dialogue).toEqual(emptyDialogue());
  });

  it('restores deleted nodes and their links, and clears a selection that no longer exists', () => {
    const id = firstLine().id;
    store().deleteNodes([id]);
    expect(store().dialogue.nodes[id]).toBeUndefined();
    store().undo();
    expect(store().dialogue).toEqual(sampleDialogue());

    store().addNode('end', { x: 0, y: 0 });
    const added = store().selectedId!;
    store().undo();
    expect(store().dialogue.nodes[added]).toBeUndefined();
    expect(store().selectedId).toBeNull();
  });

  it('deletes a node and other selected links in one step', () => {
    const before = store().dialogue;
    const choice = Object.values(before.nodes).find((n) => n.kind === 'choice')!;
    const condition = Object.values(before.nodes).find((n) => n.kind === 'condition')!;
    store().deleteNodes([choice.id], [{ source: condition.id, handle: 'true' }]);
    expect(store().dialogue.nodes[choice.id]).toBeUndefined();
    expect(store().dialogue.nodes[condition.id]).toMatchObject({ whenTrue: null });
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().dialogue).toEqual(before);
  });

  it('duplicates the selected node as one step and selects the copy', () => {
    const id = firstLine().id;
    store().select(id);
    store().duplicateSelection();
    const copyId = store().selectedId!;
    expect(copyId).not.toBe(id);
    expect(store().dialogue.nodes[copyId]).toMatchObject({ kind: 'line', text: firstLine().text, next: null });
    expect(store().past).toHaveLength(1);
    store().undo();
    expect(store().dialogue).toEqual(sampleDialogue());
  });

  it('pastes the node as it was when copied, stepping each paste further out', () => {
    const line = firstLine();
    store().select(line.id);
    store().copySelection();
    store().updateNode(line.id, { text: 'changed after copying' });
    store().paste();
    const first = store().dialogue.nodes[store().selectedId!];
    store().paste();
    const second = store().dialogue.nodes[store().selectedId!];
    expect(first).toMatchObject({ text: line.text, position: { x: line.position.x + 40, y: line.position.y + 40 } });
    expect(second.position).toEqual({ x: line.position.x + 80, y: line.position.y + 80 });
  });

  it('drops the redo list after a new edit', () => {
    store().setTitle('A');
    store().undo();
    expect(store().future).toHaveLength(1);
    store().addVariable();
    expect(store().future).toEqual([]);
  });
});
