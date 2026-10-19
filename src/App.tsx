import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useMemo } from 'react';
import { Canvas } from './components/Canvas';
import { Inspector } from './components/Inspector';
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
        <Toolbar />
        <main className="workspace">
          <div className="canvas">
            <Canvas problems={problems} />
          </div>
          <aside className="sidebar">
            <Inspector />
            <Variables />
            <Problems problems={problems} />
          </aside>
        </main>
      </div>
    </ReactFlowProvider>
  );
}
