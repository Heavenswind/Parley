// Outgoing links of a node, addressed by handle name:
//   line / set   -> 'next'
//   condition    -> 'true' | 'false'
//   choice       -> 'opt:<optionId>'
//   end          -> (none)

import type { DialogueNode } from './types';

export interface Link {
  handle: string;
  target: string | null;
}

export function linksOf(node: DialogueNode): Link[] {
  switch (node.kind) {
    case 'line':
    case 'set':
      return [{ handle: 'next', target: node.next }];
    case 'condition':
      return [
        { handle: 'true', target: node.whenTrue },
        { handle: 'false', target: node.whenFalse },
      ];
    case 'choice':
      return node.options.map((o) => ({ handle: `opt:${o.id}`, target: o.next }));
    case 'end':
      return [];
  }
}

/** Returns a copy of `node` with the link on `handle` pointing at `target`. */
export function withLink(node: DialogueNode, handle: string, target: string | null): DialogueNode {
  switch (node.kind) {
    case 'line':
    case 'set':
      return handle === 'next' ? { ...node, next: target } : node;
    case 'condition':
      if (handle === 'true') return { ...node, whenTrue: target };
      if (handle === 'false') return { ...node, whenFalse: target };
      return node;
    case 'choice':
      return {
        ...node,
        options: node.options.map((o) => (`opt:${o.id}` === handle ? { ...o, next: target } : o)),
      };
    case 'end':
      return node;
  }
}

/** Returns a copy of `node` with every link to `target` cleared. */
export function withoutLinksTo(node: DialogueNode, target: string): DialogueNode {
  return linksOf(node).reduce((n, l) => (l.target === target ? withLink(n, l.handle, null) : n), node);
}
