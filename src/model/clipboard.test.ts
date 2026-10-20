import { describe, expect, it } from 'vitest';
import { cloneNodes } from './clipboard';
import { sampleDialogue } from './dialogue';
import { linksOf } from './links';
import type { ChoiceNode, LineNode } from './types';

const sample = sampleDialogue();
const byKind = <K extends 'line' | 'choice'>(kind: K) =>
  Object.values(sample.nodes).filter((n) => n.kind === kind) as (K extends 'line' ? LineNode : ChoiceNode)[];

describe('cloneNodes', () => {
  it('gives copies fresh ids and moves them by the offset', () => {
    const line = byKind('line')[0];
    const [copy] = cloneNodes([line], { x: 40, y: 30 });
    expect(copy.id).not.toBe(line.id);
    expect(copy.position).toEqual({ x: line.position.x + 40, y: line.position.y + 30 });
    expect(copy).toMatchObject({ kind: 'line', speaker: line.speaker, text: line.text });
  });

  it('clears links that leave the copied set', () => {
    const line = byKind('line').find((n) => n.next)!;
    const [copy] = cloneNodes([line], { x: 0, y: 0 });
    expect((copy as LineNode).next).toBeNull();
  });

  it('keeps links inside the copied set, pointing at the copies', () => {
    const line = byKind('line').find((n) => n.next && sample.nodes[n.next].kind === 'choice')!;
    const choice = sample.nodes[line.next!] as ChoiceNode;
    const [lineCopy, choiceCopy] = cloneNodes([line, choice], { x: 0, y: 0 });
    expect((lineCopy as LineNode).next).toBe(choiceCopy.id);
    // The choice's options lead to nodes that weren't copied.
    expect(linksOf(choiceCopy).every((l) => l.target === null)).toBe(true);
  });

  it('gives choice options fresh ids and leaves the originals alone', () => {
    const choice = byKind('choice')[0];
    const before = JSON.stringify(choice);
    const [copy] = cloneNodes([choice], { x: 0, y: 0 }) as ChoiceNode[];
    expect(copy.options.map((o) => o.text)).toEqual(choice.options.map((o) => o.text));
    for (const o of copy.options) expect(choice.options.some((c) => c.id === o.id)).toBe(false);
    expect(JSON.stringify(choice)).toBe(before);
  });
});
