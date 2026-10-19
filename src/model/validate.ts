import { ExprError, IDENTIFIER, parse, variablesIn } from './expr';
import { linksOf } from './links';
import type { Dialogue } from './types';

export interface Problem {
  severity: 'error' | 'warning';
  nodeId?: string;
  message: string;
}

export function validate(d: Dialogue): Problem[] {
  const problems: Problem[] = [];
  const error = (message: string, nodeId?: string) => problems.push({ severity: 'error', nodeId, message });
  const warn = (message: string, nodeId?: string) => problems.push({ severity: 'warning', nodeId, message });

  const varNames = new Set<string>();
  for (const v of d.variables) {
    if (!IDENTIFIER.test(v.name)) error(`Variable name '${v.name}' is not valid (letters, digits, _ and .)`);
    else if (varNames.has(v.name)) error(`Variable '${v.name}' is defined twice`);
    varNames.add(v.name);
  }

  const checkExpr = (src: string, nodeId: string, what: string, required: boolean) => {
    if (!src.trim()) {
      if (required) error(`${what} is empty`, nodeId);
      return;
    }
    try {
      for (const name of variablesIn(parse(src))) {
        if (!varNames.has(name)) error(`${what} uses unknown variable '${name}'`, nodeId);
      }
    } catch (e) {
      if (!(e instanceof ExprError)) throw e;
      error(`${what}: ${e.message}`, nodeId);
    }
  };

  if (d.start === null) error('No start node set');
  else if (!d.nodes[d.start]) error(`Start node '${d.start}' does not exist`);

  for (const node of Object.values(d.nodes)) {
    for (const link of linksOf(node)) {
      if (link.target !== null && !d.nodes[link.target]) {
        error(`Links to missing node '${link.target}'`, node.id);
      }
    }

    switch (node.kind) {
      case 'line':
        if (!node.text.trim()) warn('Line has no text', node.id);
        if (node.next === null) warn('Line leads nowhere; the dialogue ends here without an End node', node.id);
        break;
      case 'choice':
        if (node.options.length === 0) error('Choice has no options', node.id);
        node.options.forEach((o, i) => {
          if (!o.text.trim()) warn(`Option ${i + 1} has no text`, node.id);
          if (o.next === null) warn(`Option ${i + 1} leads nowhere`, node.id);
          checkExpr(o.condition, node.id, `Option ${i + 1} condition`, false);
        });
        break;
      case 'condition':
        checkExpr(node.expression, node.id, 'Condition', true);
        if (node.whenTrue === null || node.whenFalse === null) warn('Condition has an unconnected branch', node.id);
        break;
      case 'set':
        if (!node.variable) error('Set node has no variable', node.id);
        else if (!varNames.has(node.variable)) error(`Sets unknown variable '${node.variable}'`, node.id);
        checkExpr(node.expression, node.id, 'Value', true);
        break;
      case 'end':
        break;
    }
  }

  if (d.start && d.nodes[d.start]) {
    const reachable = new Set<string>();
    const stack = [d.start];
    while (stack.length) {
      const id = stack.pop()!;
      if (reachable.has(id) || !d.nodes[id]) continue;
      reachable.add(id);
      for (const l of linksOf(d.nodes[id])) if (l.target) stack.push(l.target);
    }
    for (const id of Object.keys(d.nodes)) {
      if (!reachable.has(id)) warn('Not reachable from the start node', id);
    }
  }

  return problems;
}
