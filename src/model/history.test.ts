import { describe, expect, it } from 'vitest';
import { UNDO_LIMIT, record, redo, undo, type Timeline } from './history';

const start = (present: string): Timeline<string> => ({ past: [], present, future: [] });

describe('history', () => {
  it('undoes and redoes in order', () => {
    let t = record(record(start('a'), 'b'), 'c');
    t = undo(t);
    expect(t.present).toBe('b');
    t = undo(t);
    expect(t.present).toBe('a');
    expect(undo(t)).toBe(t);
    t = redo(redo(t));
    expect(t.present).toBe('c');
    expect(redo(t)).toBe(t);
  });

  it('drops the redo list on a new edit', () => {
    const t = record(undo(record(start('a'), 'b')), 'x');
    expect(t).toEqual({ past: ['a'], present: 'x', future: [] });
  });

  it('merges into the present without adding a step', () => {
    let t = record(start(''), 'H');
    t = record(t, 'Hi', true);
    t = record(t, 'Hi!', true);
    expect(t.past).toEqual(['']);
    expect(undo(t).present).toBe('');
  });

  it('ignores edits that change nothing', () => {
    const t = start('a');
    expect(record(t, 'a')).toBe(t);
  });

  it('keeps at most the undo limit', () => {
    let t = start('0');
    for (let i = 1; i <= UNDO_LIMIT + 10; i++) t = record(t, String(i));
    expect(t.past).toHaveLength(UNDO_LIMIT);
    expect(t.past[0]).toBe('10');
  });
});
