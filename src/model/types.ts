// A dialogue is a graph of nodes. Links between nodes are stored on the
// nodes themselves (`next`, `whenTrue`, option `next`, ...) so the file
// format has a single source of truth; the editor derives edges from them.

export type Value = boolean | number | string;
export type VarType = 'bool' | 'number' | 'string';

export interface Variable {
  name: string;
  type: VarType;
  initial: Value;
}

export interface Position {
  x: number;
  y: number;
}

interface BaseNode {
  id: string;
  position: Position;
}

/** A character says a line, then the dialogue moves on. */
export interface LineNode extends BaseNode {
  kind: 'line';
  speaker: string;
  text: string;
  next: string | null;
}

export interface ChoiceOption {
  id: string;
  text: string;
  /** Optional expression; the option is hidden when it evaluates to false. */
  condition: string;
  next: string | null;
}

/** The player picks one of several options. */
export interface ChoiceNode extends BaseNode {
  kind: 'choice';
  prompt: string;
  options: ChoiceOption[];
}

/** Branches on an expression without showing anything to the player. */
export interface ConditionNode extends BaseNode {
  kind: 'condition';
  expression: string;
  whenTrue: string | null;
  whenFalse: string | null;
}

/** Assigns the result of an expression to a variable. */
export interface SetNode extends BaseNode {
  kind: 'set';
  variable: string;
  expression: string;
  next: string | null;
}

/** Ends the conversation. `tag` lets the game react (e.g. "quest_accepted"). */
export interface EndNode extends BaseNode {
  kind: 'end';
  tag: string;
}

export type DialogueNode = LineNode | ChoiceNode | ConditionNode | SetNode | EndNode;
export type NodeKind = DialogueNode['kind'];

export interface Dialogue {
  format: 'parley';
  version: 1;
  title: string;
  start: string | null;
  variables: Variable[];
  nodes: Record<string, DialogueNode>;
}
