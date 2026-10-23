import { advance, setVar, start, startAt, type Step } from '../model/runner';
import type { Value } from '../model/types';
import { useEditor } from '../store';

export function startPlaytest(fromId?: string) {
  const { dialogue, setPlaytest } = useEditor.getState();
  const { state, step } = fromId ? startAt(dialogue, fromId) : start(dialogue);
  setPlaytest({ state, step, history: [step], from: fromId });
}

function StepView({ step }: { step: Step }) {
  if (step.kind === 'line') {
    return <p className="say"><strong>{step.speaker || '…'}:</strong> {step.text}</p>;
  }
  if (step.kind === 'choice') {
    return step.prompt ? <p className="say">{step.prompt}</p> : null;
  }
  return null;
}

export function PlaytestPanel() {
  const dialogue = useEditor((s) => s.dialogue);
  const playtest = useEditor((s) => s.playtest);
  const setPlaytest = useEditor((s) => s.setPlaytest);
  if (!playtest) return null;

  const { state, step, history } = playtest;
  const go = (optionId?: string) => {
    const chosen = step.kind === 'choice' ? step.options.find((o) => o.id === optionId) : undefined;
    const next = advance(dialogue, state, optionId);
    // Record the player's pick in the transcript as a pseudo-line.
    const picked: Step[] = chosen ? [{ kind: 'line', nodeId: step.nodeId!, speaker: '▶ You', text: chosen.text }] : [];
    setPlaytest({ ...next, history: [...history, ...picked, next.step], from: playtest.from });
  };
  // Editing a variable re-renders the current step, so its text and options react right away.
  const setVariable = (name: string, value: Value) => {
    const next = setVar(dialogue, state, name, value);
    setPlaytest({ ...next, history: [...history.slice(0, -1), next.step], from: playtest.from });
  };

  return (
    <section className="panel playtest">
      <h2>
        Playtest
        <span className="spacer" />
        <button onClick={() => startPlaytest(playtest.from)}>Restart</button>
        <button onClick={() => setPlaytest(null)}>Stop</button>
      </h2>
      {playtest.from && <p className="muted note">Started mid-dialogue, with variables at their initial values.</p>}

      <div className="transcript">
        {history.slice(0, -1).map((s, i) => <StepView key={i} step={s} />)}
        <div className="current">
          <StepView step={step} />
          {step.kind === 'line' && <button className="primary" onClick={() => go()}>Continue</button>}
          {step.kind === 'choice' && (
            <div className="choices">
              {step.options.map((o) => <button key={o.id} onClick={() => go(o.id)}>{o.text || '(empty option)'}</button>)}
            </div>
          )}
          {step.kind === 'end' && (
            <p className={step.error ? 'error' : 'muted'}>
              {step.error ?? `The end${step.tag ? ` (tag: ${step.tag})` : ''}.`}
            </p>
          )}
        </div>
      </div>

      <table className="vars-live" title="Edit a value to test a branch; the current step reacts right away">
        <tbody>
          {Object.entries(state.vars).map(([name, value]) => (
            <tr key={name}>
              <td><code>{name}</code></td>
              <td>
                {typeof value === 'boolean' ? (
                  <input type="checkbox" aria-label={`Value of ${name}`} checked={value} onChange={(e) => setVariable(name, e.target.checked)} />
                ) : typeof value === 'number' ? (
                  <input
                    type="number"
                    aria-label={`Value of ${name}`}
                    value={value}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (Number.isFinite(n)) setVariable(name, n);
                    }}
                  />
                ) : (
                  <input type="text" aria-label={`Value of ${name}`} value={value} onChange={(e) => setVariable(name, e.target.value)} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
