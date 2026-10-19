import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createNode, defaultValue, emptyDialogue, sampleDialogue } from './model/dialogue';
import { withLink, withoutLinksTo } from './model/links';
import type { RunState, Step } from './model/runner';
import type { Dialogue, DialogueNode, NodeKind, Position, Variable } from './model/types';

export interface Playtest {
  state: RunState;
  step: Step;
  /** Every step shown so far, for the transcript. */
  history: Step[];
}

interface EditorState {
  dialogue: Dialogue;
  selectedId: string | null;
  playtest: Playtest | null;

  load: (d: Dialogue) => void;
  reset: () => void;
  setTitle: (title: string) => void;

  addNode: (kind: NodeKind, position: Position) => void;
  updateNode: (id: string, patch: Partial<DialogueNode>) => void;
  replaceNode: (node: DialogueNode) => void;
  moveNode: (id: string, position: Position) => void;
  deleteNodes: (ids: string[]) => void;
  connect: (source: string, handle: string, target: string) => void;
  disconnect: (source: string, handle: string) => void;
  setStart: (id: string) => void;
  select: (id: string | null) => void;

  addVariable: () => void;
  updateVariable: (index: number, patch: Partial<Variable>) => void;
  removeVariable: (index: number) => void;

  setPlaytest: (p: Playtest | null) => void;
}

export const useEditor = create<EditorState>()(
  persist(
    (set) => {
      const edit = (fn: (d: Dialogue) => Dialogue) => set((s) => ({ dialogue: fn(s.dialogue) }));
      const editNode = (id: string, fn: (n: DialogueNode) => DialogueNode) =>
        edit((d) => (d.nodes[id] ? { ...d, nodes: { ...d.nodes, [id]: fn(d.nodes[id]) } } : d));

      return {
        dialogue: sampleDialogue(),
        selectedId: null,
        playtest: null,

        load: (dialogue) => set({ dialogue, selectedId: null, playtest: null }),
        reset: () => set({ dialogue: emptyDialogue(), selectedId: null, playtest: null }),
        setTitle: (title) => edit((d) => ({ ...d, title })),

        addNode: (kind, position) => {
          const node = createNode(kind, position);
          set((s) => ({
            dialogue: {
              ...s.dialogue,
              // The first node of an empty dialogue becomes the start node.
              start: s.dialogue.start ?? node.id,
              nodes: { ...s.dialogue.nodes, [node.id]: node },
            },
            selectedId: node.id,
          }));
        },
        updateNode: (id, patch) => editNode(id, (n) => ({ ...n, ...patch }) as DialogueNode),
        replaceNode: (node) => editNode(node.id, () => node),
        moveNode: (id, position) => editNode(id, (n) => ({ ...n, position })),
        deleteNodes: (ids) =>
          set((s) => {
            const nodes = { ...s.dialogue.nodes };
            for (const id of ids) delete nodes[id];
            for (const [key, node] of Object.entries(nodes)) {
              nodes[key] = ids.reduce(withoutLinksTo, node);
            }
            const start = s.dialogue.start && ids.includes(s.dialogue.start) ? null : s.dialogue.start;
            const selectedId = s.selectedId && ids.includes(s.selectedId) ? null : s.selectedId;
            return { dialogue: { ...s.dialogue, nodes, start }, selectedId };
          }),
        connect: (source, handle, target) => editNode(source, (n) => withLink(n, handle, target)),
        disconnect: (source, handle) => editNode(source, (n) => withLink(n, handle, null)),
        setStart: (id) => edit((d) => ({ ...d, start: id })),
        select: (selectedId) => set({ selectedId }),

        addVariable: () =>
          edit((d) => {
            let n = d.variables.length + 1;
            while (d.variables.some((v) => v.name === `var${n}`)) n++;
            return { ...d, variables: [...d.variables, { name: `var${n}`, type: 'bool', initial: false }] };
          }),
        updateVariable: (index, patch) =>
          edit((d) => ({
            ...d,
            variables: d.variables.map((v, i) => {
              if (i !== index) return v;
              const next = { ...v, ...patch };
              // Changing the type resets the initial value so it stays well-typed.
              if (patch.type && patch.type !== v.type) next.initial = defaultValue(patch.type);
              return next;
            }),
          })),
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
