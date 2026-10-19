// Plays a dialogue the way a game would: condition and set nodes run
// automatically, and the player only ever sees lines, choices and the end.

import { evaluate, interpolate, parse, truthy } from './expr';
import type { Dialogue, Value } from './types';

export type Vars = Record<string, Value>;

export interface RunState {
  /** The node the player is looking at (a line, choice or end), or null when finished. */
  nodeId: string | null;
  vars: Vars;
}

export type Step =
  | { kind: 'line'; nodeId: string; speaker: string; text: string }
  | { kind: 'choice'; nodeId: string; prompt: string; options: { id: string; text: string }[] }
  | { kind: 'end'; nodeId: string | null; tag: string; error?: string };

// Guards against condition/set loops that never reach a line or choice.
const MAX_AUTO_STEPS = 1000;

export function initialVars(d: Dialogue): Vars {
  return Object.fromEntries(d.variables.map((v) => [v.name, v.initial]));
}

/** Starts a run and advances to the first thing the player sees. */
export function start(d: Dialogue): { state: RunState; step: Step } {
  return settle(d, { nodeId: d.start, vars: initialVars(d) });
}

/** Moves past the current line, or picks `optionId` on the current choice. */
export function advance(d: Dialogue, state: RunState, optionId?: string): { state: RunState; step: Step } {
  const node = state.nodeId ? d.nodes[state.nodeId] : undefined;
  if (node?.kind === 'line') return settle(d, { ...state, nodeId: node.next });
  if (node?.kind === 'choice') {
    const option = node.options.find((o) => o.id === optionId);
    if (!option) throw new Error(`Option '${optionId}' is not on choice '${node.id}'`);
    return settle(d, { ...state, nodeId: option.next });
  }
  return settle(d, state);
}

function settle(d: Dialogue, state: RunState): { state: RunState; step: Step } {
  let { nodeId, vars } = state;
  const end = (tag: string, error?: string) => ({ state: { nodeId, vars }, step: { kind: 'end' as const, nodeId, tag, error } });

  for (let i = 0; i < MAX_AUTO_STEPS; i++) {
    if (nodeId === null) return end('');
    const node = d.nodes[nodeId];
    if (!node) return end('', `Missing node '${nodeId}'`);

    try {
      switch (node.kind) {
        case 'line':
          return {
            state: { nodeId, vars },
            step: { kind: 'line', nodeId, speaker: node.speaker, text: interpolate(node.text, vars) },
          };
        case 'choice': {
          const options = node.options
            .filter((o) => !o.condition.trim() || truthy(evaluate(parse(o.condition), vars)))
            .map((o) => ({ id: o.id, text: interpolate(o.text, vars) }));
          if (options.length === 0) return end('', `No options available on choice '${nodeId}'`);
          return { state: { nodeId, vars }, step: { kind: 'choice', nodeId, prompt: interpolate(node.prompt, vars), options } };
        }
        case 'condition':
          nodeId = truthy(evaluate(parse(node.expression), vars)) ? node.whenTrue : node.whenFalse;
          break;
        case 'set':
          vars = { ...vars, [node.variable]: evaluate(parse(node.expression), vars) };
          nodeId = node.next;
          break;
        case 'end':
          return end(node.tag);
      }
    } catch (e) {
      return end('', `Error in node '${node.id}': ${(e as Error).message}`);
    }
  }
  return end('', 'Stopped: too many condition/set steps in a row (is there a loop?)');
}
