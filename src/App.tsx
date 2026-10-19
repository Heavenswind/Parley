import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
import { PlaytestPanel } from './components/Playtest';
import { Problems, Variables } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { validate } from './model/validate';
import { useEditor } from './store';

export default function App() {
  const dialogue = useEditor((s) => s.dialogue);
  const problems = useMemo(() => validate(dialogue), [dialogue]);

  return (
    <ReactFlowProvider>
      <div className="app">
        <Toolbar errorCount={problems.filter((p) => p.severity === 'error').length} />
        <main className="workspace">
          <div className="canvas">
            <Canvas problems={problems} />
          </div>
          <aside className="sidebar">
            <PlaytestPanel />
            <Inspector />
            <Variables />
            <Problems problems={problems} />
          </aside>
        </main>
      </div>
    </ReactFlowProvider>
  );
}
