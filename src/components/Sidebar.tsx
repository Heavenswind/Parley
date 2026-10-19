import type { Problem } from '../model/validate';
import type { Value, VarType } from '../model/types';
import { useEditor } from '../store';

export function Variables() {
  const variables = useEditor((s) => s.dialogue.variables);
  const { addVariable, updateVariable, removeVariable } = useEditor.getState();

  const initialInput = (type: VarType, value: Value, onChange: (v: Value) => void) => {
    if (type === 'bool') return <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />;
    if (type === 'number') return <input type="number" value={Number(value)} onChange={(e) => onChange(Number(e.target.value))} />;
    return <input value={String(value)} onChange={(e) => onChange(e.target.value)} />;
  };

  return (
    <section className="panel">
      <h2>Variables</h2>
      {variables.length === 0 && <p className="muted">Variables drive conditions and can be shown in text with {'{name}'}.</p>}
      <table className="vars">
        <tbody>
          {variables.map((v, i) => (
            <tr key={i}>
              <td><input className="mono" value={v.name} aria-label="Name" onChange={(e) => updateVariable(i, { name: e.target.value })} /></td>
              <td>
                <select value={v.type} aria-label="Type" onChange={(e) => updateVariable(i, { type: e.target.value as VarType })}>
                  <option value="bool">bool</option>
                  <option value="number">number</option>
                  <option value="string">string</option>
                </select>
              </td>
              <td>{initialInput(v.type, v.initial, (initial) => updateVariable(i, { initial }))}</td>
              <td><button className="icon danger" title="Remove variable" onClick={() => removeVariable(i)}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addVariable}>Add variable</button>
    </section>
  );
}

export function Problems({ problems }: { problems: Problem[] }) {
  const select = useEditor((s) => s.select);
  return (
    <section className="panel">
      <h2>Problems {problems.length > 0 && <span className="badge badge-problem">{problems.length}</span>}</h2>
      {problems.length === 0 ? (
        <p className="muted">No problems found.</p>
      ) : (
        <ul className="problems">
          {problems.map((p, i) => (
            <li key={i} className={p.severity}>
              {p.nodeId ? <button className="link" onClick={() => select(p.nodeId!)}>{p.nodeId}</button> : null} {p.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
