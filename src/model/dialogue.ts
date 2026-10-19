import type { Dialogue, DialogueNode, NodeKind, Position, Value, VarType } from './types';

export function newId(prefix = 'n'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyDialogue(title = 'Untitled dialogue'): Dialogue {
  return { format: 'parley', version: 1, title, start: null, variables: [], nodes: {} };
}

export function createNode(kind: NodeKind, position: Position): DialogueNode {
  const id = newId();
  switch (kind) {
    case 'line':
      return { id, kind, position, speaker: '', text: '', next: null };
    case 'choice':
      return {
        id, kind, position, prompt: '',
        options: [{ id: newId('o'), text: '', condition: '', next: null }],
      };
    case 'condition':
      return { id, kind, position, expression: '', whenTrue: null, whenFalse: null };
    case 'set':
      return { id, kind, position, variable: '', expression: '', next: null };
    case 'end':
      return { id, kind, position, tag: '' };
  }
}

export function defaultValue(type: VarType): Value {
  return type === 'bool' ? false : type === 'number' ? 0 : '';
}

/** Throws if `data` doesn't look like a Parley file. Keeps imports honest without a schema library. */
export function assertDialogue(data: unknown): asserts data is Dialogue {
  const d = data as Partial<Dialogue> | null;
  if (!d || typeof d !== 'object' || d.format !== 'parley') throw new Error('Not a Parley dialogue file');
  if (d.version !== 1) throw new Error(`Unsupported Parley file version: ${String(d.version)}`);
  if (typeof d.nodes !== 'object' || !d.nodes || !Array.isArray(d.variables)) {
    throw new Error('Dialogue file is missing nodes or variables');
  }
}

/** The game-facing export: same graph, without editor-only data such as node positions. */
export function toRuntime(d: Dialogue) {
  return {
    format: 'parley-runtime',
    version: 1,
    title: d.title,
    start: d.start,
    variables: d.variables,
    nodes: Object.fromEntries(
      Object.values(d.nodes).map(({ position: _position, ...rest }) => [rest.id, rest]),
    ),
  };
}

/** A small made-up conversation shown on first launch. */
export function sampleDialogue(): Dialogue {
  return {
    format: 'parley',
    version: 1,
    title: 'Merchant at the gate',
    start: 'greet',
    variables: [
      { name: 'gold', type: 'number', initial: 15 },
      { name: 'has_map', type: 'bool', initial: false },
    ],
    nodes: {
      greet: {
        id: 'greet', kind: 'line', position: { x: 0, y: 0 },
        speaker: 'Merchant', text: 'Travelers! You look like you have {gold} gold burning a hole in your pocket.', next: 'offer',
      },
      offer: {
        id: 'offer', kind: 'choice', position: { x: 340, y: 0 }, prompt: '',
        options: [
          { id: 'buy', text: 'I will take the map. (10 gold)', condition: 'gold >= 10 && !has_map', next: 'pay' },
          { id: 'ask', text: 'What is past the gate?', condition: '', next: 'lore' },
          { id: 'bye', text: 'Not today.', condition: '', next: 'farewell' },
        ],
      },
      pay: {
        id: 'pay', kind: 'set', position: { x: 700, y: -160 }, variable: 'gold', expression: 'gold - 10', next: 'give',
      },
      give: {
        id: 'give', kind: 'set', position: { x: 980, y: -160 }, variable: 'has_map', expression: 'true', next: 'thanks',
      },
      thanks: {
        id: 'thanks', kind: 'line', position: { x: 1260, y: -160 },
        speaker: 'Merchant', text: 'Pleasure doing business. You have {gold} gold left.', next: 'offer',
      },
      lore: {
        id: 'lore', kind: 'line', position: { x: 700, y: 40 },
        speaker: 'Merchant', text: 'The old road. Easy to get lost without a map.', next: 'offer',
      },
      farewell: {
        id: 'farewell', kind: 'condition', position: { x: 700, y: 220 }, expression: 'has_map', whenTrue: 'end_map', whenFalse: 'end_plain',
      },
      end_map: { id: 'end_map', kind: 'end', position: { x: 980, y: 160 }, tag: 'left_with_map' },
      end_plain: { id: 'end_plain', kind: 'end', position: { x: 980, y: 300 }, tag: 'left' },
    },
  };
}
