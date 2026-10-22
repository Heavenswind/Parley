import { describe, expect, it } from 'vitest';
import { assertDialogue, createNode, emptyDialogue, sampleDialogue, toRuntime } from './dialogue';
import { linksOf, withLink, withoutLinksTo } from './links';
import { advance, start, startAt } from './runner';
import type { Dialogue } from './types';
import { validate } from './validate';

describe('links', () => {
  it('reads and writes every handle kind', () => {
    const choice = createNode('choice', { x: 0, y: 0 });
    if (choice.kind !== 'choice') throw new Error();
    const handle = `opt:${choice.options[0].id}`;
    const linked = withLink(choice, handle, 'target');
    expect(linksOf(linked)).toEqual([{ handle, target: 'target' }]);
    expect(linksOf(withoutLinksTo(linked, 'target'))).toEqual([{ handle, target: null }]);

    const cond = withLink(createNode('condition', { x: 0, y: 0 }), 'false', 'b');
    expect(linksOf(cond)).toEqual([{ handle: 'true', target: null }, { handle: 'false', target: 'b' }]);
  });
});

describe('runner', () => {
  it('plays the sample dialogue', () => {
    const d = sampleDialogue();
    let { state, step } = start(d);
    expect(step).toMatchObject({ kind: 'line', text: expect.stringContaining('15 gold') });

    ({ state, step } = advance(d, state));
    expect(step.kind).toBe('choice');
    if (step.kind !== 'choice') return;
    expect(step.options.map((o) => o.id)).toEqual(['buy', 'ask', 'bye']);

    // Buying runs two set nodes automatically and lands on the thank-you line.
    ({ state, step } = advance(d, state, 'buy'));
    expect(step).toMatchObject({ kind: 'line', nodeId: 'thanks', text: expect.stringContaining('5 gold left') });
    expect(state.vars).toEqual({ gold: 5, has_map: true });

    // The buy option is now hidden by its condition.
    ({ state, step } = advance(d, state));
    expect(step.kind === 'choice' && step.options.map((o) => o.id)).toEqual(['ask', 'bye']);

    ({ state, step } = advance(d, state, 'bye'));
    expect(step).toEqual({ kind: 'end', nodeId: 'end_map', tag: 'left_with_map', error: undefined });
  });

  it('starts a run from any node with fresh variables', () => {
    const d = sampleDialogue();
    const fromChoice = startAt(d, 'offer');
    expect(fromChoice.step.kind).toBe('choice');
    expect(fromChoice.state.vars).toEqual({ gold: 15, has_map: false });
    // Starting on an automatic node settles through it: pay and give run, then the thank-you line.
    const fromSet = startAt(d, 'pay');
    expect(fromSet.step).toMatchObject({ kind: 'line', nodeId: 'thanks', text: expect.stringContaining('5 gold left') });
    expect(fromSet.state.vars).toEqual({ gold: 5, has_map: true });
  });

  it('ends with an error instead of throwing on broken graphs', () => {
    const d: Dialogue = { ...emptyDialogue(), start: 'nope' };
    expect(start(d).step).toMatchObject({ kind: 'end', error: "Missing node 'nope'" });
  });

  it('stops on condition loops', () => {
    const d = emptyDialogue();
    d.nodes.loop = { id: 'loop', kind: 'condition', position: { x: 0, y: 0 }, expression: 'true', whenTrue: 'loop', whenFalse: null };
    d.start = 'loop';
    expect(start(d).step).toMatchObject({ kind: 'end', error: expect.stringContaining('loop') });
  });
});

describe('validate', () => {
  it('accepts the sample dialogue', () => {
    expect(validate(sampleDialogue())).toEqual([]);
  });

  it('finds common mistakes', () => {
    const d = sampleDialogue();
    d.variables.push({ name: 'gold', type: 'number', initial: 0 });
    d.nodes.farewell = { ...d.nodes.farewell, expression: 'has_mapp ||' } as Dialogue['nodes'][string];
    d.nodes.pay = { ...d.nodes.pay, variable: 'silver' } as Dialogue['nodes'][string];
    const orphan = createNode('end', { x: 0, y: 0 });
    d.nodes[orphan.id] = orphan;
    d.nodes.lore = { ...d.nodes.lore, next: 'ghost' } as Dialogue['nodes'][string];

    const messages = validate(d).map((p) => `${p.nodeId ?? '-'}: ${p.message}`);
    expect(messages).toEqual(expect.arrayContaining([
      "-: Variable 'gold' is defined twice",
      'farewell: Condition: Unexpected end of expression',
      "pay: Sets unknown variable 'silver'",
      "lore: Links to missing node 'ghost'",
      `${orphan.id}: Not reachable from the start node`,
    ]));
  });

  it('requires a start node', () => {
    expect(validate(emptyDialogue())).toEqual([{ severity: 'error', nodeId: undefined, message: 'No start node set' }]);
  });
});

describe('files', () => {
  it('rejects files that are not dialogues', () => {
    expect(() => assertDialogue({ hello: 1 })).toThrow('Not a Parley');
    expect(() => assertDialogue({ ...sampleDialogue(), version: 2 })).toThrow('version');
    expect(() => assertDialogue(JSON.parse(JSON.stringify(sampleDialogue())))).not.toThrow();
  });

  it('strips editor data from the runtime export', () => {
    const out = toRuntime(sampleDialogue());
    expect(out.format).toBe('parley-runtime');
    expect(Object.values(out.nodes).some((n) => 'position' in n)).toBe(false);
  });
});
