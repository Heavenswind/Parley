import { ExprError, parse } from '../model/expr';
import { newId } from '../model/dialogue';
import type { ChoiceNode, ChoiceOption, DialogueNode } from '../model/types';
import { useEditor } from '../store';

function exprError(src: string): string | null {
  if (!src.trim()) return null;
  try {
    parse(src);
    return null;
  } catch (e) {
    return e instanceof ExprError ? e.message : String(e);
  }
}

function ExprField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const err = exprError(value);
  return (
    <label className="field">
      <span>{label}</span>
      <input className={`mono${err ? ' invalid' : ''}`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      {err && <small className="error">{err}</small>}
    </label>
  );
}

export function Inspector() {
  const node = useEditor((s) => (s.selectedId ? s.dialogue.nodes[s.selectedId] : undefined));
  const isStart = useEditor((s) => s.dialogue.start === s.selectedId);
  const variables = useEditor((s) => s.dialogue.variables);
  const { updateNode, setStart, deleteNodes } = useEditor.getState();

  if (!node) {
    return (
      <section className="panel">
        <h2>Inspector</h2>
        <p className="muted">Select a node to edit it. Drag from a node's right edge to another node to link them.</p>
      </section>
    );
  }

  const update = (patch: Partial<DialogueNode>) => updateNode(node.id, patch);

  return (
    <section className="panel">
      <h2>
        {node.kind[0].toUpperCase() + node.kind.slice(1)} <code className="muted">{node.id}</code>
      </h2>

      {node.kind === 'line' && (
        <>
          <label className="field">
            <span>Speaker</span>
            <input value={node.speaker} onChange={(e) => update({ speaker: e.target.value })} />
          </label>
          <label className="field">
            <span>Text</span>
            <textarea rows={4} value={node.text} onChange={(e) => update({ text: e.target.value })} />
            <small className="muted">Use {'{variable}'} to insert a variable's value.</small>
          </label>
        </>
      )}

      {node.kind === 'choice' && <ChoiceEditor node={node} />}

      {node.kind === 'condition' && (
        <ExprField label="Expression" value={node.expression} placeholder="gold >= 10 && !has_map" onChange={(expression) => update({ expression })} />
      )}

      {node.kind === 'set' && (
        <>
          <label className="field">
            <span>Variable</span>
            <select value={node.variable} onChange={(e) => update({ variable: e.target.value })}>
              <option value="">Choose…</option>
              {variables.map((v) => <option key={v.name} value={v.name}>{v.name}</option>)}
            </select>
          </label>
          <ExprField label="Value" value={node.expression} placeholder="gold - 10" onChange={(expression) => update({ expression })} />
        </>
      )}

      {node.kind === 'end' && (
        <label className="field">
          <span>Tag</span>
          <input className="mono" value={node.tag} placeholder="quest_accepted" onChange={(e) => update({ tag: e.target.value })} />
          <small className="muted">Sent to the game when the dialogue ends here.</small>
        </label>
      )}

      <div className="row">
        <button disabled={isStart} onClick={() => setStart(node.id)}>{isStart ? 'Start node' : 'Make start node'}</button>
        <button className="danger" onClick={() => deleteNodes([node.id])}>Delete</button>
      </div>
    </section>
  );
}

function ChoiceEditor({ node }: { node: ChoiceNode }) {
  const { replaceNode } = useEditor.getState();
  const setOptions = (options: ChoiceOption[], mergeKey?: string) => replaceNode({ ...node, options }, mergeKey);
  // Typing in an option's field merges into one undo step; adding, moving and removing are steps of their own.
  const patchOption = (i: number, patch: Partial<ChoiceOption>) =>
    setOptions(
      node.options.map((o, j) => (i === j ? { ...o, ...patch } : o)),
      `option:${node.options[i].id}:${Object.keys(patch).join(',')}`,
    );
  const moveOption = (i: number, by: number) => {
    const options = [...node.options];
    const [o] = options.splice(i, 1);
    options.splice(i + by, 0, o);
    setOptions(options);
  };

  return (
    <>
      <label className="field">
        <span>Prompt (optional)</span>
        <input value={node.prompt} onChange={(e) => replaceNode({ ...node, prompt: e.target.value }, 'prompt')} />
      </label>
      {node.options.map((o, i) => (
        <fieldset key={o.id} className="option-edit">
          <legend>Option {i + 1}</legend>
          <label className="field">
            <span>Text</span>
            <input value={o.text} onChange={(e) => patchOption(i, { text: e.target.value })} />
          </label>
          <ExprField label="Only show if" value={o.condition} placeholder="(always)" onChange={(condition) => patchOption(i, { condition })} />
          <div className="row">
            <button disabled={i === 0} onClick={() => moveOption(i, -1)} title="Move up">↑</button>
            <button disabled={i === node.options.length - 1} onClick={() => moveOption(i, 1)} title="Move down">↓</button>
            <button className="danger" onClick={() => setOptions(node.options.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </fieldset>
      ))}
      <button onClick={() => setOptions([...node.options, { id: newId('o'), text: '', condition: '', next: null }])}>
        Add option
      </button>
    </>
  );
}
