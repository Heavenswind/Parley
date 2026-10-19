# Parley

A node-graph editor for writing branching game dialogue. You lay out a conversation as connected nodes, test it right away in a built-in playtest panel, and export it as JSON your game can load.

I'm building it to write NPC conversations for my own games. It's the dialogue companion to [Forge](https://github.com/Heavenswind/Forge), my game design document tool.

## Features

- **Five node types:** Line (a character speaks), Choice (the player picks an option), Condition (branch on an expression), Set (change a variable) and End (finish with a tag the game can react to).
- **Variables** (bool, number, string) with a small, safe expression language for conditions and assignments: `gold >= 10 && !has_map`, `gold - 10`.
- **Text interpolation:** `You have {gold} gold.`
- **Conditional choice options:** an option only appears when its condition is true.
- **Playtest panel:** plays the dialogue the way the game would, highlights the current node on the canvas and shows live variable values.
- **Problems panel:** live validation for missing start nodes, broken links, unknown variables, expression errors, dead ends and unreachable nodes.
- **Files:** autosaves in the browser; save and open `.parley.json` files; *Export for game* writes a runtime JSON file without editor-only data.

## Built with

React 18, TypeScript, [React Flow](https://reactflow.dev) for the graph, Zustand for state, Vite and Vitest.

## Running it

Requires Node.js 20 or newer.

```sh
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the expression language, runner and validator
npm run build      # production build in dist/
```

## Using it

1. Click **Sample** twice to load the example conversation, or **New** twice to start from scratch.
2. Add nodes from the toolbar. Drag from a node's right-hand dot to another node to link them, and select a link and press Delete to remove it.
3. Select a node to edit it in the Inspector. The first node you add becomes the start node; use **Make start node** to change it.
4. Click **Playtest** to play the conversation from the start.
5. **Save** keeps the editable file. **Export for game** writes the runtime file and is enabled once there are no errors.

## File format

Both files are JSON. A dialogue has a `start` node id, a list of `variables`, and `nodes` keyed by id. Links live on the nodes themselves (`next`, `whenTrue` / `whenFalse`, and each option's `next`). The runtime export (`"format": "parley-runtime"`) is the same graph without node positions. See [`src/model/types.ts`](src/model/types.ts) for the full shape and [`src/model/runner.ts`](src/model/runner.ts) for how a game should walk it.

## Status

Early but usable. Planned work is in [ROADMAP.md](ROADMAP.md).

## License

[MIT](LICENSE)
