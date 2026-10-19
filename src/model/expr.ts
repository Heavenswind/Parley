// A tiny expression language for conditions and assignments.
// Deliberately small and side-effect free so it can be re-implemented
// in a game engine (see ROADMAP.md: Unity loader).
//
//   expr    := or
//   or      := and ('||' and)*
//   and     := eq ('&&' eq)*
//   eq      := cmp (('==' | '!=') cmp)*
//   cmp     := add (('<' | '<=' | '>' | '>=') add)*
//   add     := unary (('+' | '-') unary)*
//   unary   := ('!' | '-') unary | primary
//   primary := number | string | 'true' | 'false' | identifier | '(' expr ')'

import type { Value } from './types';

export type Expr =
  | { type: 'literal'; value: Value }
  | { type: 'var'; name: string }
  | { type: 'unary'; op: '!' | '-'; arg: Expr }
  | { type: 'binary'; op: BinaryOp; left: Expr; right: Expr };

type BinaryOp = '||' | '&&' | '==' | '!=' | '<' | '<=' | '>' | '>=' | '+' | '-';

export class ExprError extends Error {
  constructor(message: string, readonly pos: number) {
    super(message);
  }
}

type Token =
  | { kind: 'num'; value: number; pos: number }
  | { kind: 'str'; value: string; pos: number }
  | { kind: 'ident'; value: string; pos: number }
  | { kind: 'op'; value: string; pos: number }
  | { kind: 'eof'; pos: number };

const OPERATORS = ['&&', '||', '==', '!=', '<=', '>=', '<', '>', '!', '+', '-', '(', ')'];
export const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_.]*$/;

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (/[0-9]/.test(ch)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i))!;
      tokens.push({ kind: 'num', value: Number(m[0]), pos: i });
      i += m[0].length;
    } else if (ch === '"' || ch === "'") {
      const end = src.indexOf(ch, i + 1);
      if (end < 0) throw new ExprError('Unterminated string', i);
      tokens.push({ kind: 'str', value: src.slice(i + 1, end), pos: i });
      i = end + 1;
    } else if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_.]*/.exec(src.slice(i))!;
      tokens.push({ kind: 'ident', value: m[0], pos: i });
      i += m[0].length;
    } else {
      const op = OPERATORS.find((o) => src.startsWith(o, i));
      if (!op) throw new ExprError(`Unexpected character '${ch}'`, i);
      tokens.push({ kind: 'op', value: op, pos: i });
      i += op.length;
    }
  }
  tokens.push({ kind: 'eof', pos: src.length });
  return tokens;
}

export function parse(src: string): Expr {
  const tokens = tokenize(src);
  let p = 0;
  const peek = () => tokens[p];
  const isOp = (...ops: string[]) => {
    const t = peek();
    return t.kind === 'op' && ops.includes(t.value);
  };

  const binaryLevel = (ops: BinaryOp[], next: () => Expr) => (): Expr => {
    let left = next();
    while (isOp(...ops)) {
      const op = (tokens[p++] as { value: string }).value as BinaryOp;
      left = { type: 'binary', op, left, right: next() };
    }
    return left;
  };

  const primary = (): Expr => {
    const t = tokens[p++];
    switch (t.kind) {
      case 'num':
      case 'str':
        return { type: 'literal', value: t.value };
      case 'ident':
        if (t.value === 'true' || t.value === 'false') return { type: 'literal', value: t.value === 'true' };
        return { type: 'var', name: t.value };
      case 'op':
        if (t.value === '(') {
          const inner = or();
          if (!isOp(')')) throw new ExprError("Expected ')'", peek().pos);
          p++;
          return inner;
        }
        throw new ExprError(`Unexpected '${t.value}'`, t.pos);
      case 'eof':
        throw new ExprError('Unexpected end of expression', t.pos);
    }
  };

  const unary = (): Expr => {
    if (isOp('!', '-')) {
      const op = (tokens[p++] as { value: string }).value as '!' | '-';
      return { type: 'unary', op, arg: unary() };
    }
    return primary();
  };

  const add = binaryLevel(['+', '-'], unary);
  const cmp = binaryLevel(['<', '<=', '>', '>='], add);
  const eq = binaryLevel(['==', '!='], cmp);
  const and = binaryLevel(['&&'], eq);
  const or = binaryLevel(['||'], and);

  const result = or();
  if (peek().kind !== 'eof') throw new ExprError('Unexpected input after expression', peek().pos);
  return result;
}

export function evaluate(expr: Expr, vars: Record<string, Value>): Value {
  switch (expr.type) {
    case 'literal':
      return expr.value;
    case 'var':
      if (!(expr.name in vars)) throw new ExprError(`Unknown variable '${expr.name}'`, 0);
      return vars[expr.name];
    case 'unary': {
      const v = evaluate(expr.arg, vars);
      return expr.op === '!' ? !truthy(v) : -asNumber(v, '-');
    }
    case 'binary': {
      // Short-circuit like most game scripting languages do.
      if (expr.op === '&&') return truthy(evaluate(expr.left, vars)) && truthy(evaluate(expr.right, vars));
      if (expr.op === '||') return truthy(evaluate(expr.left, vars)) || truthy(evaluate(expr.right, vars));
      const l = evaluate(expr.left, vars);
      const r = evaluate(expr.right, vars);
      switch (expr.op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return asNumber(l, '<') < asNumber(r, '<');
        case '<=': return asNumber(l, '<=') <= asNumber(r, '<=');
        case '>': return asNumber(l, '>') > asNumber(r, '>');
        case '>=': return asNumber(l, '>=') >= asNumber(r, '>=');
        case '+':
          if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r);
          return asNumber(l, '+') + asNumber(r, '+');
        case '-': return asNumber(l, '-') - asNumber(r, '-');
      }
    }
  }
}

export function truthy(v: Value): boolean {
  return v !== false && v !== 0 && v !== '';
}

function asNumber(v: Value, op: string): number {
  if (typeof v !== 'number') throw new ExprError(`'${op}' needs numbers, got ${JSON.stringify(v)}`, 0);
  return v;
}

/** Names of all variables an expression reads. */
export function variablesIn(expr: Expr): string[] {
  const out = new Set<string>();
  const walk = (e: Expr) => {
    if (e.type === 'var') out.add(e.name);
    else if (e.type === 'unary') walk(e.arg);
    else if (e.type === 'binary') { walk(e.left); walk(e.right); }
  };
  walk(expr);
  return [...out];
}

/** Replaces `{name}` in dialogue text with the variable's value. Unknown names are left as-is. */
export function interpolate(text: string, vars: Record<string, Value>): string {
  return text.replace(/\{([A-Za-z_][A-Za-z0-9_.]*)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}
