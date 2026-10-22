import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cloneNodes } from './model/clipboard';
import { createNode, defaultValue, emptyDialogue, sampleDialogue } from './model/dialogue';
import { record, redo, undo, type Timeline } from './model/history';
import { withLink, withoutLinksTo } from './model/links';
import type { RunState, Step } from './model/runner';
import type { Dialogue, DialogueNode, NodeKind, Position, Variable } from './model/types';

export interface Playtest {
  state: RunState;
  step: Step;
  /** Every step shown so far, for the transcript. */
  history: Step[];
  /** The node the run was started from, or undefined for the dialogue's start node. */
  from?: string;
}

/** Edits with the same merge key this close together undo as one step (typing in a field, one drag). */
const MERGE_MS = 1000;

interface EditorState {
  dialogue: Dialogue;
  /** Earlier and undone versions of `dialogue`, for undo/redo. Not saved. */
  past: Dialogue[];
  future: Dialogue[];
  lastMerge: { key: string; at: number } | null;
  /** Selected node ids, in the order they were picked. */
  selectedIds: string[];
  playtest: Playtest | null;

  /** Replaces the dialogue (Open, Sample). Undoable. */
  load: (d: Dialogue) => void;
  /** Starts an empty dialogue. Undoable. */
  reset: () => void;
  undo: () => void;
  redo: () => void;
  setTitle: (title: string) => void;

  addNode: (kind: NodeKind, position: Position) => void;
  updateNode: (id: string, patch: Partial<DialogueNode>) => void;
  /** `mergeKey` names the field being typed in, so each keystroke doesn't become its own undo step. */
  replaceNode: (node: DialogueNode, mergeKey?: string) => void;
  /** Moves nodes together (a drag of the whole selection), as one undo step. */
  moveNodes: (moves: { id: string; position: Position }[]) => void;
  /** Deletes nodes (and every link into them) plus any extra links, as one undo step. */
  deleteNodes: (ids: string[], links?: { source: string; handle: string }[]) => void;
  connect: (source: string, handle: string, target: string) => void;
  disconnect: (source: string, handle: string) => void;
  setStart: (id: string) => void;
  /** Selects one node, or nothing. */
  select: (id: string | null) => void;
  /** Replaces the whole selection (box selection, ctrl-clicks). */
  setSelection: (ids: string[]) => void;
  /** The copied nodes, as they were when copied. Not saved. */
  clipboard: { nodes: DialogueNode[]; pastes: number } | null;
  copySelection: () => void;
  /** Pastes the clipboard, each paste a little further down and to the right. */
  paste: () => void;
  duplicateSelection: () => void;

  addVariable: () => void;
  updateVariable: (index: number, patch: Partial<Variable>) => void;
  removeVariable: (index: number) => void;

  setPlaytest: (p: Playtest | null) => void;
}

