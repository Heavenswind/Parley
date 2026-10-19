import { describe, expect, it } from 'vitest';
import { ExprError, evaluate, interpolate, parse, variablesIn } from './expr';

const run = (src: string, vars = {}) => evaluate(parse(src), vars);

describe('expressions', () => {
  it('evaluates literals', () => {
    expect(run('42')).toBe(42);
    expect(run('1.5')).toBe(1.5);
    expect(run('"hi"')).toBe('hi');
    expect(run("'hi'")).toBe('hi');
    expect(run('true')).toBe(true);
  });

  it('respects precedence', () => {
    expect(run('1 + 2 > 2 && !false')).toBe(true);
    expect(run('true || false && false')).toBe(true);
    expect(run('(true || false) && false')).toBe(false);
    expect(run('10 - 2 - 3')).toBe(5);
    expect(run('-3 + 1')).toBe(-2);
  });

  it('reads variables, including dotted names', () => {
    const vars = { gold: 12, 'quest.started': true, name: 'Ari' };
    expect(run('gold >= 10 && quest.started', vars)).toBe(true);
    expect(run('name == "Ari"', vars)).toBe(true);
    expect(run('"Hi " + name', vars)).toBe('Hi Ari');
  });

  it('short-circuits', () => {
    expect(run('false && missing')).toBe(false);
    expect(run('true || missing')).toBe(true);
  });

  it('reports errors', () => {
    expect(() => parse('1 +')).toThrow(ExprError);
    expect(() => parse('(1')).toThrow("Expected ')'");
    expect(() => parse('a b')).toThrow('Unexpected input');
    expect(() => parse('"open')).toThrow('Unterminated');
    expect(() => parse('a # b')).toThrow("Unexpected character '#'");
    expect(() => run('missing')).toThrow("Unknown variable 'missing'");
    expect(() => run('"a" < 3')).toThrow('needs numbers');
  });

  it('lists variables', () => {
    expect(variablesIn(parse('a && (b > 2 || !a)')).sort()).toEqual(['a', 'b']);
  });

  it('interpolates text', () => {
    expect(interpolate('You have {gold} gold, {who}.', { gold: 3 })).toBe('You have 3 gold, {who}.');
  });
});
