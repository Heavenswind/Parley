// Copy, paste and duplicate: fresh ids for the copies, and links kept only where both ends were copied.

import { newId } from './dialogue';
import { linksOf, withLink } from './links';
import type { DialogueNode, Position } from './types';

/**
 * Copies of `nodes`, shifted by `offset`, with fresh node and option ids. A link between two copied
 * nodes points at the copy; a link to anything else is cleared, so pasting never wires the new
 * nodes into the existing conversation by surprise.
 */
export function cloneNodes(nodes: DialogueNode[], offset: Position): DialogueNode[] {
  const ids = new Map(nodes.map((n) => [n.id, newId()]));
  return nodes.map((node) => {
    // Choice handles are named after option ids, so options get fresh ids too.
    let copy: DialogueNode =
      node.kind === 'choice' ? { ...node, options: node.options.map((o) => ({ ...o, id: newId('o') })) } : { ...node };
    copy = { ...copy, id: ids.get(node.id)!, position: { x: node.position.x + offset.x, y: node.position.y + offset.y } };
    for (const l of linksOf(copy)) copy = withLink(copy, l.handle, l.target ? (ids.get(l.target) ?? null) : null);
    return copy;
  });
}