export const useEditor = create<EditorState>()(
  persist(
    (set, get) => {
      const timeline =(s: EditorState): Timeline<Dialogue> => ({ past: s.past, present: s.dialogue, future: s.future });
      const fromTimeline = (t: Timeline<Dialogue>) => ({ dialogue: t.present, past: t.past, future: t.future });

      const edit = (fn: (d: Dialogue) => Dialogue, mergeKey?: string) =>
        set((s) => {
          const next = fn(s.dialogue);
          if (next === s.dialogue) return {};
          const now = Date.now();
          const merge = mergeKey !== undefined && s.lastMerge?.key === mergeKey && now - s.lastMerge.at < MERGE_MS;
          return { ...fromTimeline(record(timeline(s), next, merge)), lastMerge: mergeKey ? { key: mergeKey, at: now } : null };
        });
      const editNode = (id: string, fn: (n: DialogueNode) => DialogueNode, mergeKey?: string) =>
        edit((d) => (d.nodes[id] ? { ...d, nodes: { ...d.nodes, [id]: fn(d.nodes[id]) } } : d), mergeKey);
      /** Moves through history, dropping selected nodes that no longer exist. */
      const travel = (step: (t: Timeline<Dialogue>) => Timeline<Dialogue>) =>
        set((s) => {
          const t = step(timeline(s));
          return { ...fromTimeline(t), selectedIds: s.selectedIds.filter((id) => t.present.nodes[id]), lastMerge: null };
        });
      /** Adds pasted or duplicated nodes as one undo step and selects them. */
      const addCopies = (copies: DialogueNode[]) => {
        if (copies.length === 0) return;
        edit((d) => ({ ...d, nodes: { ...d.nodes, ...Object.fromEntries(copies.map((n) => [n.id, n])) } }));
        set({ selectedIds: copies.map((n) => n.id) });
      };
      const replaceAll = (dialogue: Dialogue) =>
        set((s) => ({ ...fromTimeline(record(timeline(s), dialogue)), selectedIds: [], playtest: null, lastMerge: null }));

      return {
        dialogue: sampleDialogue(),
        past: [],
        future: [],
        lastMerge: null,
        selectedIds: [],
        playtest: null,

        load: replaceAll,
        reset: () => replaceAll(emptyDialogue()),
        undo: () => travel(undo),
        redo: () => travel(redo),
        setTitle: (title) => edit((d) => ({ ...d, title }), 'title'),

        addNode: (kind, position) => {
          const node = createNode(kind, position);
          edit((d) => ({
            ...d,
            // The first node of an empty dialogue becomes the start node.
            start: d.start ?? node.id,
            nodes: { ...d.nodes, [node.id]: node },
          }));
          set({ selectedIds: [node.id] });
        },
        updateNode: (id, patch) =>
          editNode(id, (n) => ({ ...n, ...patch }) as DialogueNode, `node:${id}:${Object.keys(patch).sort().join(',')}`),
        replaceNode: (node, mergeKey) => editNode(node.id, () => node, mergeKey && `node:${node.id}:${mergeKey}`),
        moveNodes: (moves) => {
          if (moves.length === 0) return;
          const key = `move:${moves.map((m) => m.id).sort().join('+')}`;
          edit((d) => {
            const nodes = { ...d.nodes };
            let changed = false;
            for (const { id, position } of moves) {
              if (!nodes[id]) continue;
              nodes[id] = { ...nodes[id], position };
              changed = true;
            }
            return changed ? { ...d, nodes } : d;
          }, key);
        },
        deleteNodes: (ids, links = []) => {
          edit((d) => {
            const nodes = { ...d.nodes };
            for (const { source, handle } of links) if (nodes[source]) nodes[source] = withLink(nodes[source], handle, null);
            for (const id of ids) delete nodes[id];
            for (const [key, node] of Object.entries(nodes)) {
              nodes[key] = ids.reduce(withoutLinksTo, node);
            }
            const start = d.start && ids.includes(d.start) ? null : d.start;
            return { ...d, nodes, start };
          });
          set((s) => ({ selectedIds: s.selectedIds.filter((id) => !ids.includes(id)) }));
        },
        connect: (source, handle, target) => editNode(source, (n) => withLink(n, handle, target)),
        disconnect: (source, handle) => editNode(source, (n) => withLink(n, handle, null)),
        setStart: (id) => edit((d) => ({ ...d, start: id })),
        select: (id) => set({ selectedIds: id ? [id] : [] }),
        setSelection: (selectedIds) => set({ selectedIds }),

        clipboard: null,
        copySelection: () =>
          set((s) => {
            const nodes = s.selectedIds.map((id) => s.dialogue.nodes[id]).filter(Boolean);
            return nodes.length ? { clipboard: { nodes, pastes: 0 } } : {};
          }),
        paste: () => {
          const { clipboard } = get();
          if (!clipboard) return;
          const step = 40 * (clipboard.pastes + 1);
          const copies = cloneNodes(clipboard.nodes, { x: step, y: step });
          addCopies(copies);
          set({ clipboard: { ...clipboard, pastes: clipboard.pastes + 1 } });
        },
        duplicateSelection: () => {
          const { selectedIds, dialogue } = get();
          const nodes = selectedIds.map((id) => dialogue.nodes[id]).filter(Boolean);
          if (nodes.length) addCopies(cloneNodes(nodes, { x: 40, y: 40 }));
        },

        addVariable: () =>
          edit((d) => {
            let n = d.variables.length + 1;
            while (d.variables.some((v) => v.name === `var${n}`)) n++;
            return { ...d, variables: [...d.variables, { name: `var${n}`, type: 'bool', initial: false }] };
          }),
        updateVariable: (index, patch) =>
          edit(
            (d) => ({
              ...d,
              variables: d.variables.map((v, i) => {
                if (i !== index) return v;
                const next = { ...v, ...patch };
                // Changing the type resets the initial value so it stays well-typed.
                if (patch.type && patch.type !== v.type) next.initial = defaultValue(patch.type);
                return next;
              }),
            }),
            `var:${index}:${Object.keys(patch).sort().join(',')}`,
          ),
        removeVariable: (index) => edit((d) => ({ ...d, variables: d.variables.filter((_, i) => i !== index) })),

        setPlaytest: (playtest) => set({ playtest }),
      };
    },
    {
      name: 'parley.autosave',
      partialize: (s) => ({ dialogue: s.dialogue }),
    },
  ),
);
